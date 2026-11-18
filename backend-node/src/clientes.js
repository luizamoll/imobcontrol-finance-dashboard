// Migracao incremental: somente clientes. Mantem o mesmo contrato do Java.
const CAMPOS = {
  nome: 'nome',
  cpf: 'cpf',
  email: 'email',
  telefone: 'telefone',
  cep: 'cep',
  logradouro: 'logradouro',
  numero: 'numero',
  complemento: 'complemento',
  bairro: 'bairro',
  cidade: 'cidade',
  uf: 'uf',
  estadoCivil: 'estado_civil',
  profissao: 'profissao'
};
const UFS = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));

function cpfValido(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let indice = 9; indice <= 10; indice += 1) {
    let soma = 0;
    for (let i = 0; i < indice; i += 1) soma += Number(cpf[i]) * (indice + 1 - i);
    let digito = (soma * 10) % 11;
    if (digito === 10) digito = 0;
    if (digito !== Number(cpf[indice])) return false;
  }
  return true;
}
export function normalizarCliente(dados, bad) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw bad(400, 'Dados invalidos');
  const limites = {
    nome: 160, cpf: 11, email: 200, telefone: 30, cep: 8,
    logradouro: 200, numero: 30, complemento: 120, bairro: 120,
    cidade: 120, uf: 2, estadoCivil: 40, profissao: 120
  };
  const valores = {};
  for (const [campo, coluna] of Object.entries(CAMPOS)) {
    const valor = dados[campo];
    if (valor != null && typeof valor !== 'string') throw bad(400, 'Campo invalido: ' + campo);
    let texto = valor?.trim() || null;
    if (campo === 'cpf' || campo === 'cep') texto = texto?.replace(/\D/g, '') || null;
    if (campo === 'uf') texto = texto?.toUpperCase() || null;
    if (texto != null && texto.length > limites[campo]) throw bad(400, 'Campo excede limite: ' + campo);
    valores[coluna] = texto;
  }
  if (!valores.nome) throw bad(400, 'Informe o nome do cliente');
  if (valores.cpf && !cpfValido(valores.cpf)) throw bad(400, 'CPF invalido');
  if (valores.cep && valores.cep.length !== 8) throw bad(400, 'CEP invalido');
  if (valores.uf && !UFS.has(valores.uf)) throw bad(400, 'UF invalida');
  if (valores.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valores.email)) throw bad(400, 'E-mail invalido');
  return valores;
}

export function registerClientesWrites(app, deps) {
  const { db, exigirLogin, empresaAutorizada, exigirPermissao, handler, bad, toCliente, colunas } = deps;

  app.post('/api/clientes', exigirLogin, handler(async (req, res) => {
    await exigirPermissao(req, ['CLIENTES_GERENCIAR', 'VENDAS_CRIAR']);
    const empresaId = await empresaAutorizada(req);
    const dados = normalizarCliente(req.body, bad);
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const chaves = Object.keys(dados);
      const [result] = await connection.execute(
        `INSERT INTO clientes (empresa_id, ${chaves.join(', ')}, versao, criado_por_usuario_id, atualizado_por_usuario_id, criado_em, atualizado_em)
         VALUES (?, ${chaves.map(() => '?').join(', ')}, 0, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [empresaId, ...Object.values(dados), req.usuario.id, req.usuario.id]
      );
      await connection.execute(
        "INSERT INTO auditoria_operacional (empresa_id, usuario_id, entidade, entidade_id, acao, criado_em) VALUES (?, ?, 'CLIENTE', ?, 'CRIACAO', UTC_TIMESTAMP())",
        [empresaId, req.usuario.id, result.insertId]
      );
      const [rows] = await connection.execute(`SELECT ${colunas} FROM clientes WHERE id = ? AND empresa_id = ?`, [result.insertId, empresaId]);
      await connection.commit();
      res.status(201).json(toCliente(rows[0]));
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  }));

  app.put('/api/clientes/:id', exigirLogin, handler(async (req, res) => {
    await exigirPermissao(req, ['CLIENTES_GERENCIAR']);
    const empresaId = await empresaAutorizada(req);
    const id = Number(req.params.id);
    const versao = req.body?.versao;
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(versao) || versao < 0) {
      throw bad(400, 'Informe o ID e a versao atual do cadastro');
    }
    const dados = normalizarCliente(req.body, bad);
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const chaves = Object.keys(dados);
      const [updated] = await connection.execute(
        `UPDATE clientes SET ${chaves.map(c => c + ' = ?').join(', ')},
         versao = versao + 1, atualizado_por_usuario_id = ?, atualizado_em = UTC_TIMESTAMP()
         WHERE id = ? AND empresa_id = ? AND versao = ?`,
        [...Object.values(dados), req.usuario.id, id, empresaId, versao]
      );
      if (updated.affectedRows === 0) {
        const [exists] = await connection.execute('SELECT versao FROM clientes WHERE id = ? AND empresa_id = ?', [id, empresaId]);
        throw bad(exists.length ? 409 : 404, exists.length ? 'Cadastro alterado por outro usuario. Atualize a tela.' : 'Cliente nao encontrado');
      }
      await connection.execute(
        "INSERT INTO auditoria_operacional (empresa_id, usuario_id, entidade, entidade_id, acao, criado_em) VALUES (?, ?, 'CLIENTE', ?, 'ATUALIZACAO', UTC_TIMESTAMP())",
        [empresaId, req.usuario.id, id]
      );
      const [rows] = await connection.execute(`SELECT ${colunas} FROM clientes WHERE id = ? AND empresa_id = ?`, [id, empresaId]);
      await connection.commit();
      res.json(toCliente(rows[0]));
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  }));
}
