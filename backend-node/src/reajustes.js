
import Decimal from 'decimal.js';
import { createHash } from 'node:crypto';
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
// Uma so fonte para a geracao inicial e a sincronizacao dos contratos.
// O percentual-base sempre representa o percentual de UM CICLO (ex.: 12 meses).
// Uma taxa nominal mensal pode ser informada, com conversao SIMPLES, sem capitalizacao mensal.
export function percentualPorCiclo(regra){
 const periodicidade=Number(regra?.periodicidadeMeses??12);
 if(!Number.isSafeInteger(periodicidade)||periodicidade<1||periodicidade>1200)
   throw new Error('Periodicidade de reajuste invalida');
 const percentual=regra?.taxaMensalReferencia==null
   ? D(regra?.percentualBase??0)
   : D(regra.taxaMensalReferencia).times(periodicidade);
 if(!percentual.isFinite()||percentual.lt(0)||percentual.gt(100))
   throw new Error('Percentual de reajuste por ciclo invalido');
 return percentual.toDecimalPlaces(4,Decimal.ROUND_HALF_UP).toFixed(4);
}
export function valorReajustadoFixo(original,contrato,vencimento,regra){
 if(!regra?.ativo||regra.modalidade!=='percentual_fixo')return {valor:cash(original),ciclos:0};
 const intervalo=Number(regra.periodicidadeMeses??12);
 const percentual=D(percentualPorCiclo(regra));
 const ciclos=Math.floor(mesCompleto(contrato,vencimento)/intervalo);
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

 // Simulacao e execucao usam a MESMA funcao: nao ha duas regras financeiras concorrentes.
 // Nenhum contrato existente e modificado sem uma previa validada pelo usuario.
 async function prepararSincronizacao(conn,empresa,empId,travar=false){
  const lock=travar?' FOR UPDATE':'';
  const [empRows]=await conn.execute('SELECT * FROM empreendimentos WHERE empresa_id=? AND id=?'+lock,[empresa,empId]);
  if(!empRows.length)throw bad(404,'Empreendimento nao encontrado');
  const regra=parse(empRows[0].reajuste_contratual_json);
  if(!regra.ativo)throw bad(409,'Correcao contratual desativada');
  if(regra.modalidade==='percentual_fixo')percentualPorCiclo(regra);
  const [vendas]=await conn.execute(
   "SELECT * FROM vendas WHERE empresa_id=? AND empreendimento_id=? AND status='ativa' ORDER BY id"+lock,
   [empresa,empId]
  );
  const updates=[],amostras=[],assinaturas=[],contratos=[],anos=new Map(),resumo={
   contratosAnalisados:vendas.length,contratosAlterados:0,parcelasAnalisadas:0,
   parcelasAlteradas:0,parcelasComValorAlterado:0,parcelasPreservadas:0,
   parcelasParciaisPreservadas:0,
   valorAtualTotal:'0.00',valorPropostoTotal:'0.00',diferencaTotal:'0.00',
   variacaoPercentual:'0.00',exigeConfirmacaoExtra:false
  };
  let totalAtual=D(0),totalProposto=D(0);
  for(const v of vendas){
   const regrasAtuais=parse(v.regras_json);
   const novasRegras={...regrasAtuais,reajusteContratual:regra};
   const mudouRegra=JSON.stringify(regrasAtuais.reajusteContratual??null)!==JSON.stringify(regra);
   const [parcelas]=await conn.execute(
    "SELECT id,vencimento,valor,valor_pago,valor_original,reajustes_aplicados,acordo_id,status,versao FROM parcelas "+
    "WHERE empresa_id=? AND venda_id=? ORDER BY id"+lock,[empresa,v.id]
   );
   // Contratos que ja receberam indice manual nao devem perder ajustes anteriores
   // ao trocar silenciosamente para percentual fixo.
   if(regra.modalidade==='percentual_fixo'){
    const [historicoIndice]=await conn.execute(
     'SELECT id FROM reajustes_venda WHERE empresa_id=? AND venda_id=? LIMIT 1',[empresa,v.id]
    );
    if(historicoIndice.length)throw bad(409,
     'A venda #'+v.id+' ja possui reajustes por indice. Revise o contrato antes de sincronizar a regra fixa.');
   }
   const mudancas=[];
   let atualContrato=D(0),propostoContrato=D(0),afetasContrato=0,preservadasContrato=0,parciaisContrato=0,maiorCiclo=0;
   for(const p of parcelas){
    assinaturas.push([v.id,p.id,p.vencimento,String(p.valor),String(p.valor_pago??'0'),
     String(p.valor_original??''),p.reajustes_aplicados,p.acordo_id,p.status,p.versao]);
    // Recebimentos parciais ainda abertos tambem sao historico financeiro:
    // nao recalcular seu principal nem modificar o saldo sem revisao individual.
    const parcial=D(p.valor_pago??0).gt(0);
    if(['paga','cancelada','em_acordo'].includes(p.status)||p.acordo_id!=null||parcial){
     resumo.parcelasPreservadas++;
     preservadasContrato++;
     if(parcial){resumo.parcelasParciaisPreservadas++;parciaisContrato++;}
     continue;
    }
    resumo.parcelasAnalisadas++;
    if(regra.modalidade==='percentual_fixo' && p.valor_original==null
       && Number(p.reajustes_aplicados??0)>0)
      throw bad(409,'Parcela #'+p.id+' sem valor original para recalculo seguro. Solicite revisao financeira.');
    const original=p.valor_original??p.valor;
    const novo=regra.modalidade==='percentual_fixo'
     ?valorReajustadoFixo(original,v.data_contrato,p.vencimento,regra)
     :{valor:cash(p.valor),ciclos:Number(p.reajustes_aplicados??0)};
    totalAtual=totalAtual.plus(D(p.valor));
    totalProposto=totalProposto.plus(D(novo.valor));
    atualContrato=atualContrato.plus(D(p.valor));
    propostoContrato=propostoContrato.plus(D(novo.valor));
    maiorCiclo=Math.max(maiorCiclo,novo.ciclos);
    const ano=String(p.vencimento).slice(0,4);
    const serie=anos.get(ano)??{ano,parcelas:0,alteradas:0,atual:D(0),proposto:D(0)};
    serie.parcelas++;
    serie.atual=serie.atual.plus(D(p.valor));
    serie.proposto=serie.proposto.plus(D(novo.valor));
    anos.set(ano,serie);
    const valorMudou=!D(novo.valor).eq(p.valor);
    const contagemMudou=regra.modalidade==='percentual_fixo'&&novo.ciclos!==Number(p.reajustes_aplicados??0);
    if(valorMudou||contagemMudou){
     mudancas.push({id:p.id,valor:novo.valor,original,ciclos:novo.ciclos});
     afetasContrato++;
     serie.alteradas++;
     resumo.parcelasAlteradas++;
     if(valorMudou)resumo.parcelasComValorAlterado++;
     if(amostras.length<12)amostras.push({
      vendaId:v.id,parcelaId:p.id,vencimento:p.vencimento,
      valorAtual:cash(p.valor),valorProposto:novo.valor
     });
    }
   }
   if(mudouRegra||mudancas.length)resumo.contratosAlterados++;
   const diferencaContrato=propostoContrato.minus(atualContrato);
   contratos.push({
    vendaId:v.id,dataContrato:String(v.data_contrato).slice(0,10),
    parcelasAlteradas:afetasContrato,parcelasPreservadas:preservadasContrato,
    parcelasParciaisPreservadas:parciaisContrato,maiorCiclo,
    regraAnterior:regrasAtuais.reajusteContratual??null,
    valorAtual:cash(atualContrato),valorProposto:cash(propostoContrato),
    diferenca:cash(diferencaContrato),
    variacaoPercentual:atualContrato.gt(0)
     ?diferencaContrato.div(atualContrato).times(100).toDecimalPlaces(2).toFixed(2):'0.00'
   });
   updates.push({v,novasRegras,mudouRegra,mudancas});
   assinaturas.push([v.id,v.versao,v.regras_json??null]);
  }
  resumo.valorAtualTotal=cash(totalAtual);
  resumo.valorPropostoTotal=cash(totalProposto);
  resumo.diferencaTotal=cash(totalProposto.minus(totalAtual));
  resumo.variacaoPercentual=totalAtual.gt(0)
   ?totalProposto.minus(totalAtual).div(totalAtual).times(100).toDecimalPlaces(2).toFixed(2):'0.00';
  // Saltos grandes exigem uma segunda confirmacao explicita; nunca automaticamente.
  resumo.exigeConfirmacaoExtra=totalAtual.gt(0)&&totalProposto.gt(totalAtual.times('1.5'));
  contratos.sort((a,b)=>D(b.diferenca).cmp(a.diferenca));
  const porAno=Array.from(anos.values())
   .sort((a,b)=>a.ano.localeCompare(b.ano))
   .map(a=>({ano:a.ano,parcelas:a.parcelas,parcelasAlteradas:a.alteradas,
    valorAtual:cash(a.atual),valorProposto:cash(a.proposto),
    diferenca:cash(a.proposto.minus(a.atual))}));
  const token=createHash('sha256').update(JSON.stringify({
   empresa,empId,regra,empVersao:empRows[0].versao,assinaturas
  })).digest('hex');
  return {resumo,amostras,contratos,porAno,token,updates,regra};
 }
 app.get('/api/empreendimentos/:id/reajuste-contratos/previa',exigirLogin,handler(async(req,res)=>{
  await exigirPermissao(req,['VENDAS_EDITAR']);
  const empresa=await empresaAutorizada(req),empId=id(req.params.id,bad);
  const simulacao=await prepararSincronizacao(db,empresa,empId);
  res.json({resumo:simulacao.resumo,amostras:simulacao.amostras,
   contratos:simulacao.contratos,porAno:simulacao.porAno,
   token:simulacao.token,modalidade:simulacao.regra.modalidade,
   percentualPorCiclo:simulacao.regra.modalidade==='percentual_fixo'
    ?percentualPorCiclo(simulacao.regra):null});
 }));
 app.post('/api/empreendimentos/:id/reajuste-contratos',exigirLogin,handler(async(req,res)=>{
  await exigirPermissao(req,['VENDAS_EDITAR']);
  const empresa=await empresaAutorizada(req),empId=id(req.params.id,bad);
  const token=req.body?.tokenPrevia;
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))
   throw bad(400,'Confira a previa antes de confirmar a sincronizacao');
  const conn=await db.getConnection();
  try{
   await conn.beginTransaction();
   const simulacao=await prepararSincronizacao(conn,empresa,empId,true);
   if(simulacao.token!==token)
    throw bad(409,'Os contratos mudaram desde a previa. Atualize a simulacao e confira os valores');
   if(simulacao.resumo.exigeConfirmacaoExtra&&req.body?.confirmacaoExtra!=='REVISADO')
    throw bad(409,'O impacto financeiro elevado exige confirmacao adicional depois da revisao dos contratos');
   for(const {v,novasRegras,mudouRegra,mudancas} of simulacao.updates){
    const inad=novasRegras.inadimplencia==null?null:JSON.stringify(novasRegras.inadimplencia);
    if(mudouRegra){
     await conn.execute(
      'UPDATE vendas SET regras_json=?,atualizado_por_usuario_id=?,versao=versao+1,atualizado_em=UTC_TIMESTAMP() WHERE id=? AND empresa_id=?',
      [JSON.stringify(novasRegras),req.usuario.id,v.id,empresa]
     );
    }
    for(const p of mudancas){
     await conn.execute(
      'UPDATE parcelas SET valor=?,valor_original=?,reajustes_aplicados=?,regras_inadimplencia_json=?,versao=versao+1,atualizado_em=UTC_TIMESTAMP() WHERE empresa_id=? AND id=?',
      [p.valor,p.original,p.ciclos,inad,empresa,p.id]
     );
    }
    if(mudouRegra||mudancas.length){
     await conn.execute(
      "INSERT INTO auditoria_operacional (empresa_id,usuario_id,entidade,entidade_id,acao,detalhes,criado_em) "+
      "VALUES (?,?,'VENDA',?,'REAJUSTE_SINCRONIZADO_DO_EMPREENDIMENTO',?,UTC_TIMESTAMP())",
      [empresa,req.usuario.id,v.id,JSON.stringify({
       regraAnterior:parse(v.regras_json).reajusteContratual??null,
       regraNova:simulacao.regra,parcelasAlteradas:mudancas.length
      })]
     );
    }
   }
   await conn.commit();
   res.json(simulacao.resumo);
  }catch(e){await conn.rollback();throw e}finally{conn.release()}
 }));
}
