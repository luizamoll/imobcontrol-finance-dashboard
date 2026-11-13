import test from 'node:test';
import assert from 'node:assert/strict';
import { registerFinanceiroRead } from '../src/financeiro-read.js';

function montar() {
  const rotas = new Map(), consultas = [];
  const app = { get(path, ...args) { rotas.set(path, args.at(-1)); } };
  const db = { async execute(sql, params) {
    consultas.push({ sql, params });
    if (sql.includes('COUNT(*)')) return [[{ total: 1 }]];
    if (sql.includes('FROM pagamento_itens')) return [[{
      id: 5, venda_id: 10, tipo: 'parcela', descricao: 'Entrada',
      valor: '10.50', parcelas: 1, primeiro_vencimento: '2026-12-01', status: 'ativa'
    }]];
    if (sql.includes('FROM vendas v')) return [[{
      id: 10, empresa_id: 2, empreendimento_id: 1, unidade_id: 9, cliente_id: 7,
      comprador_nome: 'Cliente Exemplo', valor_total: '12345678.99',
      corretagem_compoe_valor_contrato: 1, comissao_sobre_acrescimos: 0,
      data_contrato: '2026-11-10', regras_json: '{"inadimplencia":{"moraPct":2}}', versao: 0
    }]];
    if (sql.includes('FROM parcelas p')) return [[{
      id: 80, venda_id: 10, empreendimento_id: 1, unidade_id: 9,
      cliente_id: 7, comprador_nome: 'Cliente Exemplo',
      valor: '123.45', valor_pago: '0.00', status: 'aberta',
      venda_regras: '{"inadimplencia":{"moraPct":2}}',
      regras_inadimplencia_json: null
    }]];
    if (sql.includes('FROM movimentos m')) return [[]];
    throw new Error('SQL desconhecido: ' + sql);
  } };
  const bad = (status, message) => Object.assign(new Error(message), { status });
  registerFinanceiroRead(app, {
    db, exigirLogin: (_, __, next) => next(),
    empresaAutorizada: async () => 2, exigirPermissao: async () => {},
    handler: fn => fn, bad
  });
  return { rotas, consultas };
}

test('vendas mapeia os campos e mantem valores decimais exatos', async () => {
  const { rotas, consultas } = montar();
  let response;
  await rotas.get('/api/vendas')(
    { query: { pagina: '0', tamanho: '20' } },
    { json(v) { response = v; } }
  );
  assert.equal(response.totalElements, 1);
  assert.equal(response.content[0].valorTotal, '12345678.99');
  assert.equal(response.content[0].composicao[0].valor, '10.50');
  assert.deepEqual(response.content[0].regras, { inadimplencia: { moraPct: 2 } });
  assert.deepEqual(consultas[0].params, [2]);
  assert.deepEqual(consultas[1].params, [2, 20, 0]);
});

test('parcelas devolve regras de inadimplencia vigentes', async () => {
  const { rotas } = montar();
  let result;
  await rotas.get('/api/parcelas')({ query: {} }, { json(v) { result = v; } });
  assert.equal(result[0].valor, '123.45');
  assert.equal(result[0].regrasInadimplencia.moraPct, 2);
});

test('movimentos exclui estornos pelo filtro SQL', async () => {
  const { rotas, consultas } = montar();
  await rotas.get('/api/movimentos')({ query: {} }, { json() {} });
  assert.match(consultas[0].sql, /m\.estornado = 0/);
  assert.deepEqual(consultas[0].params, [2]);
});
