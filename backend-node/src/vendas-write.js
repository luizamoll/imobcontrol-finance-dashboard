// Cadastro de venda com composicao e parcelas, port do FinanceiroService.java.
// Usa Decimal.js (centavos exatos), bloqueio de unidade e transacao MySQL.
import Decimal from 'decimal.js';

Decimal.set({precision: 36, rounding: Decimal.ROUND_HALF_UP});
const D = x => new Decimal(x);
const money = x => D(x).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
const percent = (x) => money(x);
const positiveId = (v, bad) => {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n <= 0) throw bad(400, 'ID invalido');
  return n;
};
const moneyInput = (v, bad, campo, allowZero = false) => {
  if ((typeof v !== 'string' && typeof v !== 'number') || !/^\d{1,17}(\.\d{1,2})?$/.test(String(v))) {
    throw bad(400, campo + ' invalido');
  }
  const x = money(v);
  if ((allowZero ? x.lt(0) : x.lte(0))) throw bad(400, campo + ' invalido');
  return x.toFixed(2);
};
const pctInput = (v, bad, campo) => {
  if ((typeof v !== 'string' && typeof v !== 'number') || !/^\d{1,3}(\.\d{1,4})?$/.test(String(v))) throw bad(400, campo + ' invalido');
  const x = D(v);
  if (x.lt(0) || x.gt(100)) throw bad(400, campo + ' deve ficar entre 0 e 100');
  return x.toFixed(4);
};
const isoDate = (v, bad, campo) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw bad(400, campo + ' invalida');
  const [y,m,d] = v.split('-').map(Number);
  const date = new Date(Date.UTC(y,m-1,d));
  if (date.toISOString().slice(0,10) !== v) throw bad(400, campo + ' invalida');
  return v;
};
const jsonObject = (value, bad, campo) => {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw bad(400, campo + ' deve ser objeto');
  return value;
};
const text = (v, bad, campo, tamanho) => {
  if (v == null || v === '') return null;
  if (typeof v !== 'string' || v.length > tamanho) throw bad(400, campo + ' invalido');
  return v.trim() || null;
};
const parseJson = s => s ? (typeof s === 'string' ? JSON.parse(s) : s) : null;
const isParcelado = tipo => tipo === 'parcelas' || tipo === 'sinal_parcelado';
const cents = value => money(value).times(100).toNumber();

export function normalizarVenda(body, bad) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad(400, 'Venda invalida');
  const res = {
    empreendimentoId: positiveId(body.empreendimentoId,bad),
    unidadeId: positiveId(body.unidadeId,bad),
    clienteId: positiveId(body.clienteId,bad),
    valorTotal: moneyInput(body.valorTotal,bad,'valorTotal'),
    valorImovel: body.valorImovel == null ? null : moneyInput(body.valorImovel,bad,'valorImovel',true),
    corretagemValor: body.corretagemValor == null ? null : moneyInput(body.corretagemValor,bad,'corretagemValor',true),
    corretagemCompoeValorContrato: body.corretagemCompoeValorContrato ?? null,
    corretagemFormaPagamento: text(body.corretagemFormaPagamento,bad,'corretagemFormaPagamento',40),
    dataContrato: isoDate(body.dataContrato,bad,'dataContrato'),
    corretorNome: text(body.corretorNome,bad,'corretorNome',160),
    corretorPct: pctInput(body.corretorPct,bad,'corretorPct'),
    repasseComissaoPct: pctInput(body.repasseComissaoPct,bad,'repasseComissaoPct'),
    comissaoSobreAcrescimos: body.comissaoSobreAcrescimos === true ? 1 : 0,
    observacoes: text(body.observacoes,bad,'observacoes',65000),
    regrasInadimplencia: jsonObject(body.regrasInadimplencia,bad,'regrasInadimplencia')
  };
  if (res.corretagemCompoeValorContrato !== null && typeof res.corretagemCompoeValorContrato !== 'boolean') {
    throw bad(400,'Modalidade da corretagem invalida');
  }
  if (typeof body.comissaoSobreAcrescimos !== 'boolean') throw bad(400, 'comissaoSobreAcrescimos invalida');
  if (!Array.isArray(body.composicao) || body.composicao.length < 1 || body.composicao.length > 1200) {
    throw bad(400,'Composicao de pagamento invalida');
  }
  let qtdTotal = 0;
  res.composicao = body.composicao.map((v,i) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw bad(400, 'Item de pagamento invalido');
    const tipo = text(v.tipo,bad,'composicao.tipo',40);
    if (!tipo) throw bad(400, 'Tipo de pagamento obrigatorio');
    const parcelas = Number(v.parcelas);
    if (!Number.isSafeInteger(parcelas) || parcelas <= 0 || parcelas > 1200) throw bad(400, 'Numero de parcelas invalido');
    qtdTotal += isParcelado(tipo) ? parcelas : 1;
    if (qtdTotal > 1200) throw bad(400, 'Limite de parcelas excedido');
    return {
      tipo, descricao: text(v.descricao,bad,'descricao',240),
      valor: moneyInput(v.valor,bad,'composicao.valor'),
      parcelas,
      primeiroVencimento: isoDate(v.primeiroVencimento,bad,'primeiroVencimento'),
      status: text(v.status,bad,'status',40) ?? 'pendente'
    };
  });
  const soma = res.composicao.reduce(
    (ac,item) => ac.plus(D(item.valor).times(isParcelado(item.tipo) ? item.parcelas : 1)),
    D(0)
  );
  const diferenca = money(D(res.valorTotal).minus(soma));
  const ajustaveis = res.composicao.reduce((n,item) => n + (isParcelado(item.tipo) ? item.parcelas : 0),0);
  const limite = Math.max(1,ajustaveis * 5);
  if (cents(diferenca.abs()) > 0 && (ajustaveis === 0 || cents(diferenca.abs()) > limite)) {
    throw bad(400,'A composicao do pagamento nao fecha com o valor negociado');
  }
  if (res.corretagemCompoeValorContrato !== null) {
    const esperada = money(D(res.valorTotal).times(res.corretorPct).div(100));
    const imovel = res.corretagemCompoeValorContrato
      ? money(D(res.valorTotal).minus(esperada)) : money(res.valorTotal);
    if (res.corretagemValor == null || res.valorImovel == null
        || !D(res.corretagemValor).eq(esperada)
        || !D(res.valorImovel).eq(imovel)) {
      throw bad(400,'Corretagem e valor do imovel devem corresponder ao valor contratado');
    }
  }
  if (res.regrasInadimplencia) {
    const r = res.regrasInadimplencia;
    for(const campo of ['correcaoPctMes','jurosPctMes','jurosPctDia','moraPct']) {
      if (r[campo] != null) pctInput(r[campo],bad,campo);
    }
    if (r.diasTolerancia != null &&
        (!Number.isSafeInteger(r.diasTolerancia) || r.diasTolerancia < 0)) {
      throw bad(400,'Dias de tolerancia invalidos');
    }
    if (r.jurosTipo != null && !['mensal','diario'].includes(r.jurosTipo)) throw bad(400,'Tipo de juros invalido');
    if (r.inicioJuros != null && !['vencimento','apos_tolerancia'].includes(r.inicioJuros)) throw bad(400,'Inicio dos juros invalido');
  }
  res.diferencaCentavos = cents(diferenca);
  return res;
}
const addMonths = (iso, offset) => {
  const [y,m,d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y,m-1+offset,1));
  const last = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
  date.setUTCDate(Math.min(d,last));
  return date.toISOString().slice(0,10);
};
const cyclesFixed = (contrato,vencimento,reajuste) => {
  if (!reajuste?.ativo || reajuste.modalidade !== 'percentual_fixo') return 0;
  const [ay,am,ad] = contrato.split('-').map(Number);
  const [by,bm,bd] = vencimento.split('-').map(Number);
  const months = (by-ay)*12 + bm-am - (bd<ad ? 1 : 0);
  const period = Number(reajuste.periodicidadeMeses ?? 12);
  if (!Number.isSafeInteger(period) || period < 1) throw Error('Periodicidade de reajuste invalida');
  return Math.max(0,Math.floor(months/period));
};
const reajustar = (orig, cycles, reajuste) => {
  if (!cycles || !reajuste || D(reajuste.percentualBase ?? 0).lte(0)) return orig;
  const fator = D(1).plus(D(reajuste.percentualBase).div(100).toDecimalPlaces(12,Decimal.ROUND_HALF_UP));
  return money(D(orig).times(fator.pow(cycles))).toFixed(2);
};
export function parcelasDaVenda(body,regras) {
  const inad = regras.inadimplencia == null ? null : JSON.stringify(regras.inadimplencia);
  let restantes = body.composicao.reduce((n,item)=>n+(isParcelado(item.tipo)?item.parcelas:0),0);
  let ajuste = body.diferencaCentavos;
  const rows = [];
  for (const item of body.composicao) {
    if (item.tipo === 'bem') continue;
    const quantidade = isParcelado(item.tipo) ? item.parcelas : 1;
    for(let numero=1; numero<=quantidade; numero++) {
      let original = item.valor;
      if (isParcelado(item.tipo)) {
        restantes--;
        if (restantes === 0 && ajuste !== 0) {
          original = money(D(original).plus(D(ajuste).div(100))).toFixed(2);
          if (D(original).lte(0)) throw Error('Ajuste deixaria a ultima parcela sem valor positivo');
          ajuste = 0;
        }
      }
      const vencimento = addMonths(item.primeiroVencimento,numero-1);
      const ciclos = cyclesFixed(body.dataContrato,vencimento,regras.reajusteContratual);
      const valor = reajustar(original,ciclos,regras.reajusteContratual);
      rows.push({
        tipo:item.tipo,descricao:item.descricao ?? item.tipo,numero,totalParcelas:quantidade,
        vencimento,valor,valorOriginal:original,reajustesAplicados:ciclos,
        regrasInadimplencia:inad
      });
    }
  }
  return rows;
}
const regrasVenda = (emp, unidade, quadra, body) => {
  const r = {
    aliquotaTributaria: Number(emp.aliquota_tributaria),
    corretorPct: Number(emp.corretor_pct),
    repasseComissaoPct: Number(emp.repasse_comissao_pct),
    comissaoSobreAcrescimos: Boolean(emp.comissao_sobre_acrescimos)
  };
  if (emp.inadimplencia_json) r.inadimplencia = parseJson(emp.inadimplencia_json);
  const espec = unidade.regras_json ? parseJson(unidade.regras_json)
    : (quadra?.regras_json ? parseJson(quadra.regras_json) : null);
  if (espec && typeof espec === 'object' && !Array.isArray(espec)) Object.assign(r,espec);
  delete r.socioNome;
  if (emp.socio_nome) r.socioNome = emp.socio_nome;
  r.socioPct = Number(emp.socio_pct);
  r.empresaPct = Number(emp.empresa_pct);
  delete r.reajusteContratual;
  if (emp.reajuste_contratual_json) r.reajusteContratual = parseJson(emp.reajuste_contratual_json);
  if (body.regrasInadimplencia != null) r.inadimplencia = body.regrasInadimplencia;
  return r;
};
const toVenda = (v,cliente,composicao) => ({
  id:v.id, empresaId:v.empresa_id, empreendimentoId:v.empreendimento_id,
  unidadeId:v.unidade_id, clienteId:v.cliente_id, compradorNome:cliente.nome,
  valorTotal:v.valor_total, valorImovel:v.valor_imovel, corretagemValor:v.corretagem_valor,
  corretagemCompoeValorContrato: v.corretagem_compoe_valor_contrato == null
    ? null : Boolean(v.corretagem_compoe_valor_contrato),
  corretagemFormaPagamento:v.corretagem_forma_pagamento,
  dataContrato:v.data_contrato, corretorNome:v.corretor_nome,
  corretorPct:v.corretor_pct, repasseComissaoPct:v.repasse_comissao_pct,
  comissaoSobreAcrescimos:Boolean(v.comissao_sobre_acrescimos),
  observacoes:v.observacoes,status:v.status,
  regras:parseJson(v.regras_json), versao:v.versao,
  composicao:composicao.map(p=>({
    id:p.id,tipo:p.tipo,descricao:p.descricao,valor:p.valor,parcelas:p.parcelas,
    primeiroVencimento:p.primeiro_vencimento,status:p.status
  }))
});

export function registerVendasWrite(app,{db,exigirLogin,empresaAutorizada,exigirPermissao,handler,bad}) {
  app.post('/api/vendas', exigirLogin, handler(async (req,res) => {
    await exigirPermissao(req,['VENDAS_CRIAR']);
    const empresa=await empresaAutorizada(req);
    const body=normalizarVenda(req.body,bad);
    const conn=await db.getConnection();
    try {
      await conn.beginTransaction();
      const [emps]=await conn.execute(
        'SELECT * FROM empreendimentos WHERE id = ? AND empresa_id = ?', [body.empreendimentoId,empresa]);
      if(!emps.length) throw bad(404,'Empreendimento nao encontrado');
      const [unids]=await conn.execute(
        'SELECT * FROM unidades WHERE id = ? AND empresa_id = ? FOR UPDATE', [body.unidadeId,empresa]);
      const unidade=unids[0];
      if(!unidade || Number(unidade.empreendimento_id)!==body.empreendimentoId) {
        throw bad(400,'Unidade nao pertence ao empreendimento');
      }
      if(String(unidade.status).toLowerCase()!=='disponivel') throw bad(409,'Unidade indisponivel');
      const [existente]=await conn.execute(
        "SELECT id FROM vendas WHERE unidade_id = ? AND empresa_id = ? AND status = 'ativa' LIMIT 1",
        [body.unidadeId,empresa]
      );
      if(existente.length) throw bad(409,'Ja existe venda ativa para a unidade');
      const [clientes]=await conn.execute(
        'SELECT id,nome FROM clientes WHERE id = ? AND empresa_id = ?', [body.clienteId,empresa]);
      if(!clientes.length) throw bad(404,'Cliente nao encontrado');
      let quadra=null;
      if(!unidade.regras_json && unidade.quadra_id) {
        const [qs]=await conn.execute(
          'SELECT regras_json FROM quadras WHERE id = ? AND empresa_id = ?',
          [unidade.quadra_id,empresa]
        );
        quadra=qs[0] ?? null;
      }
      const regras=regrasVenda(emps[0],unidade,quadra,body);
      const parcelas=parcelasDaVenda(body,regras);
      const cols=[
        'empresa_id','empreendimento_id','unidade_id','cliente_id',
        'valor_total','valor_imovel','corretagem_valor','corretagem_compoe_valor_contrato',
        'corretagem_forma_pagamento','data_contrato','corretor_nome','corretor_pct',
        'repasse_comissao_pct','comissao_sobre_acrescimos','observacoes',
        'status','regras_json','versao','criado_por_usuario_id','atualizado_por_usuario_id'
      ];
      const params=[
        empresa,body.empreendimentoId,body.unidadeId,body.clienteId,
        body.valorTotal,body.valorImovel,body.corretagemValor,
        body.corretagemCompoeValorContrato==null?null:Number(body.corretagemCompoeValorContrato),
        body.corretagemFormaPagamento,body.dataContrato,body.corretorNome,body.corretorPct,
        body.repasseComissaoPct,body.comissaoSobreAcrescimos,body.observacoes,
        'ativa',JSON.stringify(regras),0,req.usuario.id,req.usuario.id
      ];
      const [ins]=await conn.execute('INSERT INTO vendas ('+cols.join(',')+') VALUES ('+
        cols.map(()=>'?').join(',')+')',params);
      const vendaId=ins.insertId;
      for(const item of body.composicao) {
        await conn.execute(
          'INSERT INTO pagamento_itens (empresa_id,venda_id,tipo,descricao,valor,parcelas,primeiro_vencimento,status) VALUES (?,?,?,?,?,?,?,?)',
          [empresa,vendaId,item.tipo,item.descricao,item.valor,item.parcelas,item.primeiroVencimento,item.status]
        );
      }
      for(const parcela of parcelas) {
        await conn.execute(
          'INSERT INTO parcelas (empresa_id,venda_id,empreendimento_id,unidade_id,cliente_id,'
          + 'origem_tipo,origem_descricao,numero,total_parcelas,vencimento,valor,valor_original,'
          + 'reajustes_aplicados,valor_pago,status,regras_inadimplencia_json,versao) '
          + 'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,?, ?,0)',
          [empresa,vendaId,body.empreendimentoId,body.unidadeId,body.clienteId,
            parcela.tipo,parcela.descricao,parcela.numero,parcela.totalParcelas,
            parcela.vencimento,parcela.valor,parcela.valorOriginal,parcela.reajustesAplicados,
            'pendente',parcela.regrasInadimplencia]
        );
      }
      await conn.execute(
        "UPDATE unidades SET status = 'vendido', versao = versao + 1, "
        + 'atualizado_por_usuario_id = ?, atualizado_em = UTC_TIMESTAMP() '
        + 'WHERE id = ? AND empresa_id = ?', [req.usuario.id,body.unidadeId,empresa]
      );
      await conn.execute(
        "INSERT INTO auditoria_operacional (empresa_id,usuario_id,entidade,entidade_id,acao,criado_em) "
        + "VALUES (?,?,'VENDA',?,'CRIACAO',UTC_TIMESTAMP())",
        [empresa,req.usuario.id,vendaId]
      );
      const [saved]=await conn.execute(
        'SELECT * FROM vendas WHERE id = ? AND empresa_id = ?', [vendaId,empresa]);
      const [itens]=await conn.execute(
        'SELECT * FROM pagamento_itens WHERE venda_id = ? AND empresa_id = ? ORDER BY id',
        [vendaId,empresa]
      );
      const resposta=toVenda(saved[0],clientes[0],itens);
      await conn.commit();
      res.status(201).json(resposta);
    } catch(e){await conn.rollback();throw e;}
    finally {conn.release();}
  }));
}
