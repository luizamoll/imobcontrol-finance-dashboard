import express from 'express';
import { registerClientesWrites } from './clientes.js';
import { registerCatalogoRead } from './catalogo.js';
import { registerCatalogoWrites } from './catalogo-write.js';
import { registerEmpresaConfig } from './empresa-config.js';
import { registerFinanceiroRead } from './financeiro-read.js';
import { registerRecebimentos } from './recebimentos.js';
import { registerVendasWrite } from './vendas-write.js';
import { registerVendasManage } from './vendas-manage.js';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

for (const key of ['DB_HOST', 'DB_USER', 'DB_NAME', 'SESSION_SECRET']) {
  if (!process.env[key]) throw new Error('Falta variavel de ambiente: ' + key);
}
if (process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET deve ter pelo menos 32 caracteres');
if (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'true') {
  throw new Error('Em producao, COOKIE_SECURE=true exige HTTPS.');
}

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 8,
  timezone: 'Z',
  dateStrings: true,
  decimalNumbers: false,
  supportBigNumbers: true,
  bigNumberStrings: false
});
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));

const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const COOKIE_OPTS = {
  httpOnly: true, secure: COOKIE_SECURE, sameSite: 'lax', path: '/'
};
const handler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const sha = value => createHash('sha256').update(value).digest('hex');
const cookie = (req, name) => {
  const part = (req.headers.cookie || '').split(';').map(x => x.trim())
    .find(x => x.startsWith(name + '='));
  if (!part) return null;
  try { return decodeURIComponent(part.slice(name.length + 1)); } catch { return null; }
};
const safeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
const bad = (status, message) => Object.assign(new Error(message), { status });

function csrfFor(nonce) {
  return createHmac('sha256', process.env.SESSION_SECRET).update(nonce).digest('hex');
}
app.get('/api/auth/csrf', (req, res) => {
  let nonce = cookie(req, 'imob_csrf');
  if (!nonce || !/^[a-f0-9]{48}$/.test(nonce)) {
    nonce = randomBytes(24).toString('hex');
    res.cookie('imob_csrf', nonce, { ...COOKIE_OPTS, maxAge: 12 * 3600 * 1000 });
  }
  res.json({ headerName: 'X-CSRF-TOKEN', parameterName: '_csrf', token: csrfFor(nonce) });
});
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)
      || (req.method === 'POST' && ['/auth/login', '/auth/logout'].includes(req.path))) return next();
  const nonce = cookie(req, 'imob_csrf');
  if (!nonce || !safeEqual(req.get('X-CSRF-TOKEN'), csrfFor(nonce))) return next(bad(403, 'Token CSRF invalido'));
  return next();
});

async function usuarioPorId(id) {
  const [rows] = await db.execute(
    `SELECT u.id, u.empresa_id, u.nome, u.email, u.telefone, u.perfil,
            u.ativo, u.senha_definida, u.email_verificado,
            e.nome AS empresa_nome, e.slug AS empresa_slug, e.ativa AS empresa_ativa
       FROM usuarios u LEFT JOIN empresas e ON e.id = u.empresa_id
      WHERE u.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}
async function dadosUsuario(usuario) {
  const [perms] = await db.execute('SELECT permissao FROM usuario_permissoes WHERE usuario_id = ?', [usuario.id]);
  return {
    id: usuario.id, nome: usuario.nome, email: usuario.email,
    telefone: usuario.telefone, emailVerificado: Boolean(usuario.email_verificado),
    senhaDefinida: Boolean(usuario.senha_definida),
    perfil: usuario.perfil, permissoes: perms.map(p => p.permissao),
    empresa: usuario.empresa_id == null ? null : {
      id: usuario.empresa_id, nome: usuario.empresa_nome, slug: usuario.empresa_slug
    }
  };
}
const ativo = u => u && Number(u.ativo) === 1 &&
  Number(u.senha_definida) === 1 && Number(u.email_verificado) === 1 &&
  (u.perfil === 'SUPER_ADMIN' || (u.empresa_id != null && Number(u.empresa_ativa) === 1));

app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false }), handler(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';
  if (!email || !senha || email.length > 200) throw bad(401, 'E-mail ou senha invalidos');
  const [rows] = await db.execute('SELECT id, senha_hash FROM usuarios WHERE email = ? LIMIT 1', [email]);
  const registro = rows[0];
  const senhaValida = registro && await bcrypt.compare(senha, registro.senha_hash);
  const usuario = senhaValida ? await usuarioPorId(registro.id) : null;
  if (!ativo(usuario)) throw bad(401, 'E-mail ou senha invalidos');

  const token = randomBytes(32).toString('hex');
  await db.execute('INSERT INTO node_sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 12 HOUR))', [sha(token), usuario.id]);
  res.cookie('imob_session', token, { ...COOKIE_OPTS, maxAge: 12 * 3600 * 1000 });
  res.json(await dadosUsuario(usuario));
}));

async function exigirLogin(req, res, next) {
  try {
    const token = cookie(req, 'imob_session');
    if (!token || !/^[0-9a-f]{64}$/.test(token)) return next(bad(401, 'Nao autenticado'));
    const [rows] = await db.execute(
      'SELECT usuario_id FROM node_sessoes WHERE token_hash = ? AND expira_em > UTC_TIMESTAMP() LIMIT 1',
      [sha(token)]);
    if (!rows.length) return next(bad(401, 'Sessao expirada'));
    const usuario = await usuarioPorId(rows[0].usuario_id);
    if (!ativo(usuario)) return next(bad(403, 'Acesso bloqueado'));
    req.usuario = usuario;
    next();
  } catch (e) { next(e); }
}
app.get('/api/auth/me', exigirLogin, handler(async (req, res) => res.json(await dadosUsuario(req.usuario))));
app.post('/api/auth/logout', handler(async (req, res) => {
  const token = cookie(req, 'imob_session');
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    await db.execute('DELETE FROM node_sessoes WHERE token_hash = ?', [sha(token)]);
  }
  res.clearCookie('imob_session', COOKIE_OPTS);
  res.status(204).end();
}));

async function empresaAutorizada(req) {
  const u = req.usuario;
  const header = req.get('X-Empresa-Id');
  const solicitada = header == null ? null : Number(header);
  if (header != null && (!Number.isSafeInteger(solicitada) || solicitada <= 0)) throw bad(400, 'Empresa invalida');
  if (u.perfil === 'SUPER_ADMIN') {
    if (solicitada == null) throw bad(400, 'Selecione uma empresa');
    const [rows] = await db.execute('SELECT id FROM empresas WHERE id = ? AND ativa = 1', [solicitada]);
    if (!rows.length) throw bad(404, 'Empresa nao encontrada');
    return solicitada;
  }
  if (solicitada != null && solicitada !== Number(u.empresa_id)) throw bad(403, 'Empresa nao autorizada');
  return Number(u.empresa_id);
}
async function exigirPermissao(req, nomes) {
  if (['SUPER_ADMIN', 'ADMIN'].includes(req.usuario.perfil)) return;
  const [rows] = await db.execute('SELECT permissao FROM usuario_permissoes WHERE usuario_id = ?', [req.usuario.id]);
  const set = new Set(rows.map(p => p.permissao));
  if (!nomes.some(p => set.has(p) || (p === 'VENDAS_CRIAR' && set.has('VENDAS_GERENCIAR')))) {
    throw bad(403, 'Sem permissao para acessar este modulo');
  }
}
const colunas = 'id, empresa_id, nome, cpf, email, telefone, cep, logradouro, numero, complemento, bairro, cidade, uf, estado_civil, profissao, versao, criado_em, atualizado_em';
const toCliente = c => ({
  id: c.id, empresaId: c.empresa_id, nome: c.nome, cpf: c.cpf, email: c.email,
  telefone: c.telefone, cep: c.cep, logradouro: c.logradouro, numero: c.numero,
  complemento: c.complemento, bairro: c.bairro, cidade: c.cidade, uf: c.uf,
  estadoCivil: c.estado_civil, profissao: c.profissao, versao: c.versao,
  criadoEm: c.criado_em?.replace(' ', 'T'), atualizadoEm: c.atualizado_em?.replace(' ', 'T')
});
app.get('/api/clientes', exigirLogin, handler(async (req, res) => {
  await exigirPermissao(req, ['CLIENTES_VISUALIZAR', 'CLIENTES_GERENCIAR', 'VENDAS_GERENCIAR', 'VENDAS_CRIAR']);
  const empresa = await empresaAutorizada(req);
  const pagina = Number(req.query.pagina ?? 0), tamanho = Number(req.query.tamanho ?? 20);
  if (!Number.isSafeInteger(pagina) || pagina < 0 || !Number.isSafeInteger(tamanho) || tamanho < 1 || tamanho > 100) throw bad(400, 'Paginacao invalida');
  const [totais] = await db.execute('SELECT COUNT(*) AS total FROM clientes WHERE empresa_id = ?', [empresa]);
  const [rows] = await db.execute(`SELECT ${colunas} FROM clientes WHERE empresa_id = ? ORDER BY nome, id LIMIT ? OFFSET ?`, [empresa, tamanho, pagina * tamanho]);
  const total = Number(totais[0].total);
  res.json({ content: rows.map(toCliente), totalElements: total, totalPages: Math.ceil(total / tamanho), number: pagina, size: tamanho, first: pagina === 0, last: (pagina + 1) * tamanho >= total, numberOfElements: rows.length, empty: rows.length === 0 });
}));
app.get('/api/clientes/:id', exigirLogin, handler(async (req, res) => {
  await exigirPermissao(req, ['CLIENTES_VISUALIZAR', 'CLIENTES_GERENCIAR', 'VENDAS_GERENCIAR']);
  const empresa = await empresaAutorizada(req), id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) throw bad(400, 'ID invalido');
  const [rows] = await db.execute(`SELECT ${colunas} FROM clientes WHERE id = ? AND empresa_id = ?`, [id, empresa]);
  if (!rows.length) throw bad(404, 'Cliente nao encontrado');
  res.json(toCliente(rows[0]));
}));

registerClientesWrites(app, { db, exigirLogin, empresaAutorizada, exigirPermissao, handler, bad, toCliente, colunas });
registerCatalogoRead(app, { db, exigirLogin, empresaAutorizada, exigirPermissao, handler, bad });
registerCatalogoWrites(app, { db, exigirLogin, empresaAutorizada, exigirPermissao, handler, bad });
registerEmpresaConfig(app, { db, exigirLogin, empresaAutorizada, exigirPermissao, handler, bad });
registerFinanceiroRead(app, { db, exigirLogin, empresaAutorizada, exigirPermissao, handler, bad });
registerRecebimentos(app, { db, exigirLogin, empresaAutorizada, exigirPermissao, handler, bad });
registerVendasWrite(app, { db, exigirLogin, empresaAutorizada, exigirPermissao, handler, bad });
registerVendasManage(app, { db, exigirLogin, empresaAutorizada, exigirPermissao, handler, bad });

app.get('/health', handler(async (req, res) => {
  await db.query('SELECT 1');
  res.json({ status: 'UP', app: 'imobcontrol-node' });
}));
app.get('/actuator/health', handler(async (req, res) => {
  await db.query('SELECT 1');
  res.json({ status: 'UP' });
}));
app.use('/api', (req, res) => res.status(501).json({ erro: 'Modulo ainda nao migrado para Node.js' }));
app.use((err, req, res, next) => {
  const status = err.status || (err.code === 'ER_DUP_ENTRY' ? 409 : 500);
  if (status >= 500) console.error('Erro da API:', err.message);
  res.status(status).json({ erro: status === 500 ? 'Erro interno do servidor' : (err.message || 'Operacao nao concluida') });
});

// A API pode ser usada de duas formas:
// - standalone para testes/compatibilidade: node backend-node/src/index.js;
// - importada no servidor unificado da Hostinger, sem abrir outra porta.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export default app;
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const porta = Number(process.env.PORT || 3000);
  app.listen(porta, '0.0.0.0', () => {
    console.log('ImobControl API Node em porta ' + porta);
  });
}
