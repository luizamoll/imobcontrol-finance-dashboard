import test from 'node:test';
import assert from 'node:assert/strict';
import { registerCatalogoRead } from '../src/catalogo.js';

function simular() {
  const rotas = new Map();
  const app = { get(path, ...middleware) { rotas.set(path, middleware.at(-1)); } };
  const db = {
    async execute(sql, params) {
      if (sql.includes('COUNT(*)')) return [[{ total: 1 }]];
      if (sql.includes('FROM empreendimentos') && sql.includes('LIMIT ? OFFSET ?')) {
        return [[{
          id: 9, empresa_id: 3, nome: 'Residencial A', spe: null, cnpj: null,
          area_total: '100.0000', tipo: 'Loteamento', unidades_previstas: 2,
          valor_total: '1234.56', socio_nome: null, socio_pct: '0.0000',
          empresa_pct: '100.0000', corretor_pct: '5.0000', aliquota_tributaria: '0.0000',
          repasse_comissao_pct: '50.0000', comissao_sobre_acrescimos: 0,
          inadimplencia_json: '{"multa":2}', reajuste_contratual_json: null,
          observacoes: null, status: 'ATIVO', versao: 0,
          criado_em: '2026-11-01 12:30:00', atualizado_em: '2026-11-01 12:30:00'
        }]];
      }
      throw new Error('SQL nao previsto em teste: ' + sql);
    }
  };
  const handler = fn => fn;
  const bad = (status, message) => Object.assign(new Error(message), { status });
  registerCatalogoRead(app, {
    db, exigirLogin: (req, res, next) => next(),
    empresaAutorizada: async () => 3,
    exigirPermissao: async () => {},
    handler, bad
  });
  return { rotas, bad };
}

test('catalogo mapeia para o contrato React e respeita a empresa autorizada', async () => {
  const { rotas } = simular();
  let response;
  await rotas.get('/api/empreendimentos')(
    { query: { pagina: '0', tamanho: '20' } },
    { json(payload) { response = payload; } }
  );
  assert.equal(response.totalElements, 1);
  assert.equal(response.content[0].empresaId, 3);
  assert.equal(response.content[0].valorTotal, '1234.56');
  assert.deepEqual(response.content[0].inadimplencia, { multa: 2 });
  assert.equal(response.content[0].comissaoSobreAcrescimos, false);
  assert.equal(response.content[0].criadoEm, '2026-11-01T12:30:00');
});

test('paginacao invalida e rejeitada antes de consultar dados', async () => {
  const { rotas } = simular();
  await assert.rejects(() => rotas.get('/api/empreendimentos')(
    { query: { pagina: '-1', tamanho: '20' } },
    { json() {} }
  ), /Paginacao invalida/);
});
