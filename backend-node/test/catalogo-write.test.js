import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarCatalogo, registerCatalogoWrites } from '../src/catalogo-write.js';

const bad = (status, message) => Object.assign(new Error(message), { status });
const empreendimento = {
  nome: '  Loteamento Jardim ', spe: null, cnpj: '11.222.333/0001-81',
  areaTotal: 100.25, tipo: 'Loteamento', unidadesPrevistas: 10,
  valorTotal: '190000.10', socioNome: null, socioPct: 25,
  empresaPct: 75, corretorPct: 5, aliquotaTributaria: 2,
  repasseComissaoPct: 50, comissaoSobreAcrescimos: false,
  inadimplencia: { multa: 2 }, reajusteContratual: { periodicidadeMeses: 12 },
  observacoes: null, status: 'ATIVO'
};

test('empreendimento preserva valores decimais, CNPJ e formato da API', () => {
  const c = normalizarCatalogo('empreendimentos', empreendimento, bad);
  assert.equal(c.valor_total, '190000.10');
  assert.equal(c.cnpj, '11222333000181');
  assert.equal(c.tipo, 'loteamento');
  assert.equal(c.status, 'ativo');
  assert.equal(c.inadimplencia_json, '{"multa":2}');
  assert.equal(c.comissao_sobre_acrescimos, 0);
});
test('rejeita percentuais invalidos e campos obrigatorios', () => {
  assert.throws(
    () => normalizarCatalogo('empreendimentos', { ...empreendimento, corretorPct: 101 }, bad),
    /superior a 100/
  );
  assert.throws(
    () => normalizarCatalogo('empreendimentos', { ...empreendimento, nome: ' ' }, bad),
    /Informe nome/
  );
  assert.throws(
    () => normalizarCatalogo('empreendimentos', { ...empreendimento, valorTotal: -1 }, bad),
    /invalido/
  );
  assert.throws(
    () => normalizarCatalogo('empreendimentos', { ...empreendimento, reajusteContratual: { periodicidadeMeses: 0 } }, bad),
    /Periodicidade/
  );
});
test('unidades e quadras validam referencias e agrupamentos', () => {
  assert.equal(normalizarCatalogo('quadras', {
    empreendimentoId: 5, nome: 'Quadra C', regras: null, tipoAgrupamento: 'Setor'
  }, bad).tipo_agrupamento, 'setor');
  assert.throws(
    () => normalizarCatalogo('unidades', {
      empreendimentoId: 5, quadraId: 2, numero: '3', unidade: 'Lote',
      area: 1, valorVenda: '0.00', status: 'disponivel', regras: []
    }, bad),
    /invalido/
  );
  assert.throws(
    () => normalizarCatalogo('quadras', {
      empreendimentoId: 1, nome: 'A', tipoAgrupamento: 'torre', regras: null
    }, bad),
    /agrupamento/
  );
});

test('cadastro registra usuario, empresa e auditoria na mesma transacao', async () => {
  const rotas = new Map(), queries = [];
  const c = {
    async beginTransaction(){ queries.push('BEGIN'); },
    async execute(sql, args) {
      queries.push({ sql, args });
      if (sql.startsWith('INSERT INTO empreendimentos')) return [{ insertId: 18 }];
      if (sql.startsWith('SELECT * FROM empreendimentos')) {
        return [[{
          id: 18, empresa_id: 2, nome: 'Jardim', versao: 0, tipo: 'loteamento',
          inadimplencia_json: '{}', reajuste_contratual_json: null, comissao_sobre_acrescimos: 0
        }]];
      }
      if (sql.startsWith('INSERT INTO auditoria_operacional')) return [{ insertId: 1 }];
      throw Error('Query nao prevista: ' + sql);
    },
    async commit(){queries.push('COMMIT');},
    async rollback(){queries.push('ROLLBACK');},
    release(){queries.push('RELEASE');}
  };
  const app = {
    post(path,...args){rotas.set('POST '+path,args.at(-1));},
    put(path,...args){rotas.set('PUT '+path,args.at(-1));}
  };
  registerCatalogoWrites(app, {
    db:{ async getConnection(){return c;} },
    exigirLogin: (req,res,next)=>next(),
    empresaAutorizada:async()=>2,
    exigirPermissao:async()=>{},
    handler: fn=>fn,
    bad
  });
  let status, response;
  await rotas.get('POST /api/empreendimentos')(
    { body: empreendimento, usuario: { id: 9 } },
    { status(v){ status=v; return this; }, json(v){ response=v; } }
  );
  assert.equal(status,201);
  assert.equal(response.id,18);
  assert.ok(queries.includes('BEGIN'));
  assert.ok(queries.includes('COMMIT'));
  assert.ok(!queries.includes('ROLLBACK'));
  assert.equal(queries.find(x=>x.sql?.includes('INSERT INTO auditoria_operacional')).args[0],2);
  assert.equal(queries.find(x=>x.sql?.includes('INSERT INTO auditoria_operacional')).args[1],9);
});
