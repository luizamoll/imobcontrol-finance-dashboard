// Leituras financeiras compativeis com a API Java. Sem operacoes de baixa.
const LEITURA = [
  'VENDAS_VISUALIZAR', 'VENDAS_CRIAR', 'VENDAS_EDITAR', 'VENDAS_EXCLUIR',
  'RECEBIMENTOS_VISUALIZAR', 'RECEBIMENTOS_REGISTRAR', 'RECEBIMENTOS_ESTORNAR',
  'FINANCEIRO_VISUALIZAR', 'RELATORIOS_VISUALIZAR'
];
const boolOrNull = v => v == null ? null : Boolean(v);
const json = v => v == null ? {} : (typeof v === 'string' ? JSON.parse(v) : v);
const idPositivo = (s, bad) => {
  const id = Number(s);
  if (!Number.isSafeInteger(id) || id < 1) throw bad(400, 'ID invalido');
  return id;
};
const page = (content, pagina, tamanho, total) => ({
  content, totalElements: total, totalPages: Math.ceil(total / tamanho),
  size: tamanho, number: pagina, numberOfElements: content.length,
  first: pagina === 0, last: (pagina + 1) * tamanho >= total,
  empty: content.length === 0
});
const toPagamento = p => ({
  id: p.id, tipo: p.tipo, descricao: p.descricao,
  valor: p.valor, parcelas: p.parcelas,
  primeiroVencimento: p.primeiro_vencimento, status: p.status
});
const toVenda = (v, composicao) => ({
  id: v.id, empresaId: v.empresa_id,
  empreendimentoId: v.empreendimento_id, unidadeId: v.unidade_id,
  clienteId: v.cliente_id, compradorNome: v.comprador_nome,
  valorTotal: v.valor_total, valorImovel: v.valor_imovel,
  corretagemValor: v.corretagem_valor,
  corretagemCompoeValorContrato: boolOrNull(v.corretagem_compoe_valor_contrato),
  corretagemFormaPagamento: v.corretagem_forma_pagamento,
  dataContrato: v.data_contrato, corretorNome: v.corretor_nome,
  corretorPct: v.corretor_pct, repasseComissaoPct: v.repasse_comissao_pct,
  comissaoSobreAcrescimos: Boolean(v.comissao_sobre_acrescimos),
  observacoes: v.observacoes, status: v.status,
  regras: json(v.regras_json), versao: v.versao, composicao
});
const toParcela = p => {
  const regras = json(p.venda_regras);
  const concluida = ['paga', 'cancelada'].includes(String(p.status).toLowerCase());
  const inadimplencia = concluida && p.regras_inadimplencia_json
    ? json(p.regras_inadimplencia_json)
    : (regras.inadimplencia ?? {});
  return {
    id: p.id, vendaId: p.venda_id, empreendimentoId: p.empreendimento_id,
    unidadeId: p.unidade_id, clienteId: p.cliente_id,
    compradorNome: p.comprador_nome, origemTipo: p.origem_tipo,
    origemDescricao: p.origem_descricao, numero: p.numero,
    totalParcelas: p.total_parcelas, vencimento: p.vencimento,
    valor: p.valor, valorPago: p.valor_pago,
    dataPagamento: p.data_pagamento, status: p.status,
    regrasInadimplencia: inadimplencia ?? {}, versao: p.versao
  };
};
const toMovimento = m => ({
  id: m.id, parcelaId: m.parcela_id, vendaId: m.venda_id,
  empreendimentoId: m.empreendimento_id, unidadeId: m.unidade_id,
  clienteId: m.cliente_id, compradorNome: m.comprador_nome,
  corretorNome: m.corretor_nome, socioNome: m.socio_nome,
  origem: m.origem, origemDescricao: m.origem_descricao,
  data: m.data_movimento, usuario: m.usuario_nome ?? 'Usuario',
  valorRecebido: m.valor_recebido, impostoReservado: m.imposto_reservado,
  comissaoPaga: m.comissao_paga, empresaValor: m.empresa_valor,
  socioValor: m.socio_valor,
  aliquotaTributariaAplicada: m.aliquota_tributaria_aplicada,
  empresaPctAplicada: m.empresa_pct_aplicada,
  socioPctAplicada: m.socio_pct_aplicada,
  comissaoBaseCalculo: m.comissao_base_calculo,
  comissaoRepassePctAplicado: m.comissao_repasse_pct_aplicado,
  comissaoSobreAcrescimosAplicada: boolOrNull(m.comissao_sobre_acrescimos_aplicada),
  acrescimosRecebidos: m.acrescimos_recebidos,
  comissaoTeorica: m.comissao_teorica,
  saldoComissaoApos: m.saldo_comissao_apos
});

export function registerFinanceiroRead(app, { db, exigirLogin, empresaAutorizada, exigirPermissao, handler, bad }) {
  const auth = async req => {
    await exigirPermissao(req, LEITURA);
    return empresaAutorizada(req);
  };
  async function composicoes(empresa, ids) {
    if (!ids.length) return new Map();
    const placeholders = ids.map(() => '?').join(',');
    const sql = 'SELECT id, venda_id, tipo, descricao, valor, parcelas, primeiro_vencimento, status '
      + 'FROM pagamento_itens WHERE empresa_id = ? AND venda_id IN (' + placeholders + ') '
      + "AND LOWER(status) <> 'substituida_revisao' ORDER BY id";
    const [rows] = await db.execute(sql, [empresa, ...ids]);
    const byVenda = new Map();
    for (const row of rows) {
      if (!byVenda.has(row.venda_id)) byVenda.set(row.venda_id, []);
      byVenda.get(row.venda_id).push(toPagamento(row));
    }
    return byVenda;
  }
  const BASE = 'SELECT v.*, c.nome AS comprador_nome FROM vendas v '
    + 'JOIN clientes c ON c.id = v.cliente_id AND c.empresa_id = v.empresa_id';
  app.get('/api/vendas', exigirLogin, handler(async (req, res) => {
    const empresa = await auth(req);
    const pagina = Number(req.query.pagina ?? 0), tamanho = Number(req.query.tamanho ?? 100);
    if (!Number.isSafeInteger(pagina) || pagina < 0
        || !Number.isSafeInteger(tamanho) || tamanho < 1 || tamanho > 100
        || !Number.isSafeInteger(pagina * tamanho)) {
      throw bad(400, 'Paginacao invalida');
    }
    const [totais] = await db.execute('SELECT COUNT(*) AS total FROM vendas WHERE empresa_id = ?', [empresa]);
    const [rows] = await db.execute(
      BASE + ' WHERE v.empresa_id = ? ORDER BY v.data_contrato DESC, v.id DESC LIMIT ? OFFSET ?',
      [empresa, tamanho, pagina * tamanho]
    );
    const comps = await composicoes(empresa, rows.map(r => r.id));
    res.json(page(rows.map(r => toVenda(r, comps.get(r.id) ?? [])), pagina, tamanho, Number(totais[0].total)));
  }));
  app.get('/api/vendas/:id', exigirLogin, handler(async (req, res) => {
    const empresa = await auth(req), id = idPositivo(req.params.id, bad);
    const [rows] = await db.execute(BASE + ' WHERE v.id = ? AND v.empresa_id = ? LIMIT 1', [id, empresa]);
    if (!rows.length) throw bad(404, 'Venda nao encontrada');
    const comps = await composicoes(empresa, [id]);
    res.json(toVenda(rows[0], comps.get(id) ?? []));
  }));
  app.get('/api/parcelas', exigirLogin, handler(async (req, res) => {
    const empresa = await auth(req);
    const [rows] = await db.execute(
      'SELECT p.*, c.nome AS comprador_nome, v.regras_json AS venda_regras FROM parcelas p '
      + 'JOIN clientes c ON c.id = p.cliente_id AND c.empresa_id = p.empresa_id '
      + 'JOIN vendas v ON v.id = p.venda_id AND v.empresa_id = p.empresa_id '
      + 'WHERE p.empresa_id = ? ORDER BY p.vencimento, p.id',
      [empresa]
    );
    res.json(rows.map(toParcela));
  }));
  app.get('/api/movimentos', exigirLogin, handler(async (req, res) => {
    const empresa = await auth(req);
    const [rows] = await db.execute(
      'SELECT m.*, c.nome AS comprador_nome, u.nome AS usuario_nome FROM movimentos m '
      + 'JOIN clientes c ON c.id = m.cliente_id AND c.empresa_id = m.empresa_id '
      + 'LEFT JOIN usuarios u ON u.id = m.usuario_id '
      + 'WHERE m.empresa_id = ? AND m.estornado = FALSE ORDER BY m.data_movimento DESC, m.id DESC',
      [empresa]
    );
    res.json(rows.map(toMovimento));
  }));
}
