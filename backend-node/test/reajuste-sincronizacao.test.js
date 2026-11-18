import test from 'node:test';
import assert from 'node:assert/strict';
import { registerReajustes } from '../src/reajustes.js';

const regra = { ativo:true,modalidade:'percentual_fixo',periodicidadeMeses:12,
 percentualBase:11.88,taxaMensalReferencia:0.99 };
const erro = (status, message) => Object.assign(new Error(message),{status});

function fake({ comIndice=false, semBase=false } = {}) {
 const emp={id:1,empresa_id:3,versao:2,reajuste_contratual_json:JSON.stringify(regra)};
 const venda={id:9,empresa_id:3,empreendimento_id:1,data_contrato:'2025-01-07',
  versao:1,regras_json:JSON.stringify({inadimplencia:{moraPct:2}})};
 const parcelas=[
  {id:1,vencimento:'2025-02-07',valor:'100.00',valor_original:'100.00',
   reajustes_aplicados:0,acordo_id:null,status:'paga',versao:0},
  {id:2,vencimento:'2026-01-07',valor:'3700.00',valor_original:semBase?null:'3700.00',
   reajustes_aplicados:semBase?1:0,acordo_id:null,status:'pendente',versao:0},
  {id:3,vencimento:'2027-01-07',valor:'3700.00',valor_original:'3700.00',
   reajustes_aplicados:0,acordo_id:null,status:'pendente',versao:0}
 ];
 const comandos=[];
 const conn={
  async execute(sql,args=[]){
   comandos.push({sql,args});
   if(sql.startsWith('SELECT * FROM empreendimentos'))return [[{...emp}]];
   if(sql.startsWith('SELECT * FROM vendas'))return [[{...venda}]];
   if(sql.startsWith('SELECT id,vencimento,valor'))return [parcelas.map(p=>({...p}))];
   if(sql.startsWith('SELECT id FROM reajustes_venda'))return [comIndice?[{id:33}]:[]];
   if(sql.startsWith('UPDATE vendas SET')){
    venda.regras_json=args[0];venda.versao++;
    return [{affectedRows:1}];
   }
   if(sql.startsWith('UPDATE parcelas SET')){
    const p=parcelas.find(p=>p.id===args[6]);
    assert.ok(p);
    p.valor=args[0];p.valor_original=args[1];p.reajustes_aplicados=args[2];p.versao++;
    return [{affectedRows:1}];
   }
   return [{}];
  },
  async beginTransaction(){comandos.push({sql:'BEGIN'});},
  async commit(){comandos.push({sql:'COMMIT'});},
  async rollback(){comandos.push({sql:'ROLLBACK'});},
  release(){}
 };
 const db={...conn,async getConnection(){return conn;}};
 const routes={get:{},post:{}},app={
  get:(path,_auth,handler)=>routes.get[path]=handler,
  post:(path,_auth,handler)=>routes.post[path]=handler
 };
 registerReajustes(app,{db,
  exigirLogin:()=>{},empresaAutorizada:async()=>3,exigirPermissao:async()=>{},
  handler:x=>x,bad:erro
 });
 async function chamar(method,path,tokenPrevia){
  const req={params:{id:'1'},usuario:{id:4},body:{tokenPrevia}};
  const res={json:value=>value};
  return routes[method][path](req,res);
 }
 return {chamar,comandos,parcelas,venda};
}

const endpoint='/api/empreendimentos/:id/reajuste-contratos';
test('simula sem mutacao, confirma e preserva pagamentos ja realizados',async()=>{
 const f=fake();
 const p=await f.chamar('get',endpoint+'/previa');
 assert.equal(p.percentualPorCiclo,'11.8800');
 assert.equal(p.resumo.contratosAlterados,1);
 assert.equal(p.resumo.parcelasAlteradas,2);
 assert.equal(p.resumo.parcelasPreservadas,1);
 assert.equal(p.amostras[0].valorProposto,'4139.56');
 assert.equal(p.amostras[1].valorProposto,'4631.34');
 assert.ok(!f.comandos.some(x=>x.sql.startsWith('UPDATE')));
 const result=await f.chamar('post',endpoint,p.token);
 assert.equal(result.parcelasAlteradas,2);
 assert.equal(f.parcelas[0].valor,'100.00');
 assert.equal(f.parcelas[1].valor,'4139.56');
 assert.equal(f.parcelas[2].valor,'4631.34');
 assert.ok(f.comandos.some(x=>x.sql.includes('INSERT INTO auditoria_operacional')));
 const segunda=await f.chamar('get',endpoint+'/previa');
 assert.equal(segunda.resumo.contratosAlterados,0,'repetir aplicacao deve ser idempotente');
});

test('previa desatualizada rejeitada com HTTP 409 antes das escritas',async()=>{
 const f=fake();
 const p=await f.chamar('get',endpoint+'/previa');
 f.parcelas[1].valor='3701.00';f.parcelas[1].versao=1;
 await assert.rejects(
  ()=>f.chamar('post',endpoint,p.token),
  x=>x.status===409
 );
 assert.equal(f.comandos.filter(x=>x.sql.startsWith('UPDATE')).length,0);
 assert.ok(f.comandos.some(x=>x.sql==='ROLLBACK'));
});

test('nao remove reajuste por indice anterior nem recalcula sem valor original',async()=>{
 await assert.rejects(
  ()=>fake({comIndice:true}).chamar('get',endpoint+'/previa'),
  x=>x.status===409
 );
 await assert.rejects(
  ()=>fake({semBase:true}).chamar('get',endpoint+'/previa'),
  x=>x.status===409
 );
});
