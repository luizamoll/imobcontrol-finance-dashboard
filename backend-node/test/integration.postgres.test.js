import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const active = process.env.TEST_POSTGRES_INTEGRATION === '1';
const root = fileURLToPath(new URL('../../', import.meta.url));
const backend = fileURLToPath(new URL('../', import.meta.url));
const url = process.env.DATABASE_URL || 'postgresql://postgres:imob-ci-password@127.0.0.1:5432/imob_node_ci';
const base = 'http://127.0.0.1:31819';

async function seedSchema(client) {
  const dir = resolve(root,'backend/src/main/resources/db/migration');
  const files = (await readdir(dir)).filter(f=>/^V\d+__.*\.sql$/.test(f))
    .sort((a,b)=>Number(/^V(\d+)/.exec(a)[1])-Number(/^V(\d+)/.exec(b)[1]));
  assert.ok(files.length>=22);
  for(const file of files) {
    try { await client.query(await readFile(resolve(dir,file),'utf8')); }
    catch(e) { e.message = file + ': ' + e.message; throw e; }
  }
  await client.query(await readFile(resolve(backend,'sql/01_node_sessoes_postgres.sql'),'utf8'));
}
const api = (path, opts={}) => fetch(base+path, {...opts,redirect:'manual'});
const post = (path, headers, body) => api(path, {
  method:'POST',headers,body:JSON.stringify(body)
});
test('Node no PostgreSQL original: login, venda, recebimento historico e estorno', {skip:!active}, async()=>{
  const client = new pg.Client({connectionString:url});
  let child;
  try{
    await client.connect();
    await seedSchema(client);
    const company=(await client.query(
      "INSERT INTO empresas (nome,slug,ativa) VALUES ('Empresa QA','empresa-qa',TRUE) RETURNING id"
    )).rows[0].id;
    const hash=await bcrypt.hash('Integracao@2026',10);
    await client.query(
      'INSERT INTO usuarios (empresa_id,nome,email,senha_hash,perfil,ativo,senha_definida,email_verificado) '+
      "VALUES ($1,'Usuario QA','teste@example.invalid',$2,'ADMIN',TRUE,TRUE,TRUE)",
      [company,hash]
    );
    child=spawn(process.execPath,['src/index.js'],{
      cwd:backend,env:{...process.env,NODE_ENV:'test',PORT:'31819',DATABASE_URL:url,
      COOKIE_SECURE:'false',SESSION_SECRET:'ChaveDeTestePG_0123456789_abcdefghijklmnop'},
      stdio:['ignore','pipe','pipe']
    });
    let logs='';
    child.stderr.on('data',b=>logs+=String(b).slice(0,1800));
    child.stdout.on('data',b=>logs+=String(b).slice(0,500));
    let running=false;
    for(let i=0;i<60;i++){
      if(child.exitCode!==null)throw Error('Servidor encerrou: '+logs);
      try{if((await api('/health')).ok){running=true;break;}}catch{}
      await sleep(200);
    }
    assert.ok(running,logs);
    const csrfResult=await api('/api/auth/csrf');
    assert.equal(csrfResult.status,200);
    const csrf=await csrfResult.json();
    const csrfCookie=csrfResult.headers.get('set-cookie')?.split(';')[0];
    const login=await post('/api/auth/login',
      {'content-type':'application/json',cookie:csrfCookie},
      {email:'teste@example.invalid',senha:'Integracao@2026'});
    assert.equal(login.status,200,'login: '+logs);
    const session=login.headers.get('set-cookie')?.split(';')[0];
    assert.equal((await login.json()).perfil,'ADMIN');
    const cookies=csrfCookie+'; '+session;
    const headers={'content-type':'application/json',cookie:cookies,'X-CSRF-TOKEN':csrf.token};
    const customer=await post('/api/clientes',headers,
      {nome:'Cliente QA',cpf:'529.982.247-25'});
    assert.equal(customer.status,201);
    const cliente=await customer.json();
    const empreendimentoResult=await post('/api/empreendimentos',headers,{
      nome:'Jardim QA',tipo:'loteamento',areaTotal:'100.0000',
      unidadesPrevistas:1,valorTotal:'1000.00',socioPct:'25.0000',
      empresaPct:'75.0000',corretorPct:'5.0000',
      aliquotaTributaria:'2.0000',repasseComissaoPct:'50.0000',
      comissaoSobreAcrescimos:false,status:'ativo',
      inadimplencia:{jurosAtivo:true,jurosTipo:'mensal',jurosPctMes:2,moraAtiva:true,moraPct:1}
    });
    assert.equal(empreendimentoResult.status,201);
    const empreendimento=await empreendimentoResult.json();
    const unitResult=await post('/api/unidades',headers,{
      empreendimentoId:empreendimento.id,quadraId:null,
      numero:'01',unidade:'Lote 01',area:'100.0000',
      valorVenda:'1000.00',status:'disponivel',regras:null
    });
    assert.equal(unitResult.status,201);
    const unit=await unitResult.json();
    const saleResult=await post('/api/vendas',headers,{
      empreendimentoId:empreendimento.id,unidadeId:unit.id,clienteId:cliente.id,
      valorTotal:'1000.00',valorImovel:'950.00',corretagemValor:'50.00',
      corretagemCompoeValorContrato:true,dataContrato:'2026-09-01',
      corretorNome:'Corretor QA',corretorPct:5,repasseComissaoPct:50,
      comissaoSobreAcrescimos:false,
      composicao:[
        {tipo:'sinal',valor:'100.00',parcelas:1,primeiroVencimento:'2026-10-01'},
        {tipo:'parcelas',valor:'450.00',parcelas:2,primeiroVencimento:'2026-11-01'}
      ]
    });
    assert.equal(saleResult.status,201);
    const sale=await saleResult.json();
    const parcelas=(await client.query(
      'SELECT id FROM parcelas WHERE venda_id=$1 AND empresa_id=$2 ORDER BY vencimento',
      [sale.id,company]
    )).rows;
    assert.equal(parcelas.length,3);
    const parcelaId=parcelas[0].id;
    const payment=await post('/api/parcelas/'+parcelaId+'/receber',headers,{
      data:'2026-10-31',valorRecebido:null
    });
    assert.equal(payment.status,201);
    const pago=await payment.json();
    assert.equal(pago.valorRecebido,'103.00');
    assert.equal(pago.data,'2026-10-31');
    const again=await post('/api/parcelas/'+parcelaId+'/receber',headers,{
      data:'2026-10-31'
    });
    assert.equal(again.status,409);
    const statusAntes=(await client.query(
      'SELECT data_pagamento::text AS data FROM parcelas WHERE id=$1',[parcelaId]
    )).rows[0];
    assert.equal(statusAntes.data,'2026-10-31');
    const rollback=await post('/api/parcelas/'+parcelaId+'/reverter',headers,{});
    assert.equal(rollback.status,204);
    const history=(await client.query(
      'SELECT estornado FROM movimentos WHERE parcela_id=$1',[parcelaId]
    )).rows;
    assert.equal(history.length,1);
    assert.equal(history[0].estornado,true);
    assert.equal((await api('/api/clientes')).status,401);
  }finally{
    if(child)child.kill();
    await client.end().catch(()=>{});
  }
});
