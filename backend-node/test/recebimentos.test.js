import test from 'node:test';
import assert from 'node:assert/strict';
import { valorCorrigido, calcularDistribuicao } from '../src/recebimentos.js';

const parcela = { valor: '100.00', vencimento: '2026-10-01' };
const venda = {
  valor_total: '1000.00', corretor_pct: '5.0000',
  repasse_comissao_pct: '50.0000',
  corretagem_compoe_valor_contrato: 1,
  comissao_sobre_acrescimos: 0,
  regras_json: '{"aliquotaTributaria": 2, "empresaPct": 70, "socioPct":30}'
};
const empreendimento = { empresa_pct: '70.0000', socio_pct: '30.0000' };

test('baixa retroativa nao acumula juros ate a data de registro', () => {
  const r = {
    jurosAtivo: true, jurosTipo: 'mensal', jurosPctMes: 2,
    moraAtiva: true, moraPct: 1
  };
  assert.equal(valorCorrigido(parcela, r, '2026-10-01'), '100.00');
  assert.equal(valorCorrigido(parcela, r, '2026-10-31'), '103.00');
  assert.equal(valorCorrigido(parcela, r, '2026-11-10'), '103.67');
  assert.equal(valorCorrigido(parcela, r, '2026-09-30'), '100.00');
});

test('dias de tolerancia e juros diarios respeitam os ajustes', () => {
  const r = {
    toleranciaAtiva: true, diasTolerancia: 5, inicioJuros: 'apos_tolerancia',
    jurosAtivo: true, jurosTipo: 'diario', jurosPctDia: 1
  };
  assert.equal(valorCorrigido(parcela, r, '2026-10-05'), '100.00');
  assert.equal(valorCorrigido(parcela, r, '2026-10-07'), '101.00');
});

test('calculo preserva imposto, comissao, socio e empresa em centavos', () => {
  const r = calcularDistribuicao({
    parcela, venda, empreendimento, recebido: '100.00', comissaoJaPaga: '0.00'
  });
  assert.equal(r.impostoReservado, '2.00');
  assert.equal(r.comissaoPaga, '50.00');
  assert.equal(r.empresaValor, '33.60');
  assert.equal(r.socioValor, '14.40');
  assert.equal(r.saldoComissaoApos, '0.00');
});

test('teto de comissao nao e ultrapassado', () => {
  const r = calcularDistribuicao({
    parcela, venda, empreendimento, recebido: '100.00', comissaoJaPaga: '45.00'
  });
  assert.equal(r.comissaoPaga, '5.00');
  assert.equal(r.saldoComissaoApos, '0.00');
  assert.equal(r.empresaValor, '65.10');
  assert.equal(r.socioValor, '27.90');
});

test('comissao externa nao consome dinheiro do recebimento', () => {
  const r = calcularDistribuicao({
    parcela, venda: {...venda, corretagem_compoe_valor_contrato: 0},
    empreendimento, recebido:'100.00', comissaoJaPaga:'0.00'
  });
  assert.equal(r.comissaoPaga, '0.00');
  assert.equal(r.comissaoBaseCalculo, '0.00');
});

test('comissao sobre acrescimos usa o valor recebido', () => {
  const r = calcularDistribuicao({
    parcela, venda: {...venda, comissao_sobre_acrescimos: 1, valor_total: '10000.00'},
    empreendimento, recebido:'110.00', comissaoJaPaga:'0.00'
  });
  assert.equal(r.comissaoPaga, '55.00');
});

test('precisao monetaria fica em 2 casas sem usar float', () => {
  const r = calcularDistribuicao({
    parcela: {...parcela, valor: '0.11'},
    venda: {
      ...venda, valor_total: '9876543.21',
      corretor_pct: '0.0000',
      regras_json: '{"aliquotaTributaria":0}'
    },
    empreendimento: { empresa_pct: '75.0000', socio_pct: '25.0000' },
    recebido: '0.11', comissaoJaPaga: '0.00'
  });
  assert.equal(r.empresaValor, '0.08');
  assert.equal(r.socioValor, '0.03');
});
