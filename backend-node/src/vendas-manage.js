import { normalizarVenda, parcelasDaVenda } from './vendas-write.js';
import Decimal from 'decimal.js';

const D = x => new Decimal(x ?? 0);
const dinheiro = x => D(x).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
const parse = s => s ? (typeof s === 'string' ? JSON.parse(s) : s) : {};
const idValido = (raw,bad) => {
  const id=Number(raw);
  if (!Number.isSafeInteger(id)||id<1)throw bad(400,'ID invalido');
  return id;
};
const normalizarItens = items => items.map(x=>({
  tipo:String(x.tipo).toLowerCase(), descricao:x.descricao || null,
  valor:dinheiro(x.valor), parcelas:Number(x.parcelas),
  primeiroVencimento:x.primeiro_vencimento
}));
const mesmoPlano = (atual, novo) => atual.length===novo.length &&
  atual.every((a,i)=>a.tipo===novo[i].tipo
    && a.descricao===novo[i].descricao
    && D(a.valor).eq(novo[i].valor)
    && a.parcelas===novo[i].parcelas
    && a.primeiroVencimento===novo[i].primeiroVencimento);

export function registerVendasManage(app,{db,exigirLogin,empresaAutorizada,exigirPermissao,handler,bad}) {
  const auth = async (req,perms)=>{
    await exigirPermissao(req,perms);
    return empresaAutorizada(req);
  };
  const find = async (connection,empresa,id,lock=false)=>{
    const [rows]=await connection.execute(
      'SELECT * FROM vendas WHERE id=? AND empresa_id=?'+(lock?' FOR UPDATE':''),
      [id,empresa]
    );
    if(!rows.length)throw bad(404,'Venda nao encontrada');
    return rows[0];
  };
  const existente = async (db,table,id,empresa)=>{
    const [rows]=await db.execute('SELECT COUNT(*) AS total FROM '+table+' WHERE venda_id=? AND empresa_id=?',[id,empresa]);
    return Number(rows[0].total)>0;
  };
  const possuiDependencias = async (db,id,empresa)=>{
    for (const tabela of ['movimentos','acordos','reajustes_venda','revisoes_financeiras_vendas']) {
      if(await existente(db,tabela,id,empresa))return true;
    }
    return false;
  };

  app.get('/api/vendas/:id/historico', exigirLogin,handler(async(req,res)=>{
    const empresa=await auth(req,['VENDAS_VISUALIZAR','VENDAS_EDITAR','VENDAS_GERENCIAR']);
    const id=idValido(req.params.id,bad);
    await find(db,empresa,id);
    const [rows]=await db.execute(
      "SELECT a.*,u.nome AS usuario_nome FROM auditoria_operacional a "
      + "LEFT JOIN usuarios u ON u.id=a.usuario_id "
      + "WHERE a.empresa_id=? AND a.entidade='VENDA' AND a.entidade_id=? "
      + "ORDER BY a.criado_em DESC,a.id DESC",
      [empresa,id]
    );
    res.json(rows.map(a=>({
      id:a.id, usuarioId:a.usuario_id, usuarioNome:a.usuario_nome??'Usuario',
      acao:a.acao, detalhes:a.detalhes??null,
      criadoEm:typeof a.criado_em==='string'?a.criado_em.replace(' ','T'):a.criado_em
    })));
  }));

  app.put('/api/vendas/:id',exigirLogin,handler(async(req,res)=>{
    const empresa=await auth(req,['VENDAS_EDITAR','VENDAS_GERENCIAR']);
    const id=idValido(req.params.id,bad);
    const dados=normalizarVenda(req.body,bad);
    const versao=req.body?.versao;
    if(!Number.isSafeInteger(versao)||versao<0)throw bad(400,'Informe versao atual da venda');
    const conn=await db.getConnection();
    try{
      await conn.beginTransaction();
      const atual=await find(conn,empresa,id,true);
      if(Number(atual.versao)!==versao)throw bad(409,'Venda alterada por outro usuario');
      if(Number(atual.empreendimento_id)!==dados.empreendimentoId ||
         Number(atual.unidade_id)!==dados.unidadeId){
        throw bad(409,'Nao pode mover uma venda para outro empreendimento ou unidade');
      }
      const [clientes]=await conn.execute('SELECT id,nome FROM clientes WHERE id=? AND empresa_id=?',
        [dados.clienteId,empresa]);
      if(!clientes.length)throw bad(404,'Cliente nao encontrado');
      const [pagamentos]=await conn.execute(
        "SELECT * FROM pagamento_itens WHERE empresa_id=? AND venda_id=? AND LOWER(status)<>'substituida_revisao' ORDER BY id",
        [empresa,id]
      );
      const antigaComposicao=normalizarItens(pagamentos);
      const novaComposicao=dados.composicao.map(i=>({
        tipo:i.tipo.toLowerCase(),descricao:i.descricao||null,valor:i.valor,
        parcelas:i.parcelas,primeiroVencimento:i.primeiroVencimento
      }));
      const composicaoMudou=!mesmoPlano(antigaComposicao,novaComposicao);
      const historico=await existente(conn,'movimentos',id,empresa);
      // Se houver histórico, inclusive estornado, somente alteracoes sem
      // reescrever os valores do contrato ou suas parcelas.
      if(historico){
        const mudouFinanceiro=Number(atual.cliente_id)!==dados.clienteId ||
          !D(atual.valor_total).eq(dados.valorTotal) ||
          !D(atual.valor_imovel??0).eq(dados.valorImovel??0) ||
          !D(atual.corretagem_valor??0).eq(dados.corretagemValor??0) ||
          Boolean(atual.corretagem_compoe_valor_contrato)!==Boolean(dados.corretagemCompoeValorContrato) ||
          !D(atual.corretor_pct).eq(dados.corretorPct) || composicaoMudou;
        if(mudouFinanceiro)throw bad(409,
          'Contrato com historico de recebimentos: preserve valores e parcelas; use revisao financeira autorizada');
      }else{
        // Nao apagar parcelas que possam ter referencia em acordos/reajustes.
        if(await possuiDependencias(conn,id,empresa))throw bad(409,
          'Venda possui registros financeiros vinculados e precisa de revisao autorizada');
        await conn.execute('DELETE FROM pagamento_itens WHERE empresa_id=? AND venda_id=?',[empresa,id]);
        await conn.execute('DELETE FROM parcelas WHERE empresa_id=? AND venda_id=?',[empresa,id]);
        for(const item of dados.composicao){
          await conn.execute(
            'INSERT INTO pagamento_itens (empresa_id,venda_id,tipo,descricao,valor,parcelas,primeiro_vencimento,status) VALUES (?,?,?,?,?,?,?,?)',
            [empresa,id,item.tipo,item.descricao,item.valor,item.parcelas,item.primeiroVencimento,item.status]
          );
        }
      }
      const regras=parse(atual.regras_json);
      if(dados.regrasInadimplencia!=null)regras.inadimplencia=dados.regrasInadimplencia;
      if(!historico){
        const parcelas=parcelasDaVenda(dados,regras);
        for(const p of parcelas){
          await conn.execute(
            'INSERT INTO parcelas (empresa_id,venda_id,empreendimento_id,unidade_id,cliente_id,'
            +'origem_tipo,origem_descricao,numero,total_parcelas,vencimento,valor,valor_original,'
            +'reajustes_aplicados,valor_pago,status,regras_inadimplencia_json,versao) '
            +'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,0)',
            [empresa,id,dados.empreendimentoId,dados.unidadeId,dados.clienteId,
              p.tipo,p.descricao,p.numero,p.totalParcelas,p.vencimento,p.valor,p.valorOriginal,
              p.reajustesAplicados,'pendente',p.regrasInadimplencia]
          );
        }
      }else{
        // Alteracoes de juros so afetam parcelas abertas.
        await conn.execute(
          "UPDATE parcelas SET regras_inadimplencia_json=? "
          +"WHERE venda_id=? AND empresa_id=? AND LOWER(status) NOT IN ('paga','cancelada','em_acordo')",
          [regras.inadimplencia==null?null:JSON.stringify(regras.inadimplencia),id,empresa]
        );
      }
      await conn.execute(
        'UPDATE vendas SET cliente_id=?,valor_total=?,valor_imovel=?,corretagem_valor=?,'
        +'corretagem_compoe_valor_contrato=?,corretagem_forma_pagamento=?,data_contrato=?,'
        +'corretor_nome=?,corretor_pct=?,repasse_comissao_pct=?,comissao_sobre_acrescimos=?,'
        +'observacoes=?,regras_json=?,versao=versao+1,atualizado_por_usuario_id=?,'
        +'atualizado_em=CURRENT_TIMESTAMP WHERE id=? AND empresa_id=?',
        [dados.clienteId,dados.valorTotal,dados.valorImovel,dados.corretagemValor,
          dados.corretagemCompoeValorContrato,dados.corretagemFormaPagamento,
          dados.dataContrato,dados.corretorNome,dados.corretorPct,
          dados.repasseComissaoPct,dados.comissaoSobreAcrescimos===1,
          dados.observacoes,JSON.stringify(regras),req.usuario.id,id,empresa]
      );
      await conn.execute(
        "INSERT INTO auditoria_operacional (empresa_id,usuario_id,entidade,entidade_id,acao,criado_em) "
        +"VALUES (?,?,'VENDA',?,'ATUALIZACAO',CURRENT_TIMESTAMP)",
        [empresa,req.usuario.id,id]
      );
      await conn.commit();
    }catch(error){await conn.rollback();throw error;}
    finally{conn.release();}
    // Retorna o mesmo contrato de resposta da rota GET.
    const [saved]=await db.execute(
      'SELECT v.*, c.nome AS comprador_nome FROM vendas v JOIN clientes c '
      +'ON c.id=v.cliente_id AND c.empresa_id=v.empresa_id '
      +'WHERE v.empresa_id=? AND v.id=?',[empresa,id]
    );
    const [items]=await db.execute(
      "SELECT * FROM pagamento_itens WHERE empresa_id=? AND venda_id=? AND LOWER(status)<>'substituida_revisao' ORDER BY id",
      [empresa,id]
    );
    const v=saved[0];
    res.json({
      id:v.id,empresaId:v.empresa_id,empreendimentoId:v.empreendimento_id,
      unidadeId:v.unidade_id,clienteId:v.cliente_id,compradorNome:v.comprador_nome,
      valorTotal:v.valor_total,valorImovel:v.valor_imovel,corretagemValor:v.corretagem_valor,
      corretagemCompoeValorContrato:v.corretagem_compoe_valor_contrato,
      corretagemFormaPagamento:v.corretagem_forma_pagamento,dataContrato:v.data_contrato,
      corretorNome:v.corretor_nome,corretorPct:v.corretor_pct,
      repasseComissaoPct:v.repasse_comissao_pct,
      comissaoSobreAcrescimos:v.comissao_sobre_acrescimos,
      observacoes:v.observacoes,status:v.status,regras:parse(v.regras_json),versao:v.versao,
      composicao:items.map(p=>({
        id:p.id,tipo:p.tipo,descricao:p.descricao,valor:p.valor,parcelas:p.parcelas,
        primeiroVencimento:p.primeiro_vencimento,status:p.status
      }))
    });
  }));

  app.delete('/api/vendas/:id',exigirLogin,handler(async(req,res)=>{
    const empresa=await auth(req,['VENDAS_EXCLUIR','VENDAS_GERENCIAR']);
    const id=idValido(req.params.id,bad);
    const conn=await db.getConnection();
    try{
      await conn.beginTransaction();
      const atual=await find(conn,empresa,id,true);
      const [unidade]=await conn.execute(
        'SELECT id FROM unidades WHERE id=? AND empresa_id=? FOR UPDATE',
        [atual.unidade_id,empresa]
      );
      if(!unidade.length)throw bad(404,'Unidade nao encontrada');
      if(await possuiDependencias(conn,id,empresa)){
        throw bad(409,'Venda com historico financeiro nao pode ser excluida');
      }
      await conn.execute('DELETE FROM pagamento_itens WHERE venda_id=? AND empresa_id=?',[id,empresa]);
      await conn.execute('DELETE FROM parcelas WHERE venda_id=? AND empresa_id=?',[id,empresa]);
      await conn.execute('DELETE FROM vendas WHERE id=? AND empresa_id=?',[id,empresa]);
      await conn.execute(
        "UPDATE unidades SET status='disponivel',versao=versao+1,atualizado_por_usuario_id=?,"
        +'atualizado_em=CURRENT_TIMESTAMP WHERE id=? AND empresa_id=?',
        [req.usuario.id,atual.unidade_id,empresa]
      );
      await conn.execute(
        "INSERT INTO auditoria_operacional (empresa_id,usuario_id,entidade,entidade_id,acao,criado_em) "
        +"VALUES (?,?,'VENDA',?,'EXCLUSAO',CURRENT_TIMESTAMP)",
        [empresa,req.usuario.id,id]
      );
      await conn.commit();
      res.status(204).end();
    }catch(e){await conn.rollback();throw e;}
    finally{conn.release();}
  }));
}
