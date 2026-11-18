// Fechamento mensal em MySQL (paridade com FechamentoMensalService Java).
// Leitura por data efetiva dos movimentos, sem incluir estornos; arquivos sao snapshots.
import Decimal from 'decimal.js';

const LEITURA = ['RELATORIOS_VISUALIZAR','FINANCEIRO_VISUALIZAR'];
const LANCA = ['RECEBIMENTOS_REGISTRAR','CONFIGURACOES_GERENCIAR'];
const ESTORNA = ['RECEBIMENTOS_ESTORNAR','CONFIGURACOES_GERENCIAR'];
const GERENCIAR = ['CONFIGURACOES_GERENCIAR'];
const TIPOS = new Set([
  'CUSTO_EMPREENDIMENTO','IMPOSTO_PAGO','DISTRATO_DEVOLUCAO','RETENCAO',
  'OUTRA_RECEITA','COMISSAO_PAGA','REPASSE_SOCIO_PAGO','REPASSE_EMPREENDEDOR_PAGO'
]);
const D = v => new Decimal(v ?? 0);
const dinheiro = v => D(v).toFixed(2);
const idValido = v => Number.isSafeInteger(Number(v)) && Number(v) > 0;
const dt = v => v == null ? null : typeof v === 'string' ? v.replace(' ','T') : v.toISOString();
const isMes = s => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
const mesFim = s => new Date(Date.UTC(+s.slice(0,4),+s.slice(5,7),0)).toISOString().slice(0,10);
const situacaoNaoCobravel = p => ['cancelada','em_acordo'].includes(String(p.status).toLowerCase()) ||
    String(p.acordo_papel ?? '').toLowerCase()==='original';
function dtoLancamento(x) {
  return { id:x.id,empreendimentoId:x.empreendimento_id,data:x.data_lancamento,
    tipo:x.tipo,descricao:x.descricao,valor:x.valor,estornado:x.estornado_em!=null,criadoEm:dt(x.criado_em) };
}
function parseLancamento(body,bad) {
  if(!body || typeof body!=='object' || Array.isArray(body)) throw bad(400,'Lancamento invalido');
  const emp=Number(body.empreendimentoId);
  if(!idValido(emp)) throw bad(400,'Empreendimento invalido');
  if(typeof body.data!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.data) ||
      Number.isNaN(Date.parse(body.data)) || new Date(body.data).toISOString().slice(0,10)!==body.data) {
    throw bad(400,'Data invalida');
  }
  if(body.data>new Date().toISOString().slice(0,10)) throw bad(400,'Data do lancamento nao pode estar no futuro');
  if(!TIPOS.has(body.tipo)) throw bad(400,'Tipo de lancamento nao permitido');
  if(typeof body.descricao!=='string' || !body.descricao.trim() || body.descricao.trim().length>240) {
    throw bad(400,'Descricao invalida');
  }
  if((typeof body.valor!=='number' && typeof body.valor!=='string') ||
      !/^\d+(?:\.\d{1,2})?$/.test(String(body.valor))) throw bad(400,'Valor invalido');
  const valor=D(body.valor);
  if(!valor.isFinite()||valor.lte(0)||valor.gt('99999999999999999.99')) throw bad(400,'Valor invalido');
  return {empreendimentoId:emp,data:body.data,tipo:body.tipo,descricao:body.descricao.trim(),valor:valor.toFixed(2)};
}
export function registerFechamento(app,{db,exigirLogin,empresaAutorizada,exigirPermissao,handler,bad}) {
  const exigirEmpreendimento=async (conn,empresa,id) => {
    const [r]=await conn.execute('SELECT id FROM empreendimentos WHERE empresa_id=? AND id=?',[empresa,id]);
    if(!r.length) throw bad(404,'Empreendimento nao encontrado');
  };
  const filtrarEmp=emp => emp==null ? '' : ' AND empreendimento_id = ?';
  const filtros=(base,emp)=>emp==null ? base : [...base,emp];
  const validarMes=mes=>{if(!isMes(mes))throw bad(400,'Mes invalido. Use AAAA-MM');return mes;};
  const validarEmp=val=>{if(val==null||val==='')return null;if(!idValido(val))throw bad(400,'Empreendimento invalido');return Number(val);};
  async function calcular(conn,empresa,mes,empreendimentoId){
    validarMes(mes);
    if(empreendimentoId!=null)await exigirEmpreendimento(conn,empresa,empreendimentoId);
    const inicio=mes+'-01',fim=mesFim(mes);
    const [movs]=await conn.execute(
      'SELECT parcela_id,unidade_id,data_movimento,valor_recebido,socio_valor,empresa_valor,imposto_reservado,comissao_paga FROM movimentos WHERE empresa_id=? AND estornado=0 AND data_movimento BETWEEN ? AND ?'+filtrarEmp(empreendimentoId),
      filtros([empresa,inicio,fim],empreendimentoId)
    );
    const [lanc]=await conn.execute(
      'SELECT id,empreendimento_id,data_lancamento,tipo,descricao,valor,criado_em,estornado_em FROM fechamento_mensal_lancamentos WHERE empresa_id=? AND data_lancamento BETWEEN ? AND ?'+filtrarEmp(empreendimentoId)+' ORDER BY data_lancamento,id',
      filtros([empresa,inicio,fim],empreendimentoId)
    );
    const somar=(arr,key)=>arr.reduce((acc,m)=>acc.plus(m[key]??0),new Decimal(0));
    const ledger=tipo=>somar(lanc.filter(x=>x.tipo===tipo&&x.estornado_em==null),'valor');
    const recebidoParcelas=somar(movs,'valor_recebido');
    const valorSocio=somar(movs,'socio_valor');
    const valorEmpreendedor=somar(movs,'empresa_valor');
    const impostoReservado=somar(movs,'imposto_reservado');
    const comissaoRegistrada=somar(movs,'comissao_paga');
    const outrasReceitas=ledger('OUTRA_RECEITA');
    const custo=ledger('CUSTO_EMPREENDIMENTO');
    const impostoPago=ledger('IMPOSTO_PAGO');
    const devolvido=ledger('DISTRATO_DEVOLUCAO');
    const retido=ledger('RETENCAO');
    const comissaoPaga=ledger('COMISSAO_PAGA');
    const socioPago=ledger('REPASSE_SOCIO_PAGO');
    const empreendedorPago=ledger('REPASSE_EMPREENDEDOR_PAGO');
    const total=recebidoParcelas.plus(outrasReceitas);
    // Retencoes bloqueiam disponibilidade, mas nao sao desembolso ja realizado.
    const disponivel=total.minus(custo).minus(impostoPago).minus(devolvido).minus(retido)
      .minus(comissaoPaga).minus(socioPago).minus(empreendedorPago);

    const [vendas]=await conn.execute(
      "SELECT v.id,v.unidade_id,v.cliente_id,u.unidade,u.numero,c.nome AS comprador "+
      "FROM vendas v JOIN unidades u ON u.id=v.unidade_id AND u.empresa_id=v.empresa_id "+
      "JOIN clientes c ON c.id=v.cliente_id AND c.empresa_id=v.empresa_id "+
      "WHERE v.empresa_id=? AND v.status IN ('ativa','quitada') AND v.data_contrato<=?"+
      (empreendimentoId==null?'':' AND v.empreendimento_id=?')+' ORDER BY v.id DESC',
      filtros([empresa,fim],empreendimentoId)
    );
    // Uma linha por unidade, usando contrato ativo/quitado mais recente.
    const porUnidade=new Map();
    for(const venda of vendas)if(!porUnidade.has(Number(venda.unidade_id)))porUnidade.set(Number(venda.unidade_id),venda);
    const ids=[...porUnidade.values()].map(v=>v.id);
    const parcelasPorVenda=new Map();
    if(ids.length){
      // Consultas em lotes para nao ultrapassar o limite de parametros de uma query.
      for(let start=0;start<ids.length;start+=400) {
        const lote=ids.slice(start,start+400);
        const [parcelas]=await conn.execute(
          'SELECT id,venda_id,vencimento,valor,status,acordo_papel FROM parcelas WHERE empresa_id=? AND vencimento<=? AND venda_id IN ('+
          lote.map(()=>'?').join(',')+')',[empresa,fim,...lote]
        );
        for(const p of parcelas){
          const key=Number(p.venda_id);
          if(!parcelasPorVenda.has(key))parcelasPorVenda.set(key,[]);
          parcelasPorVenda.get(key).push(p);
        }
      }
    }
    const [historicos]=await conn.execute(
      'SELECT parcela_id,SUM(valor_recebido) AS recebido FROM movimentos WHERE empresa_id=? AND estornado=0 AND data_movimento<=? GROUP BY parcela_id',
      [empresa,fim]
    );
    const ateFim=new Map(historicos.map(x=>[Number(x.parcela_id),D(x.recebido)]));
    const movPorUnidade=new Map();
    for(const m of movs){
      const k=Number(m.unidade_id);
      if(!movPorUnidade.has(k))movPorUnidade.set(k,[]);
      movPorUnidade.get(k).push(m);
    }
    const unidades=[...porUnidade.values()].map(v=>{
      const ms=movPorUnidade.get(Number(v.unidade_id))||[];
      const recebidoNoMes=somar(ms,'valor_recebido');
      const saldoVencido=(parcelasPorVenda.get(Number(v.id))||[])
        .filter(p=>!situacaoNaoCobravel(p))
        .reduce((sum,p)=>sum.plus(Decimal.max(0,D(p.valor).minus(ateFim.get(Number(p.id))||0))),new Decimal(0));
      const ultimoPagamentoMes=ms.map(m=>m.data_movimento).sort().at(-1)||null;
      return {
        unidadeId:v.unidade_id,unidade:v.unidade||v.numero,comprador:v.comprador,
        pagouNoMes:recebidoNoMes.gt(0),inadimplenteNoFim:saldoVencido.gt(0),
        recebidoNoMes:recebidoNoMes.toFixed(2),saldoVencido:saldoVencido.toFixed(2),
        ultimoPagamentoMes
      };
    }).sort((a,b)=>String(a.unidade).localeCompare(String(b.unidade),'pt-BR'));
    const inadimplentes=unidades.filter(u=>u.inadimplenteNoFim).length;
    return {
      mes,empreendimentoId,totalGlebas:unidades.length,glebasAdimplentes:unidades.length-inadimplentes,
      glebasInadimplentes:inadimplentes,glebasComPagamentoMes:unidades.filter(u=>u.pagouNoMes).length,
      recebidoParcelas:dinheiro(recebidoParcelas),outrasReceitas:dinheiro(outrasReceitas),
      valorTotalRecebido:dinheiro(total),custoEmpreendimento:dinheiro(custo),
      valorSocio:dinheiro(valorSocio),valorEmpreendedor:dinheiro(valorEmpreendedor),
      impostoReservado:dinheiro(impostoReservado),impostoPago:dinheiro(impostoPago),
      comissaoRegistrada:dinheiro(comissaoRegistrada),comissaoEfetivamentePaga:dinheiro(comissaoPaga),
      socioEfetivamentePago:dinheiro(socioPago),empreendedorEfetivamentePago:dinheiro(empreendedorPago),
      valorDevolvidoDistrato:dinheiro(devolvido),valorRetido:dinheiro(retido),
      saldoDisponivelEstimado:dinheiro(disponivel),
      lancamentos:lanc.map(dtoLancamento),unidades
    };
  }
  const toArquivo=x=>({
    id:x.id,mes:x.mes,empreendimentoId:x.empreendimento_id,
    criadoEm:dt(x.criado_em),criadoPorUsuarioId:x.criado_por_usuario_id,
    relatorio:typeof x.relatorio_json==='string'?JSON.parse(x.relatorio_json):x.relatorio_json
  });
  app.get('/api/fechamento-mensal',exigirLogin,handler(async(req,res)=>{
    await exigirPermissao(req,LEITURA);
    const empresa=await empresaAutorizada(req), mes=validarMes(req.query.mes);
    const emp=validarEmp(req.query.empreendimentoId);
    res.json(await calcular(db,empresa,mes,emp));
  }));
  app.get('/api/fechamento-mensal/arquivos',exigirLogin,handler(async(req,res)=>{
    await exigirPermissao(req,LEITURA);
    const empresa=await empresaAutorizada(req);
    const [rows]=await db.execute('SELECT * FROM fechamento_mensal_arquivos WHERE empresa_id=? ORDER BY mes DESC,id DESC',[empresa]);
    res.json(rows.map(toArquivo));
  }));
  app.get('/api/fechamento-mensal/arquivos/:id',exigirLogin,handler(async(req,res)=>{
    await exigirPermissao(req,LEITURA);
    const empresa=await empresaAutorizada(req),id=Number(req.params.id);
    if(!idValido(id))throw bad(400,'ID invalido');
    const [r]=await db.execute('SELECT * FROM fechamento_mensal_arquivos WHERE id=? AND empresa_id=?',[id,empresa]);
    if(!r.length)throw bad(404,'Arquivo nao encontrado');
    res.json(toArquivo(r[0]));
  }));
  app.post('/api/fechamento-mensal/arquivos',exigirLogin,handler(async(req,res)=>{
    await exigirPermissao(req,GERENCIAR);
    const empresa=await empresaAutorizada(req),mes=validarMes(req.body?.mes);
    const emp=validarEmp(req.body?.empreendimentoId);
    if(emp==null)throw bad(400,'Informe empreendimento');
    const atual=new Date().toISOString().slice(0,7);
    if(mes>=atual)throw bad(400,'Somente meses encerrados podem ser arquivados');
    const conn=await db.getConnection();
    try{
      await conn.beginTransaction();
      const [prev]=await conn.execute('SELECT id FROM fechamento_mensal_arquivos WHERE empresa_id=? AND empreendimento_id=? AND mes=?',[empresa,emp,mes]);
      if(prev.length)throw bad(409,'Este mes ja possui fechamento arquivado');
      const relatorio=await calcular(conn,empresa,mes,emp);
      const [r]=await conn.execute(
        'INSERT INTO fechamento_mensal_arquivos (empresa_id,empreendimento_id,mes,relatorio_json,criado_por_usuario_id,criado_em) VALUES (?,?,?,?,?,UTC_TIMESTAMP())',
        [empresa,emp,mes,JSON.stringify(relatorio),req.usuario.id]
      );
      const [rows]=await conn.execute('SELECT * FROM fechamento_mensal_arquivos WHERE id=? AND empresa_id=?',[r.insertId,empresa]);
      await conn.commit();
      res.status(201).json(toArquivo(rows[0]));
    }catch(e){await conn.rollback();throw e;}finally{conn.release();}
  }));
  app.post('/api/fechamento-mensal/lancamentos',exigirLogin,handler(async(req,res)=>{
    await exigirPermissao(req,LANCA);
    const empresa=await empresaAutorizada(req),body=parseLancamento(req.body,bad);
    const conn=await db.getConnection();
    try{
      await conn.beginTransaction();
      await exigirEmpreendimento(conn,empresa,body.empreendimentoId);
      const [r]=await conn.execute(
        'INSERT INTO fechamento_mensal_lancamentos (empresa_id,empreendimento_id,data_lancamento,tipo,descricao,valor,criado_por_usuario_id,criado_em) VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP())',
        [empresa,body.empreendimentoId,body.data,body.tipo,body.descricao,body.valor,req.usuario.id]
      );
      const [rows]=await conn.execute('SELECT * FROM fechamento_mensal_lancamentos WHERE id=? AND empresa_id=?',[r.insertId,empresa]);
      await conn.commit();
      res.status(201).json(dtoLancamento(rows[0]));
    }catch(e){await conn.rollback();throw e;}finally{conn.release();}
  }));
  app.post('/api/fechamento-mensal/lancamentos/:id/estornar',exigirLogin,handler(async(req,res)=>{
    await exigirPermissao(req,ESTORNA);
    const empresa=await empresaAutorizada(req),id=Number(req.params.id);
    if(!idValido(id))throw bad(400,'ID invalido');
    const conn=await db.getConnection();
    try{
      await conn.beginTransaction();
      const [rows]=await conn.execute(
        'SELECT id,estornado_em FROM fechamento_mensal_lancamentos WHERE id=? AND empresa_id=? FOR UPDATE',[id,empresa]
      );
      if(!rows.length)throw bad(404,'Lancamento nao encontrado');
      if(rows[0].estornado_em!=null)throw bad(409,'Lancamento ja estornado');
      await conn.execute(
        'UPDATE fechamento_mensal_lancamentos SET estornado_por_usuario_id=?,estornado_em=UTC_TIMESTAMP() WHERE id=? AND empresa_id=?',
        [req.usuario.id,id,empresa]
      );
      await conn.commit();
      res.status(204).end();
    }catch(e){await conn.rollback();throw e;}finally{conn.release();}
  }));
}
