
import Decimal from 'decimal.js';
import { normalizarVenda, parcelasDaVenda } from './vendas-write.js';
const D=v=>new Decimal(v??0);
const parse=v=>v?(typeof v==='string'?JSON.parse(v):v):{};
const id=(x,bad)=>{const v=Number(x);if(!Number.isSafeInteger(v)||v<1)throw bad(400,'ID invalido');return v};
const dt=v=>typeof v==='string'?v.replace(' ','T'):v;
const dto=r=>({id:r.id,usuarioId:r.usuario_id,usuarioNome:r.usuario_nome||'Usuario',
  justificativa:r.justificativa,versaoAnterior:r.versao_anterior,versaoNova:r.versao_nova,
  resumoAnterior:r.resumo_anterior,resumoNovo:r.resumo_novo,criadoEm:dt(r.criado_em)});
export function registerRevisoes(app,{db,exigirLogin,empresaAutorizada,exigirPermissao,handler,bad}){
 const venda=async(conn,empresa,vId,lock=false)=>{
  const [rows]=await conn.execute('SELECT v.*,c.nome AS comprador_nome FROM vendas v JOIN clientes c ON c.id=v.cliente_id AND c.empresa_id=v.empresa_id WHERE v.empresa_id=? AND v.id=?'+(lock?' FOR UPDATE':''),[empresa,vId]);
  if(!rows.length)throw bad(404,'Venda nao encontrada');return rows[0];
 };
 async function elegibilidade(conn,empresa,v,preloaded=false){
  const [h]=await conn.execute('SELECT id,estornado FROM movimentos WHERE venda_id=? AND empresa_id=?',[v.id,empresa]);
  if(!h.length)return {possuiHistoricoRecebimentos:false,permitido:false,motivo:'Sem historico de recebimentos; use Editar venda'};
  if(String(v.status).toLowerCase()!=='ativa')return {possuiHistoricoRecebimentos:true,permitido:false,motivo:'Somente vendas ativas'};
  if(h.some(x=>!Number(x.estornado)))return {possuiHistoricoRecebimentos:true,permitido:false,motivo:'Estorne todos os recebimentos ativos'};
  for(const table of ['acordos','reajustes_venda']){
   const [r]=await conn.execute('SELECT id FROM '+table+' WHERE venda_id=? AND empresa_id=? LIMIT 1',[v.id,empresa]);
   if(r.length)return {possuiHistoricoRecebimentos:true,permitido:false,motivo:'Ha acordos ou reajustes; necessita analise financeira especifica'};
  }
  const [parcelas]=await conn.execute('SELECT id,status,valor_pago,acordo_id FROM parcelas WHERE empresa_id=? AND venda_id=?',[empresa,v.id]);
  if(parcelas.some(p=>D(p.valor_pago).gt(0)||p.acordo_id!=null||p.status==='paga')){
   return {possuiHistoricoRecebimentos:true,permitido:false,motivo:'Ha saldo pago ou parcela vinculada a acordo'};
  }
  return {possuiHistoricoRecebimentos:true,permitido:true,motivo:'Todos os pagamentos foram estornados; revisao permitida com justificativa'};
 }
 app.get('/api/vendas/:id/revisoes-financeiras/elegibilidade',exigirLogin,handler(async(req,res)=>{
  await exigirPermissao(req,['VENDAS_EDITAR']);const empresa=await empresaAutorizada(req),vId=id(req.params.id,bad);
  res.json(await elegibilidade(db,empresa,await venda(db,empresa,vId)));
 }));
 app.get('/api/vendas/:id/revisoes-financeiras',exigirLogin,handler(async(req,res)=>{
  await exigirPermissao(req,['VENDAS_HISTORICO_VISUALIZAR']);const empresa=await empresaAutorizada(req),vId=id(req.params.id,bad);
  await venda(db,empresa,vId);
  const [rows]=await db.execute('SELECT r.*,u.nome AS usuario_nome FROM revisoes_financeiras_vendas r LEFT JOIN usuarios u ON u.id=r.usuario_id WHERE r.empresa_id=? AND r.venda_id=? ORDER BY r.id DESC',[empresa,vId]);
  res.json(rows.map(dto));
 }));
 app.post('/api/vendas/:id/revisoes-financeiras',exigirLogin,handler(async(req,res)=>{
  await exigirPermissao(req,['VENDAS_EDITAR']);
  const empresa=await empresaAutorizada(req),vId=id(req.params.id,bad),body=req.body||{};
  if(body.confirmarRevisao!==true)throw bad(400,'Confirme a revisao financeira');
  if(typeof body.justificativa!=='string'||body.justificativa.trim().length<15||body.justificativa.trim().length>1000)throw bad(400,'Informe uma justificativa com 15 a 1000 caracteres');
  const novo=normalizarVenda(body.venda,bad);
  if(!Number.isSafeInteger(body.venda?.versao)||body.venda.versao<0)throw bad(400,'Versao da venda invalida');
  const conn=await db.getConnection();try{
   await conn.beginTransaction();
   const antiga=await venda(conn,empresa,vId,true);
   if(Number(antiga.versao)!==body.venda.versao)throw bad(409,'Venda alterada em outra sessao');
   if(Number(antiga.cliente_id)!==novo.clienteId||Number(antiga.empreendimento_id)!==novo.empreendimentoId||
      Number(antiga.unidade_id)!==novo.unidadeId||String(antiga.data_contrato)!==novo.dataContrato){
    throw bad(409,'Cliente, empreendimento, unidade e contrato nao podem mudar nesta revisao');
   }
   const perm=await elegibilidade(conn,empresa,antiga);
   if(!perm.permitido)throw bad(409,perm.motivo);
   const regras=parse(antiga.regras_json);
   if(novo.regrasInadimplencia!=null)regras.inadimplencia=novo.regrasInadimplencia;
   const parcelasNovas=parcelasDaVenda(novo,regras);
   const [oldItems]=await conn.execute('SELECT id,tipo,valor,parcelas FROM pagamento_itens WHERE empresa_id=? AND venda_id=? AND status<>?',[empresa,vId,'substituida_revisao']);
   const resumoAnterior='Contrato '+antiga.valor_total+'; '+oldItems.length+' itens; versao '+antiga.versao;
   await conn.execute("UPDATE pagamento_itens SET status='substituida_revisao' WHERE empresa_id=? AND venda_id=? AND status<>'substituida_revisao'",[empresa,vId]);
   await conn.execute("UPDATE parcelas SET status='cancelada',versao=versao+1,atualizado_em=UTC_TIMESTAMP() WHERE empresa_id=? AND venda_id=? AND status<>'cancelada'",[empresa,vId]);
   const [r]=await conn.execute(
    'UPDATE vendas SET valor_total=?,valor_imovel=?,corretagem_valor=?,corretagem_compoe_valor_contrato=?,corretagem_forma_pagamento=?,corretor_nome=?,corretor_pct=?,repasse_comissao_pct=?,comissao_sobre_acrescimos=?,observacoes=?,regras_json=?,versao=versao+1,atualizado_por_usuario_id=?,atualizado_em=UTC_TIMESTAMP() WHERE empresa_id=? AND id=? AND versao=?',
    [novo.valorTotal,novo.valorImovel,novo.corretagemValor,novo.corretagemCompoeValorContrato==null?null:Number(novo.corretagemCompoeValorContrato),
     novo.corretagemFormaPagamento,novo.corretorNome,novo.corretorPct,novo.repasseComissaoPct,novo.comissaoSobreAcrescimos,novo.observacoes,
     JSON.stringify(regras),req.usuario.id,empresa,vId,antiga.versao]
   );
   if(r.affectedRows!==1)throw bad(409,'Revisao conflitante');
   for(const item of novo.composicao){
    await conn.execute('INSERT INTO pagamento_itens (empresa_id,venda_id,tipo,descricao,valor,parcelas,primeiro_vencimento,status) VALUES (?,?,?,?,?,?,?,?)',
     [empresa,vId,item.tipo,item.descricao,item.valor,item.parcelas,item.primeiroVencimento,item.status]);
   }
   for(const p of parcelasNovas){
    await conn.execute('INSERT INTO parcelas (empresa_id,venda_id,empreendimento_id,unidade_id,cliente_id,origem_tipo,origem_descricao,numero,total_parcelas,vencimento,valor,valor_original,reajustes_aplicados,valor_pago,status,regras_inadimplencia_json,versao,criado_em,atualizado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,0,UTC_TIMESTAMP(),UTC_TIMESTAMP())',
     [empresa,vId,novo.empreendimentoId,novo.unidadeId,novo.clienteId,p.tipo,p.descricao,p.numero,p.totalParcelas,p.vencimento,p.valor,p.valorOriginal,p.reajustesAplicados,'pendente',p.regrasInadimplencia]);
   }
   const resumoNovo='Contrato '+novo.valorTotal+'; '+novo.composicao.length+' itens; versao '+(Number(antiga.versao)+1);
   const [ins]=await conn.execute(
    'INSERT INTO revisoes_financeiras_vendas (empresa_id,venda_id,usuario_id,justificativa,versao_anterior,versao_nova,resumo_anterior,resumo_novo,criado_em) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP())',
    [empresa,vId,req.usuario.id,body.justificativa.trim(),antiga.versao,Number(antiga.versao)+1,resumoAnterior,resumoNovo]
   );
   await conn.execute("INSERT INTO auditoria_operacional (empresa_id,usuario_id,entidade,entidade_id,acao,detalhes,criado_em) VALUES (?,?,'VENDA',?,'REVISAO_FINANCEIRA',?,UTC_TIMESTAMP())",
    [empresa,req.usuario.id,vId,'Revisao #'+ins.insertId+': '+body.justificativa.trim()]);
   const [saved]=await conn.execute('SELECT * FROM vendas WHERE id=? AND empresa_id=?',[vId,empresa]);
   const [comps]=await conn.execute("SELECT * FROM pagamento_itens WHERE empresa_id=? AND venda_id=? AND status<>'substituida_revisao' ORDER BY id",[empresa,vId]);
   await conn.commit();
   const v=saved[0];
   res.status(201).json({id:v.id,empresaId:v.empresa_id,empreendimentoId:v.empreendimento_id,unidadeId:v.unidade_id,clienteId:v.cliente_id,
    compradorNome:antiga.comprador_nome,valorTotal:v.valor_total,valorImovel:v.valor_imovel,corretagemValor:v.corretagem_valor,
    corretagemCompoeValorContrato:v.corretagem_compoe_valor_contrato==null?null:Boolean(v.corretagem_compoe_valor_contrato),
    corretagemFormaPagamento:v.corretagem_forma_pagamento,dataContrato:v.data_contrato,corretorNome:v.corretor_nome,
    corretorPct:v.corretor_pct,repasseComissaoPct:v.repasse_comissao_pct,comissaoSobreAcrescimos:Boolean(v.comissao_sobre_acrescimos),
    observacoes:v.observacoes,status:v.status,regras:parse(v.regras_json),versao:v.versao,
    composicao:comps.map(p=>({id:p.id,tipo:p.tipo,descricao:p.descricao,valor:p.valor,parcelas:p.parcelas,primeiroVencimento:p.primeiro_vencimento,status:p.status}))});
  }catch(e){await conn.rollback();throw e}finally{conn.release()}
 }));
}
