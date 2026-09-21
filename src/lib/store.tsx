import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addMonths, todayISO, uid } from "./format";
import { useAuth } from "./auth";

// ---------- Types ----------
export type EmpStatus = "planejamento" | "lancamento" | "em_vendas" | "concluido";
export type MatriculaStatus = "disponivel" | "reservado" | "vendido" | "cancelado";
export type VendaStatus = "ativa" | "cancelada" | "quitada";
export type ParcelaStatus = "pendente" | "paga" | "vencida" | "cancelada";
export type PagamentoTipo =
  | "avista"
  | "sinal"
  | "sinal_parcelado"
  | "parcelas"
  | "bem"
  | "sem_sinal"
  | "outro";

export type UnidadeTipo = "lote" | "apartamento" | "sala" | "casa" | "loja" | "outro";

export type EmpreendimentoTipo =
  | "loteamento"
  | "vertical"
  | "horizontal"
  | "comercial"
  | "misto"
  | "outro";

export type JurosTipo = "diario" | "mensal";
export type InicioJuros = "vencimento" | "apos_tolerancia";

export interface RegrasInadimplencia {
  correcaoPctMes: number;
  correcaoAtiva: boolean;
  correcaoIndice: string;
  jurosPctMes: number;
  jurosPctDia: number;
  jurosTipo: JurosTipo;
  jurosAtivo: boolean;
  moraPct: number;
  moraAtiva: boolean;
  diasTolerancia: number;
  toleranciaAtiva: boolean;
  inicioJuros: InicioJuros;
}

export const DEFAULT_REGRAS_INADIMPLENCIA: RegrasInadimplencia = {
  correcaoPctMes: 0,
  correcaoAtiva: false,
  correcaoIndice: "",
  jurosPctMes: 0,
  jurosPctDia: 0,
  jurosTipo: "mensal",
  jurosAtivo: false,
  moraPct: 0,
  moraAtiva: false,
  diasTolerancia: 0,
  toleranciaAtiva: false,
  inicioJuros: "apos_tolerancia",
};

export interface BemMaterial {
  tipo: string;
  descricao: string;
  valorAtribuido: number;
  placa: string;
  situacao: "prometido" | "entregue" | "transferido";
}

export interface PagamentoItem {
  id: string;
  tipo: PagamentoTipo;
  descricao: string;
  valor: number;
  parcelas: number;
  primeiroVencimento: string;
  status: string;
  observacoes?: string;
  bem?: BemMaterial;
}

export interface RegrasContrato {
  aliquotaTributaria: number;
  socioPct: number;
  empresaPct: number;
  entradaPctCorretor: number;
  parcelasPctCorretor: number;
  inadimplencia: RegrasInadimplencia;
}

export interface RegrasOperacao extends RegrasContrato {
  corretorPct: number;
}

export interface Empreendimento {
  id: string;
  nome: string;
  spe: string;
  cnpj: string;
  areaTotal: number;
  tipo: EmpreendimentoTipo;
  matriculasCount: number;
  valorTotal: number;
  socioPct: number;
  empresaPct: number;
  corretorPct: number;
  aliquotaTributaria: number;
  entradaPctCorretor?: number;
  parcelasPctCorretor?: number;
  inadimplencia?: RegrasInadimplencia;
  observacoes?: string;
  status: EmpStatus;
}

export interface Quadra {
  id: string;
  empreendimentoId: string;
  nome: string;
  descricao?: string;
  /** Quando ausente, herda as regras do empreendimento. */
  regras?: RegrasOperacao;
}

export interface Matricula {
  id: string;
  empreendimentoId: string;
  quadraId?: string;
  numero: string;
  unidade: string;
  unidadeTipo?: UnidadeTipo;
  descricao?: string;
  area: number;
  valorVenda: number;
  status: MatriculaStatus;
  /** Quando ausente, herda da quadra ou do empreendimento. */
  regras?: RegrasOperacao;
  compradorNome?: string;
  vendaId?: string;
}

export interface Venda {
  id: string;
  empreendimentoId: string;
  matriculaId: string;
  compradorNome: string;
  valorTotal: number;
  dataContrato: string;
  corretorNome: string;
  corretorPct: number;
  observacoes?: string;
  status: VendaStatus;
  composicao: PagamentoItem[];
  /** Regras congeladas no momento do contrato. */
  regras?: RegrasContrato;
}

export interface Parcela {
  id: string;
  vendaId: string;
  empreendimentoId: string;
  matriculaId: string;
  compradorNome: string;
  origemTipo: PagamentoTipo;
  origemDescricao: string;
  numero: number;
  totalParcelas: number;
  vencimento: string;
  valor: number;
  valorPago: number;
  dataPagamento?: string;
  status: ParcelaStatus;
  regrasInadimplencia?: RegrasInadimplencia;
}

export interface Movimento {
  id: string;
  parcelaId: string;
  vendaId: string;
  empreendimentoId: string;
  matriculaId: string;
  compradorNome: string;
  corretorNome: string;
  origem: PagamentoTipo;
  origemDescricao: string;
  data: string;
  usuario: string;
  valorRecebido: number;
  impostoReservado: number;
  comissaoPaga: number;
  empresaValor: number;
  socioValor: number;
  aliquotaTributariaAplicada?: number;
  empresaPctAplicada?: number;
  socioPctAplicada?: number;
}

/** Compatibilidade com dados locais antigos e cadastros auxiliares. */
export interface Config extends RegrasInadimplencia {
  corretorPctPadrao: number;
  entradaPctCorretor: number;
  parcelasPctCorretor: number;
  aliquotaPadrao: number;
  recebedores: { nome: string; tipo: "socio" | "empresa" | "corretor" }[];
  statusVenda: string[];
  formasPagamento: string[];
  aliquotasPorSpe: Record<string, number>;
}

export interface TrimestreItem {
  id: string;
  trimestre: string;
  contratosSeparados: boolean;
  relatoriosPreparados: boolean;
  boletosReunidos: boolean;
  documentosEnviados: boolean;
  guiaRecebida: boolean;
  guiaPaga: boolean;
  valorContador: number;
  status: "aberto" | "andamento" | "concluido";
}

export interface State {
  empreendimentos: Empreendimento[];
  quadras: Quadra[];
  matriculas: Matricula[];
  vendas: Venda[];
  parcelas: Parcela[];
  movimentos: Movimento[];
  config: Config;
  trimestres: TrimestreItem[];
}

const DATA_KEY = "imobcontrol.v2";

const DEFAULT_CONFIG: Config = {
  corretorPctPadrao: 0,
  entradaPctCorretor: 0,
  parcelasPctCorretor: 0,
  aliquotaPadrao: 0,
  ...DEFAULT_REGRAS_INADIMPLENCIA,
  recebedores: [],
  statusVenda: ["ativa", "cancelada", "quitada"],
  formasPagamento: ["À vista", "Sinal + parcelas", "Bem material", "Outro"],
  aliquotasPorSpe: {},
};

function makeEmptyState(): State {
  return {
    empreendimentos: [],
    quadras: [],
    matriculas: [],
    vendas: [],
    parcelas: [],
    movimentos: [],
    config: {
      ...DEFAULT_CONFIG,
      recebedores: [],
      statusVenda: [...DEFAULT_CONFIG.statusVenda],
      formasPagamento: [...DEFAULT_CONFIG.formasPagamento],
      aliquotasPorSpe: {},
    },
    trimestres: [],
  };
}

function pareceSeedAntigo(state: State) {
  const nomesDemo = new Set([
    "Residencial Alvorada",
    "Loteamento Vila Verde",
    "Edifício Panorama",
  ]);
  return state.empreendimentos.some((e) => nomesDemo.has(e.nome));
}

function loadState(): State {
  if (typeof window === "undefined") return makeEmptyState();

  try {
    const raw = window.localStorage.getItem(DATA_KEY);
    if (!raw) return makeEmptyState();

    const parsed = JSON.parse(raw) as State;
    if (pareceSeedAntigo(parsed)) {
      const empty = makeEmptyState();
      window.localStorage.setItem(DATA_KEY, JSON.stringify(empty));
      return empty;
    }

    return {
      empreendimentos: parsed.empreendimentos ?? [],
      quadras: parsed.quadras ?? [],
      matriculas: parsed.matriculas ?? [],
      vendas: parsed.vendas ?? [],
      parcelas: parsed.parcelas ?? [],
      movimentos: parsed.movimentos ?? [],
      trimestres: parsed.trimestres ?? [],
      config: {
        ...DEFAULT_CONFIG,
        ...(parsed.config ?? {}),
        recebedores: parsed.config?.recebedores ?? [],
        statusVenda: parsed.config?.statusVenda ?? DEFAULT_CONFIG.statusVenda,
        formasPagamento: parsed.config?.formasPagamento ?? DEFAULT_CONFIG.formasPagamento,
        aliquotasPorSpe: parsed.config?.aliquotasPorSpe ?? {},
      },
    };
  } catch {
    return makeEmptyState();
  }
}

function snapshotInadimplencia(regra: RegrasInadimplencia): RegrasInadimplencia {
  return { ...regra };
}

function snapshotRegrasContrato(regra: RegrasOperacao): RegrasContrato {
  return {
    aliquotaTributaria: regra.aliquotaTributaria,
    socioPct: regra.socioPct,
    empresaPct: regra.empresaPct,
    entradaPctCorretor: regra.corretorPct,
    parcelasPctCorretor: regra.corretorPct,
    inadimplencia: snapshotInadimplencia(regra.inadimplencia),
  };
}

export function regrasEfetivasEmpreendimento(
  emp: Empreendimento,
  cfg: Config,
): RegrasOperacao {
  return {
    aliquotaTributaria: emp.aliquotaTributaria,
    socioPct: emp.socioPct,
    empresaPct: emp.empresaPct,
    corretorPct: emp.corretorPct,
    entradaPctCorretor: emp.corretorPct,
    parcelasPctCorretor: emp.corretorPct,
    inadimplencia: snapshotInadimplencia(emp.inadimplencia ?? cfg),
  };
}

export function regrasEfetivasUnidade(
  emp: Empreendimento,
  matricula: Matricula,
  quadra: Quadra | undefined,
  cfg: Config,
): { regras: RegrasOperacao; origem: "empreendimento" | "quadra" | "unidade" } {
  if (matricula.regras) {
    return {
      regras: { ...matricula.regras, inadimplencia: { ...matricula.regras.inadimplencia } },
      origem: "unidade",
    };
  }
  if (quadra?.regras) {
    return {
      regras: { ...quadra.regras, inadimplencia: { ...quadra.regras.inadimplencia } },
      origem: "quadra",
    };
  }
  return { regras: regrasEfetivasEmpreendimento(emp, cfg), origem: "empreendimento" };
}

function regrasContrato(venda: Venda, emp: Empreendimento, cfg: Config): RegrasContrato {
  return venda.regras ?? snapshotRegrasContrato(regrasEfetivasEmpreendimento(emp, cfg));
}

// ---------- Context ----------
interface Ctx {
  state: State;
  setState: (updater: (s: State) => State) => void;
  resetSeed: () => void;
  addEmpreendimento: (e: Omit<Empreendimento, "id">) => Empreendimento;
  updateEmpreendimento: (id: string, patch: Partial<Empreendimento>) => void;
  addQuadra: (q: Omit<Quadra, "id">) => Quadra;
  updateQuadra: (id: string, patch: Partial<Quadra>) => void;
  addMatricula: (m: Omit<Matricula, "id">) => Matricula;
  updateMatricula: (id: string, patch: Partial<Matricula>) => void;
  addVenda: (v: Omit<Venda, "id" | "status" | "regras"> & { status?: VendaStatus }) => Venda;
  receberParcela: (id: string, valorRecebido?: number, data?: string) => void;
  reverterParcela: (id: string) => void;
  marcarParcelaPaga: (id: string, dataPagamento?: string) => void;
  desmarcarParcela: (id: string) => void;
  updateConfig: (patch: Partial<Config>) => void;
  updateTrimestre: (id: string, patch: Partial<TrimestreItem>) => void;
}

const StoreCtx = createContext<Ctx | null>(null);

function computeReceber(
  parcela: Parcela,
  valorRecebido: number,
  data: string,
  state: State,
  usuarioNome: string,
) {
  const venda = state.vendas.find((v) => v.id === parcela.vendaId);
  const emp = state.empreendimentos.find((e) => e.id === parcela.empreendimentoId);
  if (!venda || !emp) return null;

  const regra = regrasContrato(venda, emp, state.config);
  const imposto = valorRecebido * (regra.aliquotaTributaria / 100);

  const comissaoTotal = venda.valorTotal * ((venda.corretorPct || 0) / 100);
  const jaPago = state.movimentos
    .filter((m) => m.vendaId === venda.id)
    .reduce((a, m) => a + m.comissaoPaga, 0);
  const restanteComissao = Math.max(0, comissaoTotal - jaPago);
  const pctCor = Math.max(0, venda.corretorPct || 0);

  let comissaoUsada = valorRecebido * (pctCor / 100);
  if (comissaoUsada > restanteComissao) comissaoUsada = restanteComissao;
  if (comissaoUsada + imposto > valorRecebido) {
    comissaoUsada = Math.max(0, valorRecebido - imposto);
  }

  const restante = Math.max(0, valorRecebido - imposto - comissaoUsada);
  const totalPct = regra.socioPct + regra.empresaPct;
  const empresa = totalPct ? restante * (regra.empresaPct / totalPct) : 0;
  const socio = totalPct ? restante * (regra.socioPct / totalPct) : 0;

  const mov: Movimento = {
    id: uid(),
    parcelaId: parcela.id,
    vendaId: venda.id,
    empreendimentoId: emp.id,
    matriculaId: parcela.matriculaId,
    compradorNome: parcela.compradorNome,
    corretorNome: venda.corretorNome,
    origem: parcela.origemTipo,
    origemDescricao: parcela.origemDescricao,
    data,
    usuario: usuarioNome,
    valorRecebido,
    impostoReservado: imposto,
    comissaoPaga: comissaoUsada,
    empresaValor: empresa,
    socioValor: socio,
    aliquotaTributariaAplicada: regra.aliquotaTributaria,
    empresaPctAplicada: regra.empresaPct,
    socioPctAplicada: regra.socioPct,
  };

  return mov;
}

function vendaQuitadaAposPagamento(parcelas: Parcela[], vendaId: string, parcelaId: string) {
  const relacionadas = parcelas.filter(
    (p) => p.vendaId === vendaId && p.status !== "cancelada",
  );
  if (relacionadas.length === 0) return false;
  return relacionadas.every((p) => p.id === parcelaId || p.status === "paga");
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const usuarioNome = usuario?.nome?.trim() || "Usuário autenticado";
  const [state, setStateRaw] = useState<State>(() => makeEmptyState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStateRaw(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(DATA_KEY, JSON.stringify(state));
    } catch {
      // Falha de persistência local não deve derrubar a interface.
    }
  }, [state, hydrated]);

  const api = useMemo<Ctx>(() => {
    const setState = (updater: (s: State) => State) => setStateRaw(updater);

    return {
      state,
      setState,
      resetSeed: () => setStateRaw(makeEmptyState()),
      addEmpreendimento: (e) => {
        const n: Empreendimento = { ...e, id: uid() };
        setStateRaw((s) => ({ ...s, empreendimentos: [...s.empreendimentos, n] }));
        return n;
      },
      updateEmpreendimento: (id, patch) =>
        setStateRaw((s) => ({
          ...s,
          empreendimentos: s.empreendimentos.map((x) =>
            x.id === id ? { ...x, ...patch } : x,
          ),
        })),
      addQuadra: (q) => {
        const n: Quadra = { ...q, id: uid() };
        setStateRaw((s) => ({ ...s, quadras: [...s.quadras, n] }));
        return n;
      },
      updateQuadra: (id, patch) =>
        setStateRaw((s) => ({
          ...s,
          quadras: s.quadras.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      addMatricula: (m) => {
        const n: Matricula = { ...m, id: uid() };
        setStateRaw((s) => ({ ...s, matriculas: [...s.matriculas, n] }));
        return n;
      },
      updateMatricula: (id, patch) =>
        setStateRaw((s) => ({
          ...s,
          matriculas: s.matriculas.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      addVenda: (v) => {
        const emp = state.empreendimentos.find((e) => e.id === v.empreendimentoId);
        const mat = state.matriculas.find((m) => m.id === v.matriculaId);
        if (!emp || !mat) throw new Error("Empreendimento ou unidade não encontrados para a venda");
        const quadra = mat.quadraId ? state.quadras.find((q) => q.id === mat.quadraId) : undefined;
        const efetiva = regrasEfetivasUnidade(emp, mat, quadra, state.config).regras;

        const vId = uid();
        const newVenda: Venda = {
          ...v,
          id: vId,
          status: v.status ?? "ativa",
          regras: snapshotRegrasContrato(efetiva),
        };
        const newParcelas: Parcela[] = [];

        for (const item of newVenda.composicao) {
          if (item.tipo === "bem") continue;
          const parcelado = item.tipo === "parcelas" || item.tipo === "sinal_parcelado";
          const n = parcelado ? Math.max(1, item.parcelas || 1) : 1;
          for (let i = 1; i <= n; i++) {
            newParcelas.push({
              id: uid(),
              vendaId: vId,
              empreendimentoId: newVenda.empreendimentoId,
              matriculaId: newVenda.matriculaId,
              compradorNome: newVenda.compradorNome,
              origemTipo: item.tipo,
              origemDescricao: item.descricao || item.tipo,
              numero: i,
              totalParcelas: n,
              vencimento: addMonths(item.primeiroVencimento, i - 1),
              valor: item.valor,
              valorPago: 0,
              status: "pendente",
              regrasInadimplencia: snapshotInadimplencia(efetiva.inadimplencia),
            });
          }
        }

        setStateRaw((s) => ({
          ...s,
          vendas: [...s.vendas, newVenda],
          parcelas: [...s.parcelas, ...newParcelas],
          matriculas: s.matriculas.map((m) =>
            m.id === newVenda.matriculaId
              ? {
                  ...m,
                  status: "vendido",
                  compradorNome: newVenda.compradorNome,
                  vendaId: vId,
                }
              : m,
          ),
        }));
        return newVenda;
      },
      receberParcela: (id, valorRecebido, dataParam) => {
        setStateRaw((s) => {
          const p = s.parcelas.find((x) => x.id === id);
          if (!p || p.status === "paga" || p.status === "cancelada") return s;

          const data = dataParam ?? todayISO();
          const dataReferencia = new Date(`${data}T12:00:00`);
          const devido = inadimplenciaCalc(p, s.config, dataReferencia).atualizado;
          const valor = valorRecebido ?? devido;
          if (valor + 0.01 < devido) return s;

          const mov = computeReceber(p, valor, data, s, usuarioNome);
          if (!mov) return s;
          const quitada = vendaQuitadaAposPagamento(s.parcelas, p.vendaId, p.id);

          return {
            ...s,
            parcelas: s.parcelas.map((x) =>
              x.id === id
                ? { ...x, status: "paga", valorPago: valor, dataPagamento: data }
                : x,
            ),
            vendas: s.vendas.map((v) =>
              v.id === p.vendaId && quitada ? { ...v, status: "quitada" } : v,
            ),
            movimentos: [...s.movimentos, mov],
          };
        });
      },
      reverterParcela: (id) => {
        setStateRaw((s) => {
          const p = s.parcelas.find((x) => x.id === id);
          if (!p) return s;
          return {
            ...s,
            parcelas: s.parcelas.map((x) =>
              x.id === id
                ? { ...x, status: "pendente", valorPago: 0, dataPagamento: undefined }
                : x,
            ),
            vendas: s.vendas.map((v) =>
              v.id === p.vendaId && v.status === "quitada" ? { ...v, status: "ativa" } : v,
            ),
            movimentos: s.movimentos.filter((m) => m.parcelaId !== id),
          };
        });
      },
      marcarParcelaPaga: (id, dataPagamento) => {
        setStateRaw((s) => {
          const p = s.parcelas.find((x) => x.id === id);
          if (!p || p.status === "paga" || p.status === "cancelada") return s;
          const data = dataPagamento ?? todayISO();
          const dataReferencia = new Date(`${data}T12:00:00`);
          const devido = inadimplenciaCalc(p, s.config, dataReferencia).atualizado;
          const mov = computeReceber(p, devido, data, s, usuarioNome);
          const quitada = vendaQuitadaAposPagamento(s.parcelas, p.vendaId, p.id);

          return {
            ...s,
            parcelas: s.parcelas.map((x) =>
              x.id === id
                ? { ...x, status: "paga", valorPago: devido, dataPagamento: data }
                : x,
            ),
            vendas: s.vendas.map((v) =>
              v.id === p.vendaId && quitada ? { ...v, status: "quitada" } : v,
            ),
            movimentos: mov ? [...s.movimentos, mov] : s.movimentos,
          };
        });
      },
      desmarcarParcela: (id) => {
        setStateRaw((s) => {
          const p = s.parcelas.find((x) => x.id === id);
          if (!p) return s;
          return {
            ...s,
            parcelas: s.parcelas.map((x) =>
              x.id === id
                ? { ...x, status: "pendente", valorPago: 0, dataPagamento: undefined }
                : x,
            ),
            vendas: s.vendas.map((v) =>
              v.id === p.vendaId && v.status === "quitada" ? { ...v, status: "ativa" } : v,
            ),
            movimentos: s.movimentos.filter((m) => m.parcelaId !== id),
          };
        });
      },
      updateConfig: (patch) =>
        setStateRaw((s) => ({ ...s, config: { ...s.config, ...patch } })),
      updateTrimestre: (id, patch) =>
        setStateRaw((s) => ({
          ...s,
          trimestres: s.trimestres.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
    };
  }, [state, usuarioNome]);

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// ---------- Derived selectors ----------
export function vendaTotais(v: Venda, parcelas: Parcela[]) {
  const ps = parcelas.filter((p) => p.vendaId === v.id);
  const recebidoFinanceiro = ps.reduce((a, p) => a + (p.valorPago || 0), 0);
  const bens = v.composicao
    .filter((item) => item.tipo === "bem")
    .reduce((a, item) => a + item.valor, 0);
  const recebido = Math.min(v.valorTotal, recebidoFinanceiro + bens);
  const previsto = v.valorTotal;
  const saldo = Math.max(0, previsto - recebido);
  return { recebido, previsto, saldo };
}

export function empTotais(empId: string, vendas: Venda[], parcelas: Parcela[]) {
  const vs = vendas.filter((v) => v.empreendimentoId === empId && v.status !== "cancelada");
  const vendido = vs.reduce((a, v) => a + v.valorTotal, 0);
  const vendaIds = new Set(vs.map((v) => v.id));
  const recebido = parcelas
    .filter((p) => p.empreendimentoId === empId && vendaIds.has(p.vendaId))
    .reduce((a, p) => a + (p.valorPago || 0), 0);
  const saldo = Math.max(0, vendido - recebido);
  return { vendas: vs.length, vendido, recebido, saldo };
}

export function comissaoDaVenda(
  v: Venda,
  parcelas: Parcela[],
  cfg: Config,
  movimentos?: Movimento[],
) {
  const total = v.valorTotal * (v.corretorPct / 100);
  if (movimentos) {
    const relacionados = movimentos.filter((m) => m.vendaId === v.id);
    const pago = relacionados.reduce((a, m) => a + m.comissaoPaga, 0);
    const repasses = relacionados.map((m) => ({
      parcelaId: m.parcelaId,
      data: m.data,
      origem: m.origemDescricao,
      valorParcela: m.valorRecebido,
      valorRepasse: m.comissaoPaga,
    }));
    return { total, pago, saldo: Math.max(0, total - pago), repasses };
  }

  const ps = parcelas
    .filter((p) => p.vendaId === v.id && p.status === "paga")
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  let restante = total;
  const repasses: {
    parcelaId: string;
    data: string;
    origem: string;
    valorParcela: number;
    valorRepasse: number;
  }[] = [];
  for (const p of ps) {
    if (restante <= 0) break;
    const pct = Math.max(0, v.corretorPct || 0);
    let repasse = p.valorPago * (pct / 100);
    if (repasse > restante) repasse = restante;
    restante -= repasse;
    repasses.push({
      parcelaId: p.id,
      data: p.dataPagamento || p.vencimento,
      origem: p.origemDescricao,
      valorParcela: p.valorPago,
      valorRepasse: repasse,
    });
  }
  return { total, pago: total - restante, saldo: restante, repasses };
}

export function previsaoQuitacaoComissao(
  v: Venda,
  parcelas: Parcela[],
  cfg: Config,
  movimentos?: Movimento[],
) {
  const comissao = comissaoDaVenda(v, parcelas, cfg, movimentos);
  if (comissao.total <= 0 || comissao.saldo <= 0.01) {
    return {
      quitada: true,
      saldo: 0,
      recebimentosRestantes: 0,
      parcelasRestantes: 0,
      entradasRestantes: 0,
      dataPrevista: undefined as string | undefined,
      parcelaQuitacao: undefined as Parcela | undefined,
      coberturaSuficiente: true,
    };
  }

  const percentual = Math.max(0, v.corretorPct || 0);
  if (percentual <= 0) {
    return {
      quitada: false,
      saldo: comissao.saldo,
      recebimentosRestantes: 0,
      parcelasRestantes: 0,
      entradasRestantes: 0,
      dataPrevista: undefined as string | undefined,
      parcelaQuitacao: undefined as Parcela | undefined,
      coberturaSuficiente: false,
    };
  }

  const pendentes = parcelas
    .filter(
      (p) =>
        p.vendaId === v.id &&
        p.status !== "paga" &&
        p.status !== "cancelada",
    )
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  let restante = comissao.saldo;
  let recebimentosRestantes = 0;
  let parcelasRestantes = 0;
  let entradasRestantes = 0;
  let parcelaQuitacao: Parcela | undefined;

  for (const p of pendentes) {
    const repassePrevisto = Math.max(0, p.valor) * (percentual / 100);
    if (repassePrevisto <= 0) continue;

    recebimentosRestantes += 1;
    if (p.origemTipo === "parcelas" || p.origemTipo === "sinal_parcelado") {
      parcelasRestantes += 1;
    } else {
      entradasRestantes += 1;
    }

    restante -= Math.min(restante, repassePrevisto);
    parcelaQuitacao = p;

    if (restante <= 0.01) break;
  }

  return {
    quitada: false,
    saldo: comissao.saldo,
    recebimentosRestantes,
    parcelasRestantes,
    entradasRestantes,
    dataPrevista: restante <= 0.01 ? parcelaQuitacao?.vencimento : undefined,
    parcelaQuitacao: restante <= 0.01 ? parcelaQuitacao : undefined,
    coberturaSuficiente: restante <= 0.01,
  };
}

export function inadimplenciaCalc(
  parcela: Parcela,
  cfg: Config,
  hoje: Date = new Date(),
) {
  const regra = parcela.regrasInadimplencia ?? cfg;
  const venc = new Date(`${parcela.vencimento}T00:00:00`);
  const diffMs = hoje.getTime() - venc.getTime();
  const diasAtraso = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const tolerancia = regra.toleranciaAtiva ? regra.diasTolerancia || 0 : 0;
  const dentroTolerancia = diasAtraso > 0 && diasAtraso <= tolerancia;
  const diasEfetivos =
    diasAtraso <= tolerancia
      ? 0
      : regra.inicioJuros === "vencimento"
        ? diasAtraso
        : diasAtraso - tolerancia;
  const mesesAtraso = diasEfetivos / 30;
  const base = parcela.valor;

  const correcao = regra.correcaoAtiva
    ? base * ((regra.correcaoPctMes || 0) / 100) * mesesAtraso
    : 0;
  const juros = regra.jurosAtivo
    ? regra.jurosTipo === "diario"
      ? base * ((regra.jurosPctDia || 0) / 100) * diasEfetivos
      : base * ((regra.jurosPctMes || 0) / 100) * mesesAtraso
    : 0;
  const mora =
    regra.moraAtiva && diasEfetivos > 0 ? base * ((regra.moraPct || 0) / 100) : 0;
  const atualizado = base + correcao + juros + mora;

  return { diasAtraso, diasEfetivos, dentroTolerancia, correcao, juros, mora, atualizado };
}

// ---------- Distribuição financeira ----------
export interface MemoriaCalculo {
  valorRecebido: number;
  aliquota: number;
  imposto: number;
  comissao: number;
  restante: number;
  empresaPct: number;
  empresaValor: number;
  socioPct: number;
  socioValor: number;
}

export function memoriaDoMovimento(m: Movimento, emp?: Empreendimento): MemoriaCalculo {
  const restante = Math.max(0, m.valorRecebido - m.impostoReservado - m.comissaoPaga);
  const empresaPctBase = m.empresaPctAplicada ?? emp?.empresaPct ?? 0;
  const socioPctBase = m.socioPctAplicada ?? emp?.socioPct ?? 0;
  const totalPct = empresaPctBase + socioPctBase;

  return {
    valorRecebido: m.valorRecebido,
    aliquota: m.aliquotaTributariaAplicada ?? emp?.aliquotaTributaria ?? 0,
    imposto: m.impostoReservado,
    comissao: m.comissaoPaga,
    restante,
    empresaPct: totalPct ? (empresaPctBase / totalPct) * 100 : 0,
    empresaValor: m.empresaValor,
    socioPct: totalPct ? (socioPctBase / totalPct) * 100 : 0,
    socioValor: m.socioValor,
  };
}

export function distribuicaoPrevista(
  empreendimentos: Empreendimento[],
  vendas: Venda[],
  parcelas: Parcela[],
  cfg: Config,
) {
  void parcelas;
  let empresa = 0;
  let socio = 0;
  let imposto = 0;
  let comissao = 0;

  for (const v of vendas) {
    if (v.status === "cancelada") continue;
    const emp = empreendimentos.find((e) => e.id === v.empreendimentoId);
    if (!emp) continue;

    const regra = regrasContrato(v, emp, cfg);
    const previsto = v.valorTotal;
    const imp = previsto * (regra.aliquotaTributaria / 100);
    const com = Math.min(
      Math.max(0, previsto - imp),
      v.valorTotal * ((v.corretorPct || 0) / 100),
    );
    const restante = Math.max(0, previsto - imp - com);
    const totalPct = regra.socioPct + regra.empresaPct;

    imposto += imp;
    comissao += com;
    empresa += totalPct ? restante * (regra.empresaPct / totalPct) : 0;
    socio += totalPct ? restante * (regra.socioPct / totalPct) : 0;
  }

  return { empresa, socio, imposto, comissao };
}
