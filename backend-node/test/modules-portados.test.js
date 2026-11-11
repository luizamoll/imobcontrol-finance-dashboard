import test from 'node:test';
import assert from 'node:assert/strict';
import { validarCorretor } from '../src/corretores.js';
import { validarDividendo } from '../src/dividendos.js';
import { validarAcordo, gerarParcelasAcordo, addMonths } from '../src/acordos.js';
import { valorReajustadoFixo } from '../src/reajustes.js';

const bad = (status,message)=>Object.assign(new Error(message),{status});
const erro=(fn,status)=>assert.throws(fn,e=>e?.status===status);

test('corretores: normalizacao e validacoes de cadastro',()=>{
  assert.deepEqual(validarCorretor({nome:' Joao ',email:' JOAO@EXAMPLE.COM ',chavePix:' abc '},bad),{
    nome:'Joao',documento:null,creci:null,email:'joao@example.com',
    telefone:null,chave_pix:'abc'
  });
  erro(()=>validarCorretor({nome:''},bad),400);
  erro(()=>validarCorretor({nome:'A'.repeat(161)},bad),400);
  erro(()=>validarCorretor({nome:'Ana',email:'email-malformado'},bad),400);
  erro(()=>validarCorretor({nome:'Ana',telefone:1234},bad),400);
});

test('dividendos: percentuais precisos, imovel e participante unicos',()=>{
  const v=validarDividendo({
    imovel:' Gleba de Teste ',valorBase:'100000.25',
    participantes:[{nome:' Maria ',percentual:'33.3333'},{nome:'Pedro',percentual:'66.6667'}]
  },bad);
  assert.equal(v.imovel,'Gleba de Teste');
  assert.equal(v.valorBase,'100000.25');
  assert.equal(v.participantes[0].percentual,'33.3333');
  assert.equal(v.participantes[1].percentual,'66.6667');
  erro(()=>validarDividendo({
    imovel:'Teste',valorBase:100,
    participantes:[{nome:'Ana',percentual:60},{nome:'ana',percentual:40}]
  },bad),400);
  erro(()=>validarDividendo({
    imovel:'Teste',valorBase:100,
    participantes:[{nome:'Ana',percentual:70}]
  },bad),400);
  erro(()=>validarDividendo({
    imovel:'Teste',valorBase:'100.005',
    participantes:[{nome:'Ana',percentual:100}]
  },bad),400);
  erro(()=>validarDividendo({
    imovel:'Teste',valorBase:100,
    participantes:[{nome:'Ana',percentual:100.0001}]
  },bad),400);
  erro(()=>validarDividendo({
    imovel:'Teste',valorBase:100,
    participantes:[{nome:'Ana',percentual:100},{nome:'Bia',percentual:0.02}]
  },bad),400);
});

test('acordos: conciliar centavos e vencimento no ultimo dia do mes',()=>{
 const dados=validarAcordo({
   parcelaIds:[7,8],dataAcordo:'2026-11-11',valorAcordo:'1000.01',
   entradaValor:'100.00',quantidadeParcelas:3,primeiroVencimento:'2027-01-31'
 },bad);
 const parcelas=gerarParcelasAcordo(dados,99);
 assert.deepEqual(parcelas.map(p=>p.valor),['100.00','300.00','300.00','300.01']);
 assert.deepEqual(parcelas.map(p=>p.vencimento),['2026-11-11','2027-01-31','2027-02-28','2027-03-31']);
 assert.equal(addMonths('2028-01-31',1),'2028-02-29');
 erro(()=>validarAcordo({...dados,parcelaIds:[7,7]},bad),400);
 erro(()=>validarAcordo({...dados,parcelaIds:[7,8],entradaValor:'1001.00'},bad),400);
});
test('reajuste fixo: ciclos completos e centavos exatos',()=>{
 const regra={ativo:true,modalidade:'percentual_fixo',periodicidadeMeses:12,percentualBase:'10'};
 assert.deepEqual(valorReajustadoFixo('100.00','2026-01-31','2027-01-30',regra),{valor:'100.00',ciclos:0});
 assert.deepEqual(valorReajustadoFixo('100.00','2026-01-31','2027-01-31',regra),{valor:'110.00',ciclos:1});
 assert.deepEqual(valorReajustadoFixo('100.00','2026-01-31','2028-01-31',regra),{valor:'121.00',ciclos:2});
});
