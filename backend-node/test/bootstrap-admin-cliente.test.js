import test from 'node:test';
import assert from 'node:assert/strict';
import { cadastrarAdminSolicitadoNoDeploy, ADMIN_SOLICITADO } from '../src/bootstrap-admin-cliente.js';

function base({ empresas = [{ id: 7, nome: 'Empresa de teste' }], usuarios = [], migracaoFeita = false } = {}) {
  const comandos = [];
  let commits = 0;
  let rollbacks = 0;
  let liberado = false;
  const conn = {
    async query(sql) {
      comandos.push(sql);
      if (sql.includes('GET_LOCK')) return [[{ adquirido: 1 }]];
      if (sql.includes('RELEASE_LOCK')) return [[{ liberado: 1 }]];
      return [[]];
    },
    async beginTransaction() { comandos.push('BEGIN'); },
    async commit() { commits += 1; comandos.push('COMMIT'); },
    async rollback() { rollbacks += 1; },
    async execute(sql, args) {
      comandos.push(sql);
      if (sql.includes('FROM bootstrap_execucoes')) return [migracaoFeita ? [{ codigo: 'ok' }] : []];
      if (sql.includes('FROM usuarios WHERE LOWER(email)')) {
        assert.equal(args[0], ADMIN_SOLICITADO.email);
        return [usuarios];
      }
      if (sql.includes('FROM empresas WHERE ativa')) return [empresas.slice(0, 2)];
      if (sql.includes('INSERT INTO usuarios')) {
        assert.equal(args[1], 'João Paulo');
        assert.equal(args[2], 'joaopaulo.18@hotmail.com');
        assert.equal(args[5], 'ADMIN');
        return [{ insertId: 42 }];
      }
      return [{}];
    },
    release() { liberado = true; },
  };
  return {
    db: { async getConnection() { return conn; } },
    comandos, get commits() { return commits; },
    get rollbacks() { return rollbacks; },
    get liberado() { return liberado; },
  };
}
const logger = { info() {}, warn() {}, error() {} };

test('fora da producao nao toca no banco', async () => {
  const f = base();
  const result = await cadastrarAdminSolicitadoNoDeploy(f.db, { ambiente: 'test', logger });
  assert.equal(result.status, 'fora_de_producao');
  assert.equal(f.comandos.length, 0);
});

test('com apenas uma empresa cria admin pendente e auditavel sem senha fixa', async () => {
  const f = base();
  const result = await cadastrarAdminSolicitadoNoDeploy(f.db, { ambiente: 'production', logger });
  assert.deepEqual(result, { status: 'criado', id: 42 });
  assert.equal(f.commits, 1);
  assert.equal(f.rollbacks, 0);
  assert.ok(f.liberado);
  assert.ok(f.comandos.some(x => x.includes('INSERT INTO auditoria_operacional')));
  assert.ok(f.comandos.some(x => x.includes('INSERT INTO bootstrap_execucoes')));
  assert.ok(f.comandos.some(x => x.includes('1,0,0,0,UTC_TIMESTAMP()')));
});

test('com mais de uma empresa nao escolhe um tenant por adivinhacao', async () => {
  const f = base({ empresas: [{ id: 1, nome: 'A' }, { id: 2, nome: 'B' }] });
  const result = await cadastrarAdminSolicitadoNoDeploy(f.db, { ambiente: 'production', logger });
  assert.equal(result.status, 'empresa_ambigua');
  assert.equal(f.comandos.filter(x => x.includes('INSERT INTO usuarios')).length, 0);
  assert.equal(f.commits, 1);
  assert.ok(f.liberado);
});

test('nao eleva permissao de email ja cadastrado', async () => {
  const f = base({ usuarios: [{ id: 9, perfil: 'USUARIO', empresa_id: 7 }] });
  const result = await cadastrarAdminSolicitadoNoDeploy(f.db, { ambiente: 'production', logger });
  assert.equal(result.status, 'ja_cadastrado');
  assert.equal(f.comandos.filter(x => x.includes('INSERT INTO usuarios')).length, 0);
});

test('nao repete criacao apos marcador do primeiro deploy', async () => {
  const f = base({ migracaoFeita: true });
  const result = await cadastrarAdminSolicitadoNoDeploy(f.db, { ambiente: 'production', logger });
  assert.equal(result.status, 'ja_executado');
  assert.equal(f.comandos.filter(x => x.includes('INSERT INTO usuarios')).length, 0);
});
