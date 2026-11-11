import test from 'node:test';
import assert from 'node:assert/strict';
import { validarCorretor } from '../src/corretores.js';
import { validarDividendo } from '../src/dividendos.js';

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
