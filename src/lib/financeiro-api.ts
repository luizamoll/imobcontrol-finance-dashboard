import { apiJson } from "@/lib/api";
import type {
  Movimento,
  PagamentoItem,
  Parcela,
  RegrasContrato,
  RegrasInadimplencia,
  Venda,
} from "@/lib/store";

type Pagina<T> = { content: T[]; totalElements: number };

type VendaApi = {
  id: number;
  empresaId: number;
  empreendimentoId: number;
  unidadeId: number;
  clienteId: number;
  compradorNome: string;
  valorTotal: number;
  dataContrato: string;
  corretorNome: string | null;
  corretorPct: number;
  repasseComissaoPct: number;
  comissaoSobreAcrescimos: boolean;
  observacoes: string | null;
  status: string;
  regras: {
    aliquotaTributaria?: number;
    socioPct?: number;
    empresaPct?: number;
    corretorPct?: number;
    repasseComissaoPct?: number;
    comissaoSobreAcrescimos?: boolean;
    inadimplencia?: Partial<RegrasInadimplencia>;
  };
  versao: number;
  composicao: Array<{
    id: number;
    tipo: string;
    descricao: string | null;
    valor: number;
    parcelas: number;
    primeiroVencimento: string;
    status: string;
  }>;
};

type ParcelaApi = {
  id: number;
  vendaId: number;
  empreendimentoId: number;
  unidadeId: number;
  clienteId: number;
  compradorNome: string;
  origemTipo: string;
  origemDescricao: string | null;
  numero: number;
  totalParcelas: number;
  vencimento: string;
  valor: number;
  valorPago: number;
  dataPagamento: string | null;
  status: string;
  regrasInadimplencia: Partial<RegrasInadimplencia> | null;
  versao: number;
};

type MovimentoApi = {
  id: number;
  parcelaId: number;
  vendaId: number;
  empreendimentoId: number;
  unidadeId: number;
  clienteId: number;
  compradorNome: string;
  corretorNome: string | null;
  origem: string;
  origemDescricao: string | null;
  data: string;
  usuario: string;
  valorRecebido: number;
  impostoReservado: number;
  comissaoPaga: number;
  empresaValor: number;
  socioValor: number;
  aliquotaTributariaAplicada: number | null;
  empresaPctAplicada: number | null;
  socioPctAplicada: number | null;
  comissaoBaseCalculo: number | null;
  comissaoRepassePctAplicado: number | null;
  comissaoSobreAcrescimosAplicada: boolean | null;
  acrescimosRecebidos: number | null;
  comissaoTeorica: number | null;
  saldoComissaoApos: number | null;
};

const INAD_PADRAO: RegrasInadimplencia = {
  correcaoPctMes: 0,
  correcaoAtiva: false,
  correcaoIndice: "",
  jurosPctMes: 0,
  jurosPctDia: 0,
  jurosTipo: "mensal",
  jurosAtivo: false,
  moraPct: 0,
  moraAtiva: false,
  toleranciaAtiva: false,
  diasTolerancia: 0,
  inicioJuros: "vencimento",
};

function regrasContrato(v: VendaApi): RegrasContrato {
  const r = v.regras ?? {};
  return {
    aliquotaTributaria: Number(r.aliquotaTributaria ?? 0),
    socioPct: Number(r.socioPct ?? 0),
    empresaPct: Number(r.empresaPct ?? 0),
    entradaPctCorretor: Number(v.corretorPct ?? r.corretorPct ?? 0),
    parcelasPctCorretor: Number(v.corretorPct ?? r.corretorPct ?? 0),
    repasseComissaoPct: Number(v.repasseComissaoPct ?? r.repasseComissaoPct ?? 50),
    comissaoSobreAcrescimos:
      v.comissaoSobreAcrescimos ?? r.comissaoSobreAcrescimos ?? false,
    inadimplencia: { ...INAD_PADRAO, ...(r.inadimplencia ?? {}) },
  };
}

function vendaFromApi(v: VendaApi): Venda {
  return {
    id: String(v.id),
    empreendimentoId: String(v.empreendimentoId),
    matriculaId: String(v.unidadeId),
    clienteId: String(v.clienteId),
    compradorNome: v.compradorNome,
    valorTotal: Number(v.valorTotal),
    dataContrato: v.dataContrato,
    corretorNome: v.corretorNome ?? "",
    corretorPct: Number(v.corretorPct ?? 0),
    repasseComissaoPct: Number(v.repasseComissaoPct ?? 50),
    comissaoSobreAcrescimos: Boolean(v.comissaoSobreAcrescimos),
    observacoes: v.observacoes ?? undefined,
    status: v.status as Venda["status"],
    composicao: v.composicao.map((item) => ({
      id: String(item.id),
      tipo: item.tipo as PagamentoItem["tipo"],
      descricao: item.descricao ?? "",
      valor: Number(item.valor),
      parcelas: item.parcelas,
      primeiroVencimento: item.primeiroVencimento,
      status: item.status as PagamentoItem["status"],
    })),
    regras: regrasContrato(v),
    versao: v.versao,
  };
}

function parcelaFromApi(p: ParcelaApi): Parcela {
  return {
    id: String(p.id),
    vendaId: String(p.vendaId),
    empreendimentoId: String(p.empreendimentoId),
    matriculaId: String(p.unidadeId),
    clienteId: String(p.clienteId),
    compradorNome: p.compradorNome,
    origemTipo: p.origemTipo as Parcela["origemTipo"],
    origemDescricao: p.origemDescricao ?? p.origemTipo,
    numero: p.numero,
    totalParcelas: p.totalParcelas,
    vencimento: p.vencimento,
    valor: Number(p.valor),
    valorPago: Number(p.valorPago),
    dataPagamento: p.dataPagamento ?? undefined,
    status: p.status as Parcela["status"],
    regrasInadimplencia: { ...INAD_PADRAO, ...(p.regrasInadimplencia ?? {}) },
    versao: p.versao,
  };
}

function movimentoFromApi(m: MovimentoApi): Movimento {
  return {
    id: String(m.id),
    parcelaId: String(m.parcelaId),
    vendaId: String(m.vendaId),
    empreendimentoId: String(m.empreendimentoId),
    matriculaId: String(m.unidadeId),
    clienteId: String(m.clienteId),
    compradorNome: m.compradorNome,
    corretorNome: m.corretorNome ?? "",
    origem: m.origem as Movimento["origem"],
    origemDescricao: m.origemDescricao ?? m.origem,
    data: m.data,
    usuario: m.usuario,
    valorRecebido: Number(m.valorRecebido),
    impostoReservado: Number(m.impostoReservado),
    comissaoPaga: Number(m.comissaoPaga),
    empresaValor: Number(m.empresaValor),
    socioValor: Number(m.socioValor),
    aliquotaTributariaAplicada:
      m.aliquotaTributariaAplicada == null ? undefined : Number(m.aliquotaTributariaAplicada),
    empresaPctAplicada:
      m.empresaPctAplicada == null ? undefined : Number(m.empresaPctAplicada),
    socioPctAplicada:
      m.socioPctAplicada == null ? undefined : Number(m.socioPctAplicada),
    comissaoBaseCalculo:
      m.comissaoBaseCalculo == null ? undefined : Number(m.comissaoBaseCalculo),
    comissaoRepassePctAplicado:
      m.comissaoRepassePctAplicado == null ? undefined : Number(m.comissaoRepassePctAplicado),
    comissaoSobreAcrescimosAplicada:
      m.comissaoSobreAcrescimosAplicada == null
        ? undefined
        : Boolean(m.comissaoSobreAcrescimosAplicada),
    acrescimosRecebidos:
      m.acrescimosRecebidos == null ? undefined : Number(m.acrescimosRecebidos),
    comissaoTeorica:
      m.comissaoTeorica == null ? undefined : Number(m.comissaoTeorica),
    saldoComissaoApos:
      m.saldoComissaoApos == null ? undefined : Number(m.saldoComissaoApos),
  };
}

export async function carregarFinanceiro(empresaId: number) {
  const [vendas, parcelas, movimentos] = await Promise.all([
    apiJson<Pagina<VendaApi>>("/api/vendas?pagina=0&tamanho=100", { empresaId }),
    apiJson<ParcelaApi[]>("/api/parcelas", { empresaId }),
    apiJson<MovimentoApi[]>("/api/movimentos", { empresaId }),
  ]);

  return {
    vendas: vendas.content.map(vendaFromApi),
    parcelas: parcelas.map(parcelaFromApi),
    movimentos: movimentos.map(movimentoFromApi),
  };
}

function vendaBody(v: Omit<Venda, "id" | "status" | "regras"> & { status?: Venda["status"] }) {
  if (!v.clienteId) throw new Error("Selecione um cliente cadastrado");
  return {
    empreendimentoId: Number(v.empreendimentoId),
    unidadeId: Number(v.matriculaId),
    clienteId: Number(v.clienteId),
    valorTotal: v.valorTotal,
    dataContrato: v.dataContrato,
    corretorNome: v.corretorNome || null,
    corretorPct: v.corretorPct,
    repasseComissaoPct: v.repasseComissaoPct ?? 50,
    comissaoSobreAcrescimos: v.comissaoSobreAcrescimos ?? false,
    observacoes: v.observacoes ?? null,
    composicao: v.composicao.map((item) => ({
      tipo: item.tipo,
      descricao: item.descricao || null,
      valor: item.valor,
      parcelas: Math.max(1, item.parcelas || 1),
      primeiroVencimento: item.primeiroVencimento,
      status: item.status ?? "pendente",
    })),
    versao: "versao" in v ? v.versao ?? null : null,
  };
}

export async function criarVendaRemota(
  empresaId: number,
  venda: Omit<Venda, "id" | "status" | "regras"> & { status?: Venda["status"] },
) {
  const criada = await apiJson<VendaApi>("/api/vendas", {
    method: "POST",
    empresaId,
    body: JSON.stringify(vendaBody(venda)),
  });
  return vendaFromApi(criada);
}

export async function atualizarVendaRemota(
  empresaId: number,
  atual: Venda,
  patch: Partial<Venda>,
) {
  const proxima = { ...atual, ...patch };
  const salva = await apiJson<VendaApi>(`/api/vendas/${atual.id}`, {
    method: "PUT",
    empresaId,
    body: JSON.stringify(vendaBody(proxima)),
  });
  return vendaFromApi(salva);
}

export async function receberParcelaRemota(
  empresaId: number,
  parcelaId: string,
  valorRecebido?: number,
  data?: string,
) {
  await apiJson<MovimentoApi>(`/api/parcelas/${parcelaId}/receber`, {
    method: "POST",
    empresaId,
    body: JSON.stringify({
      valorRecebido: valorRecebido ?? null,
      data: data ?? null,
    }),
  });
  return carregarFinanceiro(empresaId);
}

export async function reverterParcelaRemota(
  empresaId: number,
  parcelaId: string,
) {
  await apiJson<void>(`/api/parcelas/${parcelaId}/reverter`, {
    method: "POST",
    empresaId,
  });
  return carregarFinanceiro(empresaId);
}
