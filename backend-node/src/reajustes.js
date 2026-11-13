
import Decimal from 'decimal.js';
const D=v=>new Decimal(v??0),cash=v=>D(v).toDecimalPlaces(2,Decimal.ROUND_HALF_UP).toFixed(2);
const id=(v,bad)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<1)throw bad(400,'ID invalido');return n};
const data=(v,bad)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw bad(400,'Data invalida');return v};
const parse=v=>v?(typeof v==='string'?JSON.parse(v):v):{};
function pct(v,bad) {
 if(!['string','number'].includes(typeof v)||!/^\d+(\.\d{1,4})?$/.test(String(v)))throw bad(400,'Percentual invalido');
 const p=D(v);if(!p.isFinite()||p.lt(0)||p.gt(100))throw bad(400,'Percentual invalido');return p.toFixed(4);
}
function mesCompleto(from,to){
 const a=from.slice(0,10).split('-').map(Number),b=to.slice(0,10).split('-').map(Number);
 let meses=(b[0]-a[0])*12+b[1]-a[1];if(b[2]<a[2])meses--;return Math.max(0,meses);
}
export function valorReajustadoFixo(original,contrato,vencimento,regra){
 if(!regra?.ativo||regra.modalidade!=='percentual_fixo')return {valor:cash(original),ciclos:0};
 const intervalo=Math.max(1,Number(regra.periodicidadeMeses??12));
 const ciclos=Math.floor(mesCompleto(contrato,vencimento)/intervalo);
 const percentual=D(regra.percentualBase??0);
 if(ciclos===0||percentual.lte(0))return {valor:cash(original),ciclos};
 return {valor:cash(D(original).times(D(1).plus(percentual.div(100)).pow(ciclos))),ciclos};
}
export function registerReajustes(app,{db,exigirLogin,empresaAutorizada,exigirPermissao,handler,bad}){
 const selectVenda=async(conn,empresa,venda,lock=false)=>{
  const [rows]=await conn.execute('SELECT * FROM vendas WHERE empresa_id=? AND id=?'+(lock?' FOR UPDATE':''),[empresa,venda]);
  if(!rows.length)throw bad(404,'Venda nao encontrada');return rows[0];
 };
 const dto=r=>({id:r.id,dataReferencia:r.data_referencia,percentualAplicado:r.percentual_aplicado,indiceReferencia:r.indice_referencia,criadoEm:typeof r.criado_em==='string'?r.criado_em.replace(' ','T'):r.criado_em});
 const auditar=(conn,empresa,usuario,venda,acao)=>conn.execute("INSERT INTO auditoria_operacional (empresa_id,usuario_id,entidade,entidade_id,acao,criado_em) VALUES (?,?,'VENDA',?,?,UTC_TIMESTAMP())",[empresa,usuario,venda,acao]);
 app.get('/api/vendas/:id/reajustes',exigirLogin,handler(async(req,res)=>{
  await exigirPermissao(req,['VENDAS_VISUALIZAR','VENDAS_EDITAR','FINANCEIRO_VISUALIZAR','RELATORIOS_VISUALIZAR']);
  const empresa=await empresaAutorizada(req),venda=id(req.params.id,bad);await selectVenda(db,empresa,venda);
  const [rows]=await db.execute('SELECT * FROM reajustes_venda WHERE empresa_id=? AND venda_id=? ORDER BY data_referencia DESC,id DESC',[empresa,venda]);res.json(rows.map(dto));
 }));
 app.post('/api/vendas/:id/reajustes',exigirLogin,handler(async(req,res)=>{
  await exigirPermissao(req,['VENDAS_EDITAR']);const empresa=await empresaAutorizada(req),vendaId=id(req.params.id,bad);
  const ref=data(req.body?.dataReferencia,bad),indice=pct(req.body?.percentualIndice,bad);
  if(D(indice).lte(0))throw bad(400,'Percentual deve ser positivo');
  const conn=await db.getConnection();try{
   await conn.beginTransaction();
   const venda=await selectVenda(conn,empresa,vendaId,true),regra=parse(venda.regras_json).reajusteContratual;
   if(!regra?.ativo)throw bad(409,'Contrato sem reajuste ativo');
   if(regra.modalidade==='percentual_fixo')throw bad(409,'Reajuste fixo e automatico');
   if(mesCompleto(venda.data_contrato,ref)<Math.max(1,Number(regra.periodicidadeMeses??12)))throw bad(400,'Ciclo contratual ainda nao iniciou');
   const [ja]=await conn.execute('SELECT id FROM reajustes_venda WHERE empresa_id=? AND venda_id=? AND data_referencia=? LIMIT 1',[empresa,vendaId,ref]);
   if(ja.length)throw bad(409,'Reajuste ja registrado nesta data');
   let aplicado=D(indice);
   if(regra.modalidade==='maior_entre')aplicado=Decimal.max(aplicado,D(regra.percentualBase??0));
   const fator=D(1).plus(aplicado.div(100));
   const [abertas]=await conn.execute("SELECT id,valor,valor_original,reajustes_aplicados FROM parcelas WHERE empresa_id=? AND venda_id=? AND acordo_id IS NULL AND status NOT IN ('paga','cancelada','em_acordo') AND vencimento>=? FOR UPDATE",[empresa,vendaId,ref]);
   for(const p of abertas)await conn.execute(
    'UPDATE parcelas SET valor=?,valor_original=COALESCE(valor_original,valor),reajustes_aplicados=COALESCE(reajustes_aplicados,0)+1,versao=versao+1,atualizado_em=UTC_TIMESTAMP() WHERE empresa_id=? AND id=?',
    [cash(D(p.valor).times(fator)),empresa,p.id]);
   const [insert]=await conn.execute(
    'INSERT INTO reajustes_venda (empresa_id,venda_id,data_referencia,percentual_aplicado,indice_referencia,criado_por_usuario_id,criado_em) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP())',
    [empresa,vendaId,ref,aplicado.toFixed(4),regra.indiceReferencia?.slice(0,80)||null,req.usuario.id]);
   await auditar(conn,empresa,req.usuario.id,vendaId,'REAJUSTE_CONTRATUAL');
   const [rows]=await conn.execute('SELECT * FROM reajustes_venda WHERE empresa_id=? AND id=?',[empresa,insert.insertId]);
   await conn.commit();res.status(201).json(dto(rows[0]));
  }catch(e){await conn.rollback();throw e}finally{conn.release()}
 }));
 app.post('/api/empreendimentos/:id/reajuste-contratos',exigirLogin,handler(async(req,res)=>{
  await exigirPermissao(req,['VENDAS_EDITAR']);
  const empresa=await empresaAutorizada(req),empId=id(req.params.id,bad),conn=await db.getConnection();
  try{
   await conn.beginTransaction();
   const [empRows]=await conn.execute('SELECT * FROM empreendimentos WHERE empresa_id=? AND id=? FOR UPDATE',[empresa,empId]);
   if(!empRows.length)throw bad(404,'Empreendimento nao encontrado');
   const regra=parse(empRows[0].reajuste_contratual_json);
   if(!regra.ativo)throw bad(409,'Correcao contratual desativada');
   const [vendas]=await conn.execute("SELECT * FROM vendas WHERE empresa_id=? AND empreendimento_id=? AND status='ativa' ORDER BY id FOR UPDATE",[empresa,empId]);
   for(const v of vendas){
    const antigas=parse(v.regras_json);
    antigas.reajusteContratual=regra;
    await conn.execute('UPDATE vendas SET regras_json=?,atualizado_por_usuario_id=?,versao=versao+1,atualizado_em=UTC_TIMESTAMP() WHERE id=? AND empresa_id=?',[JSON.stringify(antigas),req.usuario.id,v.id,empresa]);
    const [abertas]=await conn.execute("SELECT id,vencimento,valor_original,valor,acordo_id,status FROM parcelas WHERE empresa_id=? AND venda_id=? AND status NOT IN ('paga','cancelada','em_acordo') FOR UPDATE",[empresa,v.id]);
    for(const p of abertas){
     const inad=antigas.inadimplencia==null?null:JSON.stringify(antigas.inadimplencia);
     if(p.acordo_id!=null){await conn.execute('UPDATE parcelas SET regras_inadimplencia_json=? WHERE empresa_id=? AND id=?',[inad,empresa,p.id]);continue;}
     if(regra.modalidade==='percentual_fixo'){
      const valorOriginal=p.valor_original??p.valor;
      const novo=valorReajustadoFixo(valorOriginal,v.data_contrato,p.vencimento,regra);
      await conn.execute('UPDATE parcelas SET valor=?,valor_original=?,reajustes_aplicados=?,regras_inadimplencia_json=?,versao=versao+1,atualizado_em=UTC_TIMESTAMP() WHERE empresa_id=? AND id=?',
       [novo.valor,valorOriginal,novo.ciclos,inad,empresa,p.id]);
     }else{
      await conn.execute('UPDATE parcelas SET regras_inadimplencia_json=? WHERE empresa_id=? AND id=?',[inad,empresa,p.id]);
     }
    }
    await auditar(conn,empresa,req.usuario.id,v.id,'REAJUSTE_SINCRONIZADO_DO_EMPREENDIMENTO');
   }
   await conn.commit();res.json(vendas.length);
  }catch(e){await conn.rollback();throw e}finally{conn.release()}
 }));
}
