
import Decimal from 'decimal.js';
const D=x=>new Decimal(x??0);
const cash=x=>D(x).toDecimalPlaces(2,Decimal.ROUND_HALF_UP).toFixed(2);
const id=(v,bad)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<1)throw bad(400,'ID invalido');return n};
const date=(v,bad)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw bad(400,'Data invalida');return v};
const money=(v,bad,positive=false)=>{if(!['number','string'].includes(typeof v)||!/^\d+(\.\d{1,2})?$/.test(String(v)))throw bad(400,'Valor invalido');const n=D(v);if(!n.isFinite()||(positive?n.lte(0):n.lt(0))||n.gt('99999999999999999.99'))throw bad(400,'Valor invalido');return cash(n)};
export function validarAcordo(b,bad){
 if(!b||!Array.isArray(b.parcelaIds)||b.parcelaIds.length<1||b.parcelaIds.length>300)throw bad(400,'Selecione parcelas');
 const ids=b.parcelaIds.map(x=>id(x,bad));if(new Set(ids).size!==ids.length)throw bad(400,'Parcela duplicada');
 const valorAcordo=money(b.valorAcordo,bad,true),entradaValor=money(b.entradaValor,bad);
 if(D(entradaValor).gt(valorAcordo))throw bad(400,'Entrada excede valor acordado');
 const quantidadeParcelas=id(b.quantidadeParcelas,bad);if(quantidadeParcelas>360)throw bad(400,'Muitas parcelas');
 if(b.observacoes!=null&&(typeof b.observacoes!=='string'||b.observacoes.length>5000))throw bad(400,'Observacoes invalidas');
 return {ids,valorAcordo,entradaValor,quantidadeParcelas,dataAcordo:date(b.dataAcordo,bad),primeiroVencimento:date(b.primeiroVencimento,bad),observacoes:b.observacoes?.trim()||null};
}
export function addMonths(iso,n){
 const [y,m,d]=iso.split('-').map(Number),k=y*12+m-1+n,year=Math.floor(k/12),month=k%12+1;
 const last=new Date(Date.UTC(year,month,0)).getUTCDate();
 return String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(Math.min(d,last)).padStart(2,'0');
}
export function gerarParcelasAcordo(b,acordoId){
 const saldo=D(b.valorAcordo).minus(b.entradaValor);
 const base=saldo.div(b.quantidadeParcelas).toDecimalPlaces(2,Decimal.ROUND_DOWN);
 const out=[];let alocado=D(0);
 if(D(b.entradaValor).gt(0))out.push({descricao:'Entrada do acordo #'+acordoId,numero:1,total:1,vencimento:b.dataAcordo,valor:cash(b.entradaValor)});
 for(let n=1;n<=b.quantidadeParcelas;n++){
  const v=n===b.quantidadeParcelas?saldo.minus(alocado):base;alocado=alocado.plus(v);
  out.push({descricao:'Acordo #'+acordoId,numero:n,total:b.quantidadeParcelas,vencimento:addMonths(b.primeiroVencimento,n-1),valor:cash(v)});
 }
 if(!alocado.eq(saldo))throw new Error('Falha de distribuicao do saldo');
 return out;
}
const dto=(a,pars)=>({
 id:a.id,vendaId:a.venda_id,dataAcordo:a.data_acordo,valorOriginal:a.valor_original,valorAcordo:a.valor_acordo,
 entradaValor:a.entrada_valor,quantidadeParcelas:a.quantidade_parcelas,primeiroVencimento:a.primeiro_vencimento,
 observacoes:a.observacoes,status:a.status,parcelasOrigemIds:pars.filter(p=>p.acordo_papel==='origem').map(p=>p.id),
 parcelasCobrancaIds:pars.filter(p=>p.acordo_papel==='cobranca').map(p=>p.id)
});
export function registerAcordos(app,{db,exigirLogin,empresaAutorizada,exigirPermissao,handler,bad}){
 const buscarVenda=async(conn,empresa,venda,lock=false)=>{
  const [r]=await conn.execute('SELECT * FROM vendas WHERE empresa_id=? AND id=?'+(lock?' FOR UPDATE':''),[empresa,venda]);
  if(!r.length)throw bad(404,'Venda nao encontrada');return r[0];
 };
 const parsAcordo=async(conn,empresa,acordo)=>{
  const [r]=await conn.execute('SELECT id,acordo_papel FROM parcelas WHERE empresa_id=? AND acordo_id=? ORDER BY vencimento,id',[empresa,acordo]);return r;
 };
 app.get('/api/vendas/:id/acordos',exigirLogin,handler(async(req,res)=>{
  await exigirPermissao(req,['VENDAS_VISUALIZAR','VENDAS_EDITAR','FINANCEIRO_VISUALIZAR','RECEBIMENTOS_VISUALIZAR']);
  const emp=await empresaAutorizada(req),venda=id(req.params.id,bad);await buscarVenda(db,emp,venda);
  const [rows]=await db.execute('SELECT * FROM acordos WHERE empresa_id=? AND venda_id=? ORDER BY data_acordo DESC,id DESC',[emp,venda]);
  const out=[];for(const a of rows)out.push(dto(a,await parsAcordo(db,emp,a.id)));res.json(out);
 }));
 app.post('/api/vendas/:id/acordos',exigirLogin,handler(async(req,res)=>{
  await exigirPermissao(req,['VENDAS_EDITAR']);
  const emp=await empresaAutorizada(req),vendaId=id(req.params.id,bad),b=validarAcordo(req.body,bad);
  const c=await db.getConnection();try{
   await c.beginTransaction();
   const venda=await buscarVenda(c,emp,vendaId,true);
   if(venda.status!=='ativa')throw bad(409,'Venda nao esta ativa');
   const originais=[];
   for(const pId of [...b.ids].sort((a,b)=>a-b)){
    const [rows]=await c.execute('SELECT * FROM parcelas WHERE empresa_id=? AND id=? FOR UPDATE',[emp,pId]);
    const p=rows[0];if(!p||Number(p.venda_id)!==vendaId)throw bad(400,'Parcela nao pertence ao contrato');
    if(['paga','cancelada','em_acordo'].includes(String(p.status).toLowerCase())||p.acordo_id!=null||D(p.valor_pago).gt(0))throw bad(409,'Parcela indisponivel');
    const [mov]=await c.execute('SELECT id FROM movimentos WHERE empresa_id=? AND parcela_id=? LIMIT 1',[emp,pId]);
    if(mov.length)throw bad(409,'Parcela com historico nao pode ser renegociada diretamente');
    originais.push(p);
   }
   const original=cash(originais.reduce((s,p)=>s.plus(p.valor),D(0)));
   const [ins]=await c.execute("INSERT INTO acordos (empresa_id,venda_id,cliente_id,data_acordo,valor_original,valor_acordo,entrada_valor,quantidade_parcelas,primeiro_vencimento,observacoes,status,criado_por_usuario_id,criado_em) VALUES (?,?,?,?,?,?,?,?,?,?,'ativo',?,UTC_TIMESTAMP())",
    [emp,vendaId,venda.cliente_id,b.dataAcordo,original,b.valorAcordo,b.entradaValor,b.quantidadeParcelas,b.primeiroVencimento,b.observacoes,req.usuario.id]);
   for(const p of originais)await c.execute("UPDATE parcelas SET status='em_acordo',acordo_id=?,acordo_papel='origem',versao=versao+1,atualizado_em=UTC_TIMESTAMP() WHERE empresa_id=? AND id=?",[ins.insertId,emp,p.id]);
   const rules=typeof venda.regras_json==='string'?JSON.parse(venda.regras_json):venda.regras_json||{};
   const inad=rules.inadimplencia==null?null:JSON.stringify(rules.inadimplencia);
   for(const p of gerarParcelasAcordo(b,ins.insertId)){
    await c.execute("INSERT INTO parcelas (empresa_id,venda_id,empreendimento_id,unidade_id,cliente_id,origem_tipo,origem_descricao,numero,total_parcelas,vencimento,valor,valor_original,reajustes_aplicados,acordo_id,acordo_papel,valor_pago,status,regras_inadimplencia_json,versao,criado_em,atualizado_em) VALUES (?,?,?,?,?,'acordo',?,?,?,?,?,?,0,?,'cobranca',0,'pendente',?,0,UTC_TIMESTAMP(),UTC_TIMESTAMP())",
     [emp,vendaId,venda.empreendimento_id,venda.unidade_id,venda.cliente_id,p.descricao,p.numero,p.total,p.vencimento,p.valor,p.valor,ins.insertId,inad]);
   }
   await c.execute("INSERT INTO auditoria_operacional (empresa_id,usuario_id,entidade,entidade_id,acao,criado_em,detalhes) VALUES (?,?,'VENDA',?,'ACORDO_CRIADO',UTC_TIMESTAMP(),?)",[emp,req.usuario.id,vendaId,'Acordo #'+ins.insertId]);
   const [salvos]=await c.execute('SELECT * FROM acordos WHERE empresa_id=? AND id=?',[emp,ins.insertId]);
   const vinculados=await parsAcordo(c,emp,ins.insertId);
   await c.commit();res.status(201).json(dto(salvos[0],vinculados));
  }catch(e){await c.rollback();throw e}finally{c.release()}
 }));
}
