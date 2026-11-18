// Dividendo de imovel de terceiros - paridade do legado Java (V18).
// Operacoes sempre atomicas com seus participantes, com concorrencia otimista.
import Decimal from 'decimal.js';

const PERMISSOES = ['FINANCEIRO_VISUALIZAR', 'CONFIGURACOES_GERENCIAR'];
const idPositivo = v => Number.isSafeInteger(Number(v)) && Number(v) > 0;
const dec = (value, casas, inteiroMax, bad, label) => {
  if ((typeof value !== 'string' && typeof value !== 'number') ||
      !/^\d+(?:\.\d+)?$/.test(String(value))) throw bad(400, label + ' invalido');
  const [i, f = ''] = String(value).split('.');
  if (i.length > inteiroMax || f.length > casas) throw bad(400, label + ' fora da precisao');
  const d = new Decimal(value);
  if (!d.isFinite()) throw bad(400, label + ' invalido');
  return d;
};
export function validarDividendo(body, bad) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad(400, 'Operacao invalida');
  if (typeof body.imovel !== 'string' || !body.imovel.trim() || body.imovel.trim().length > 200) {
    throw bad(400, 'Informe o imovel ou operacao (maximo 200 caracteres)');
  }
  if (body.observacoes != null && typeof body.observacoes !== 'string') throw bad(400, 'Observacoes invalidas');
  const observacoes = body.observacoes?.trim() || null;
  if (observacoes?.length > 2000) throw bad(400, 'Observacoes muito longas');
  const valorBase = dec(body.valorBase, 2, 17, bad, 'Valor-base');
  if (valorBase.isNegative()) throw bad(400, 'Valor-base invalido');
  if (!Array.isArray(body.participantes) || !body.participantes.length || body.participantes.length > 100) {
    throw bad(400, 'Informe os participantes');
  }
  const nomes = new Set();
  const participantes = body.participantes.map(p => {
    if (!p || typeof p !== 'object' || Array.isArray(p) ||
        typeof p.nome !== 'string' || !p.nome.trim() || p.nome.trim().length > 160) {
      throw bad(400, 'Nome do participante invalido');
    }
    const nome = p.nome.trim(), chave = nome.toLocaleLowerCase('pt-BR');
    if (nomes.has(chave)) throw bad(400, 'O mesmo participante nao pode aparecer duas vezes');
    nomes.add(chave);
    const percentual = dec(p.percentual, 4, 3, bad, 'Percentual');
    if (percentual.isNegative() || percentual.greaterThan(100)) throw bad(400, 'Percentual invalido');
    return { nome, percentual: percentual.toFixed(4) };
  });
  const total = participantes.reduce((n, p) => n.plus(p.percentual), new Decimal(0));
  if (total.minus(100).abs().greaterThan('0.01')) throw bad(400, 'A soma dos percentuais precisa totalizar 100%');
  return { imovel: body.imovel.trim(), valorBase: valorBase.toFixed(2), observacoes, participantes };
}
const toResposta = (row, participantes) => ({
  id: row.id, empresaId: row.empresa_id, imovel: row.imovel,
  valorBase: row.valor_base, observacoes: row.observacoes,
  participantes: participantes.map(p => ({ nome: p.nome, percentual: p.percentual })),
  versao: Number(row.versao), criadoEm: row.criado_em?.replace(' ', 'T'),
  atualizadoEm: row.atualizado_em?.replace(' ', 'T')
});
export function registerDividendos(app, { db, exigirLogin, empresaAutorizada, exigirPermissao, handler, bad }) {
  const pegar = async (conn, id, empresa, lock=false) => {
    const [r] = await conn.execute(
      'SELECT id,empresa_id,imovel,valor_base,observacoes,versao,criado_em,atualizado_em FROM dividendos_terceiros WHERE id=? AND empresa_id=?' + (lock ? ' FOR UPDATE' : ''),
      [id, empresa]
    );
    if (!r.length) throw bad(404, 'Controle de dividendos nao encontrado');
    return r[0];
  };
  const participantes = async (conn, id) => {
    const [r] = await conn.execute('SELECT nome,percentual FROM dividendos_terceiros_participantes WHERE dividendo_id=? ORDER BY ordem', [id]);
    return r;
  };
  const salvarParticipantes = async (conn, id, list) => {
    for (let i = 0; i < list.length; i++) {
      await conn.execute(
        'INSERT INTO dividendos_terceiros_participantes (dividendo_id,ordem,nome,percentual) VALUES (?,?,?,?)',
        [id, i, list[i].nome, list[i].percentual]
      );
    }
  };
  const auditar = (conn, empresa, usuario, id, acao) =>
    conn.execute("INSERT INTO auditoria_operacional (empresa_id,usuario_id,entidade,entidade_id,acao,criado_em) VALUES (?,?,'DIVIDENDO_TERCEIRO',?,?,UTC_TIMESTAMP())", [empresa, usuario, id, acao]);

  app.get('/api/dividendos-terceiros', exigirLogin, handler(async (req, res) => {
    await exigirPermissao(req, PERMISSOES);
    const empresa = await empresaAutorizada(req);
    const [rows] = await db.execute('SELECT id,empresa_id,imovel,valor_base,observacoes,versao,criado_em,atualizado_em FROM dividendos_terceiros WHERE empresa_id=? ORDER BY atualizado_em DESC,id DESC', [empresa]);
    if (!rows.length) return res.json([]);
    const ids = rows.map(x => x.id);
    const [list] = await db.query('SELECT dividendo_id,nome,percentual,ordem FROM dividendos_terceiros_participantes WHERE dividendo_id IN (' + ids.map(()=>'?').join(',') + ') ORDER BY dividendo_id,ordem', ids);
    const byId = new Map();
    for (const p of list) {
      if (!byId.has(Number(p.dividendo_id))) byId.set(Number(p.dividendo_id), []);
      byId.get(Number(p.dividendo_id)).push(p);
    }
    res.json(rows.map(r => toResposta(r, byId.get(Number(r.id)) || [])));
  }));

  app.post('/api/dividendos-terceiros', exigirLogin, handler(async (req,res) => {
    await exigirPermissao(req, PERMISSOES);
    const empresa = await empresaAutorizada(req), dados = validarDividendo(req.body, bad);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [r] = await conn.execute(
        'INSERT INTO dividendos_terceiros (empresa_id,imovel,valor_base,observacoes,versao,criado_por_usuario_id,atualizado_por_usuario_id,criado_em,atualizado_em) VALUES (?,?,?,?,0,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP())',
        [empresa,dados.imovel,dados.valorBase,dados.observacoes,req.usuario.id,req.usuario.id]
      );
      await salvarParticipantes(conn,r.insertId,dados.participantes);
      await auditar(conn,empresa,req.usuario.id,r.insertId,'CRIACAO');
      const row = await pegar(conn,r.insertId,empresa);
      const list = await participantes(conn,r.insertId);
      await conn.commit();
      res.status(201).json(toResposta(row,list));
    } catch(e) {await conn.rollback();throw e;} finally {conn.release();}
  }));

  app.put('/api/dividendos-terceiros/:id', exigirLogin, handler(async (req,res) => {
    await exigirPermissao(req, PERMISSOES);
    const empresa = await empresaAutorizada(req), id = Number(req.params.id);
    if (!idPositivo(id)) throw bad(400,'ID invalido');
    const dados = validarDividendo(req.body,bad), versao = req.body.versao;
    if (!Number.isSafeInteger(versao) || versao < 0) throw bad(400,'Informe a versao atual');
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const anterior = await pegar(conn,id,empresa,true);
      if (Number(anterior.versao)!==versao) throw bad(409,'Controle alterado por outro usuario');
      const [r]=await conn.execute(
        'UPDATE dividendos_terceiros SET imovel=?,valor_base=?,observacoes=?,versao=versao+1,atualizado_por_usuario_id=?,atualizado_em=UTC_TIMESTAMP() WHERE id=? AND empresa_id=? AND versao=?',
        [dados.imovel,dados.valorBase,dados.observacoes,req.usuario.id,id,empresa,versao]
      );
      if(r.affectedRows!==1) throw bad(409,'Controle alterado por outro usuario');
      await conn.execute('DELETE FROM dividendos_terceiros_participantes WHERE dividendo_id=?',[id]);
      await salvarParticipantes(conn,id,dados.participantes);
      await auditar(conn,empresa,req.usuario.id,id,'ATUALIZACAO');
      const row = await pegar(conn,id,empresa);
      const list = await participantes(conn,id);
      await conn.commit();
      res.json(toResposta(row,list));
    } catch(e) {await conn.rollback();throw e;} finally {conn.release();}
  }));

  app.delete('/api/dividendos-terceiros/:id', exigirLogin, handler(async (req,res) => {
    await exigirPermissao(req, PERMISSOES);
    const empresa = await empresaAutorizada(req), id = Number(req.params.id);
    if (!idPositivo(id)) throw bad(400,'ID invalido');
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await pegar(conn,id,empresa,true);
      await conn.execute('DELETE FROM dividendos_terceiros_participantes WHERE dividendo_id=?',[id]);
      await conn.execute('DELETE FROM dividendos_terceiros WHERE id=? AND empresa_id=?',[id,empresa]);
      await auditar(conn,empresa,req.usuario.id,id,'EXCLUSAO');
      await conn.commit();
      res.status(204).end();
    } catch(e) {await conn.rollback();throw e;} finally {conn.release();}
  }));
}
