import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarVenda, parcelasDaVenda } from '../src/vendas-write.js';

const bad = (status, message) => Object.assign(new Error(message), { status });
const venda = {
  empreendimentoId: 1, unidadeId: 2, clienteId: 3,
  valorTotal: '1000.00', valorImovel: '950.00',
  corretagemValor: '50.00', corretagemCompoeValorContrato: true,
  corretagemFormaPagamento: 'repasse_recebimentos',
  dataContrato: '2026-09-30', corretorNome: 'Corretor',
  corretorPct: '5', repasseComissaoPct: '50',
  comissaoSobreAcrescimos: false, observacoes: null,
  regrasInadimplencia: null,
  composicao: [
    { tipo:'sinal', descricao:'Entrada', valor:'100.00', parcelas:1, primeiroVencimento:'2026-10-01', status:'pendente' },
    { tipo:'parcelas', descricao:'Mensais', valor:'300.00', parcelas:3, primeiroVencimento:'2026-10-31', status:'pendente' }
  ]
};

test('normaliza venda com 5% e valida integridade economica do contrato', () => {
  const b = normalizarVenda(venda,bad);
  assert.equal(b.valorTotal, '1000.00');
  assert.equal(b.corretagemValor, '50.00');
  assert.equal(b.diferencaCentavos, 0);
  assert.equal(b.corretagemCompoeValorContrato,true);
  assert.throws(
    () => normalizarVenda({...venda, valorImovel: '1000.00'},bad),
    /Corretagem/
  );
});

test('gera entrada e parcelas sem arredondamentos incorretos', () => {
  const b = normalizarVenda(venda,bad);
  const parcelas = parcelasDaVenda(b,{inadimplencia:{moraPct:2}});
  assert.equal(parcelas.length,4);
  assert.equal(parcelas[0].valor,'100.00');
  assert.equal(parcelas[1].vencimento,'2026-10-31');
  assert.equal(parcelas[2].vencimento,'2026-11-30');
  assert.equal(parcelas[3].vencimento,'2026-12-31');
  assert.equal(parcelas[3].regrasInadimplencia,'{"moraPct":2}');
});

test('ajuste de centavos concentra sobra na ultima parcela', () => {
  const b = normalizarVenda({
    ...venda, valorTotal:'1000.01', valorImovel:null,
    corretagemValor:null, corretagemCompoeValorContrato:null
  },bad);
  const parcelas = parcelasDaVenda(b,{});
  assert.equal(parcelas[3].valor,'300.01');
  assert.equal(parcelas[3].valorOriginal,'300.01');
});

test('reajuste fixo de contrato so afeta vencimentos do ciclo pertinente', () => {
  const b = normalizarVenda(venda,bad);
  const parcelas = parcelasDaVenda(b,{
    reajusteContratual:{
      ativo:true, modalidade:'percentual_fixo', periodicidadeMeses:2,
      percentualBase:10
    }
  });
  assert.equal(parcelas[1].valor, '300.00');
  assert.equal(parcelas[2].valor, '330.00');
  assert.equal(parcelas[3].valor, '330.00');
});

test('rejeita comissao maior do que 100%, composicao inconsistente e datas invalidas', () => {
  assert.throws(()=>normalizarVenda({...venda, corretorPct: 101},bad),/entre 0 e 100/);
  assert.throws(()=>normalizarVenda({...venda, valorTotal: '1500.00'},bad),/nao fecha/);
  assert.throws(()=>normalizarVenda({...venda, dataContrato: '2026-02-31'},bad),/invalida/);
  assert.throws(()=>normalizarVenda({...venda, composicao: []},bad),/invalida/);
});
