// Cadastro de corretores: paridade do controlador Java com MySQL/isolamento por empresa.
// Nunca renomear ou excluir um corretor ja vinculado ao nome historico de uma venda.
const LEITURA = ['VENDAS_CRIAR', 'VENDAS_VISUALIZAR', 'VENDAS_EDITAR', 'VENDAS_GERENCIAR', 'FINANCEIRO_VISUALIZAR', 'CONFIGURACOES_GERENCIAR'];
const ESCRITA = ['VENDAS_CRIAR', 'VENDAS_GERENCIAR', 'CONFIGURACOES_GERENCIAR'];
const EXCLUIR = ['VENDAS_GERENCIAR', 'CONFIGURACOES_GERENCIAR'];
const campos = ['nome', 'documento', 'creci', 'email', 'telefone', 'chave_pix'];
const idValido = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const resposta = c => ({
  id: c.id, nome: c.nome, documento: c.documento, creci: c.creci,
  email: c.email, telefone: c.telefone, chavePix: c.chave_pix,
  versao: Number(c.versao)
});
export function validarCorretor(body, bad) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad(400, 'Cadastro invalido');
  const campo = (key, max, required = false) => {
    const v = body[key];
    if (v != null && typeof v !== 'string') throw bad(400, key + ' invalido');
    const clean = (v ?? '').trim();
    if (clean.length > max || (required && !clean)) throw bad(400, key + ' invalido');
    return clean || null;
  };
  const dados = {
    nome: campo('nome', 160, true),
    documento: campo('documento', 30),
    creci: campo('creci', 80),
    email: campo('email', 200),
    telefone: campo('telefone', 30),
    chave_pix: campo('chavePix', 200)
  };
  if (dados.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) throw bad(400, 'E-mail invalido');
  if (dados.email) dados.email = dados.email.toLowerCase();
  return dados;
}
export function registerCorretores(app, { db, exigirLogin, empresaAutorizada, exigirPermissao, handler, bad }) {
  const localizar = async (dbConn, id, empresaId, lock = false) => {
    const [r] = await dbConn.execute(
      'SELECT id, nome, documento, creci, email, telefone, chave_pix, versao FROM corretores_empresa WHERE id = ? AND empresa_id = ?' + (lock ? ' FOR UPDATE' : ''),
      [id, empresaId]
    );
    if (!r.length) throw bad(404, 'Corretor nao encontrado');
    return r[0];
  };
  const jaUsado = async (conn, empresa, nome) => {
    const [r] = await conn.execute('SELECT id FROM vendas WHERE empresa_id = ? AND LOWER(corretor_nome) = LOWER(?) LIMIT 1', [empresa, nome]);
    return r.length > 0;
  };
  const auditoria = (conn, empresa, usuario, id, acao) =>
    conn.execute("INSERT INTO auditoria_operacional (empresa_id,usuario_id,entidade,entidade_id,acao,criado_em) VALUES (?,?,'CORRETOR',?,?,UTC_TIMESTAMP())", [empresa, usuario, id, acao]);

  app.get('/api/corretores', exigirLogin, handler(async (req, res) => {
    await exigirPermissao(req, LEITURA);
    const empresa = await empresaAutorizada(req);
    const [rows] = await db.execute('SELECT id, nome, documento, creci, email, telefone, chave_pix, versao FROM corretores_empresa WHERE empresa_id = ? ORDER BY nome, id', [empresa]);
    res.json(rows.map(resposta));
  }));
  app.post('/api/corretores', exigirLogin, handler(async (req, res) => {
    await exigirPermissao(req, ESCRITA);
    const empresa = await empresaAutorizada(req);
    const dados = validarCorretor(req.body, bad);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [duplos] = await conn.execute('SELECT id FROM corretores_empresa WHERE empresa_id = ? AND LOWER(nome) = LOWER(?) LIMIT 1', [empresa, dados.nome]);
      if (duplos.length) throw bad(409, 'Corretor ja cadastrado nesta empresa');
      const [result] = await conn.execute(
        'INSERT INTO corretores_empresa (empresa_id,' + campos.join(',') + ',versao,criado_em,atualizado_em) VALUES (?,?,?,?,?,?,?,0,UTC_TIMESTAMP(),UTC_TIMESTAMP())',
        [empresa, ...campos.map(c => dados[c])]
      );
      const novo = await localizar(conn, result.insertId, empresa);
      await auditoria(conn, empresa, req.usuario.id, result.insertId, 'CRIACAO');
      await conn.commit();
      res.status(201).json(resposta(novo));
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  }));
  app.put('/api/corretores/:id', exigirLogin, handler(async (req, res) => {
    await exigirPermissao(req, ESCRITA);
    const empresa = await empresaAutorizada(req), id = Number(req.params.id);
    if (!idValido(id)) throw bad(400, 'ID invalido');
    const dados = validarCorretor(req.body, bad);
    const versao = req.body.versao;
    if (!Number.isSafeInteger(versao) || versao < 0) throw bad(400, 'Informe a versao atual');
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const anterior = await localizar(conn, id, empresa, true);
      if (Number(anterior.versao) !== versao) throw bad(409, 'Cadastro alterado. Atualize a tela.');
      const mudouNome = anterior.nome.toLocaleLowerCase('pt-BR') !== dados.nome.toLocaleLowerCase('pt-BR');
      if (mudouNome) {
        const [duplos] = await conn.execute('SELECT id FROM corretores_empresa WHERE empresa_id = ? AND LOWER(nome) = LOWER(?) AND id <> ? LIMIT 1', [empresa, dados.nome, id]);
        if (duplos.length) throw bad(409, 'Ja existe corretor com esse nome');
        if (await jaUsado(conn, empresa, anterior.nome)) {
          throw bad(409, 'Corretor vinculado a vendas. Preserve o nome ou ajuste as vendas individualmente.');
        }
      }
      const [result] = await conn.execute(
        'UPDATE corretores_empresa SET ' + campos.map(c => c + ' = ?').join(',') + ',versao=versao+1,atualizado_em=UTC_TIMESTAMP() WHERE id=? AND empresa_id=? AND versao=?',
        [...campos.map(c => dados[c]), id, empresa, versao]
      );
      if (result.affectedRows !== 1) throw bad(409, 'Conflito de alteracao');
      const novo = await localizar(conn, id, empresa);
      await auditoria(conn, empresa, req.usuario.id, id, 'ATUALIZACAO');
      await conn.commit();
      res.json(resposta(novo));
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  }));
  app.delete('/api/corretores/:id', exigirLogin, handler(async (req, res) => {
    await exigirPermissao(req, EXCLUIR);
    const empresa = await empresaAutorizada(req), id = Number(req.params.id);
    if (!idValido(id)) throw bad(400, 'ID invalido');
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const anterior = await localizar(conn, id, empresa, true);
      if (await jaUsado(conn, empresa, anterior.nome)) throw bad(409, 'Corretor vinculado a venda nao pode ser excluido');
      await conn.execute('DELETE FROM corretores_empresa WHERE id = ? AND empresa_id = ?', [id, empresa]);
      await auditoria(conn, empresa, req.usuario.id, id, 'EXCLUSAO');
      await conn.commit();
      res.status(204).end();
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  }));
}
