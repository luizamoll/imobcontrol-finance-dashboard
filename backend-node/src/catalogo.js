// Endpoints de consulta de catalogo com o mesmo formato de retorno do Spring Boot.
const LEITURA = [
  'EMPREENDIMENTOS_VISUALIZAR', 'EMPREENDIMENTOS_GERENCIAR',
  'VENDAS_VISUALIZAR', 'VENDAS_GERENCIAR', 'RECEBIMENTOS_VISUALIZAR',
  'RECEBIMENTOS_REGISTRAR', 'RECEBIMENTOS_ESTORNAR',
  'FINANCEIRO_VISUALIZAR', 'RELATORIOS_VISUALIZAR'
];
const empFields = {
  id: 'id', empresa_id: 'empresaId', nome: 'nome', spe: 'spe', cnpj: 'cnpj',
  area_total: 'areaTotal', tipo: 'tipo', unidades_previstas: 'unidadesPrevistas',
  valor_total: 'valorTotal', socio_nome: 'socioNome', socio_pct: 'socioPct',
  empresa_pct: 'empresaPct', corretor_pct: 'corretorPct',
  aliquota_tributaria: 'aliquotaTributaria',
  repasse_comissao_pct: 'repasseComissaoPct',
  comissao_sobre_acrescimos: 'comissaoSobreAcrescimos',
  inadimplencia_json: 'inadimplencia', reajuste_contratual_json: 'reajusteContratual',
  observacoes: 'observacoes', status: 'status', versao: 'versao',
  criado_em: 'criadoEm', atualizado_em: 'atualizadoEm'
};
const quadraFields = {
  id: 'id', empresa_id: 'empresaId', empreendimento_id: 'empreendimentoId',
  nome: 'nome', tipo_agrupamento: 'tipoAgrupamento', descricao: 'descricao',
  regras_json: 'regras', versao: 'versao', criado_em: 'criadoEm',
  atualizado_em: 'atualizadoEm'
};
const unidadeFields = {
  id: 'id', empresa_id: 'empresaId', empreendimento_id: 'empreendimentoId',
  quadra_id: 'quadraId', numero: 'numero', unidade: 'unidade',
  unidade_tipo: 'unidadeTipo', descricao: 'descricao', area: 'area',
  valor_venda: 'valorVenda', status: 'status', regras_json: 'regras',
  versao: 'versao', criado_em: 'criadoEm', atualizado_em: 'atualizadoEm'
};
const booleanos = new Set(['comissao_sobre_acrescimos']);
const jsons = new Set(['inadimplencia_json', 'reajuste_contratual_json', 'regras_json']);
function mapear(row, campos) {
  const result = {};
  for (const [coluna, campo] of Object.entries(campos)) {
    let valor = row[coluna] ?? null;
    if (booleanos.has(coluna)) valor = Boolean(valor);
    if (jsons.has(coluna) && valor != null) {
      // Nao mascarar dados ilegíveis na migracao.
      valor = typeof valor === 'string' ? JSON.parse(valor) : valor;
    }
    if ((coluna === 'criado_em' || coluna === 'atualizado_em') && typeof valor === 'string') {
      valor = valor.replace(' ', 'T');
    }
    result[campo] = valor;
  }
  return result;
}
function idPositivo(valor, bad) {
  const id = Number(valor);
  if (!Number.isSafeInteger(id) || id <= 0) throw bad(400, 'ID invalido');
  return id;
}
function paginar(query, padrao, bad) {
  const pagina = Number(query.pagina ?? 0), tamanho = Number(query.tamanho ?? padrao);
  if (!Number.isSafeInteger(pagina) || pagina < 0
      || !Number.isSafeInteger(tamanho) || tamanho < 1 || tamanho > 100
      || !Number.isSafeInteger(pagina * tamanho)) {
    throw bad(400, 'Paginacao invalida');
  }
  return { pagina, tamanho };
}
const paginaSpring = (rows, total, pagina, tamanho, mapearLinha) => ({
  content: rows.map(mapearLinha),
  totalElements: total,
  totalPages: Math.ceil(total / tamanho),
  size: tamanho, number: pagina,
  numberOfElements: rows.length,
  first: pagina === 0,
  last: (pagina + 1) * tamanho >= total,
  empty: rows.length === 0,
  sort: { sorted: false, unsorted: true, empty: true }
});

export function registerCatalogoRead(app, { db, exigirLogin, empresaAutorizada, exigirPermissao, handler, bad }) {
  const autorizar = async req => {
    await exigirPermissao(req, LEITURA);
    return empresaAutorizada(req);
  };
  async function buscarUm(tabela, id, empresa) {
    const [rows] = await db.execute(`SELECT * FROM ${tabela} WHERE id = ? AND empresa_id = ? LIMIT 1`, [id, empresa]);
    return rows[0] || null;
  }
  app.get('/api/empreendimentos', exigirLogin, handler(async (req, res) => {
    const empresa = await autorizar(req);
    const { pagina, tamanho } = paginar(req.query, 100, bad);
    const [totalRows] = await db.execute('SELECT COUNT(*) AS total FROM empreendimentos WHERE empresa_id = ?', [empresa]);
    const total = Number(totalRows[0].total);
    const [rows] = await db.execute(
      'SELECT * FROM empreendimentos WHERE empresa_id = ? ORDER BY nome, id LIMIT ? OFFSET ?',
      [empresa, tamanho, pagina * tamanho]
    );
    res.json(paginaSpring(rows, total, pagina, tamanho, x => mapear(x, empFields)));
  }));
  app.get('/api/empreendimentos/:id', exigirLogin, handler(async (req, res) => {
    const empresa = await autorizar(req);
    const row = await buscarUm('empreendimentos', idPositivo(req.params.id, bad), empresa);
    if (!row) throw bad(404, 'Empreendimento nao encontrado');
    res.json(mapear(row, empFields));
  }));
  app.get('/api/empreendimentos/:id/quadras', exigirLogin, handler(async (req, res) => {
    const empresa = await autorizar(req);
    const id = idPositivo(req.params.id, bad);
    const emp = await buscarUm('empreendimentos', id, empresa);
    if (!emp) throw bad(404, 'Empreendimento nao encontrado');
    const [rows] = await db.execute('SELECT * FROM quadras WHERE empreendimento_id = ? AND empresa_id = ? ORDER BY nome, id', [id, empresa]);
    res.json(rows.map(x => mapear(x, quadraFields)));
  }));
  app.get('/api/empreendimentos/:id/unidades', exigirLogin, handler(async (req, res) => {
    const empresa = await autorizar(req);
    const id = idPositivo(req.params.id, bad);
    const emp = await buscarUm('empreendimentos', id, empresa);
    if (!emp) throw bad(404, 'Empreendimento nao encontrado');
    const [rows] = await db.execute('SELECT * FROM unidades WHERE empreendimento_id = ? AND empresa_id = ? ORDER BY numero, id', [id, empresa]);
    res.json(rows.map(x => mapear(x, unidadeFields)));
  }));
}
