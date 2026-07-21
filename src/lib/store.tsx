import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addMonths, todayISO, uid } from "./format";

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

export interface Empreendimento {
  id: string;
  nome: string;
  spe: string;
  cnpj: string;
  areaTotal: number;
  matriculasCount: number;
  valorTotal: number;
  socioPct: number;
  empresaPct: number;
  corretorPct: number;
  aliquotaTributaria: number;
  observacoes?: string;
  status: EmpStatus;
}

export interface Matricula {
  id: string;
  empreendimentoId: string;
  numero: string;
  unidade: string;
  area: number;
  valorVenda: number;
  status: MatriculaStatus;
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
}

export interface Config {
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

interface State {
  empreendimentos: Empreendimento[];
  matriculas: Matricula[];
  vendas: Venda[];
  parcelas: Parcela[];
  config: Config;
  trimestres: TrimestreItem[];
}

// ---------- Seed ----------
const SEED_KEY = "imobcontrol.v1";

function makeSeed(): State {
  const emp1: Empreendimento = {
    id: "emp1",
    nome: "Residencial Alvorada",
    spe: "Alvorada Empreendimentos SPE Ltda",
    cnpj: "12.345.678/0001-90",
    areaTotal: 12500,
    matriculasCount: 48,
    valorTotal: 24_800_000,
    socioPct: 40,
    empresaPct: 55,
    corretorPct: 5,
    aliquotaTributaria: 6.73,
    status: "em_vendas",
    observacoes: "Empreendimento em fase de vendas com 48 unidades.",
  };
  const emp2: Empreendimento = {
    id: "emp2",
    nome: "Loteamento Vila Verde",
    spe: "Vila Verde SPE Ltda",
    cnpj: "98.765.432/0001-10",
    areaTotal: 82000,
    matriculasCount: 120,
    valorTotal: 36_500_000,
    socioPct: 45,
    empresaPct: 50,
    corretorPct: 5,
    aliquotaTributaria: 5.93,
    status: "lancamento",
  };
  const emp3: Empreendimento = {
    id: "emp3",
    nome: "Edifício Panorama",
    spe: "Panorama SPE Ltda",
    cnpj: "45.123.789/0001-55",
    areaTotal: 4800,
    matriculasCount: 24,
    valorTotal: 18_200_000,
    socioPct: 40,
    empresaPct: 55,
    corretorPct: 5,
    aliquotaTributaria: 7.5,
    status: "concluido",
  };

  const matriculas: Matricula[] = [];
  const push = (
    eId: string,
    n: number,
    prefix: string,
    baseVal: number,
    baseArea: number,
  ) => {
    for (let i = 1; i <= n; i++) {
      matriculas.push({
        id: `${eId}-m${i}`,
        empreendimentoId: eId,
        numero: `${prefix}${String(1000 + i).padStart(4, "0")}`,
        unidade: eId === "emp2" ? `Lote ${i}` : `Unid. ${101 + i}`,
        area: baseArea + (i % 5) * 4,
        valorVenda: baseVal + (i % 6) * 15000,
        status: "disponivel",
      });
    }
  };
  push("emp1", 12, "AL", 520_000, 68);
  push("emp2", 15, "VV", 305_000, 360);
  push("emp3", 8, "PN", 780_000, 92);

  // Seed vendas
  const vendas: Venda[] = [];
  const parcelas: Parcela[] = [];
  const mkVenda = (
    idx: number,
    empId: string,
    matIdx: number,
    comprador: string,
    corretor: string,
    sinal: number,
    parcelasN: number,
    valorParcela: number,
    dataContrato: string,
  ) => {
    const mat = matriculas.find(
      (m) => m.empreendimentoId === empId && m.id === `${empId}-m${matIdx}`,
    )!;
    const valorTotal = sinal + parcelasN * valorParcela;
    const vId = `v${idx}`;
    const sinalItem: PagamentoItem = {
      id: uid(),
      tipo: "sinal",
      descricao: "Sinal na assinatura",
      valor: sinal,
      parcelas: 1,
      primeiroVencimento: dataContrato,
      status: "pago",
    };
    const parcelasItem: PagamentoItem = {
      id: uid(),
      tipo: "parcelas",
      descricao: `${parcelasN}x parcelas mensais`,
      valor: valorParcela,
      parcelas: parcelasN,
      primeiroVencimento: addMonths(dataContrato, 1),
      status: "pendente",
    };
    vendas.push({
      id: vId,
      empreendimentoId: empId,
      matriculaId: mat.id,
      compradorNome: comprador,
      valorTotal,
      dataContrato,
      corretorNome: corretor,
      corretorPct: 5,
      status: "ativa",
      composicao: [sinalItem, parcelasItem],
    });
    mat.status = "vendido";
    mat.compradorNome = comprador;
    mat.vendaId = vId;
    // sinal parcela (paga)
    parcelas.push({
      id: uid(),
      vendaId: vId,
      empreendimentoId: empId,
      matriculaId: mat.id,
      compradorNome: comprador,
      origemTipo: "sinal",
      origemDescricao: "Sinal",
      numero: 1,
      totalParcelas: 1,
      vencimento: dataContrato,
      valor: sinal,
      valorPago: sinal,
      dataPagamento: dataContrato,
      status: "paga",
    });
    const today = new Date();
    for (let i = 1; i <= parcelasN; i++) {
      const venc = addMonths(dataContrato, i);
      const vencDate = new Date(venc);
      const paid = i <= Math.floor(parcelasN * 0.25);
      const vencida = !paid && vencDate < today;
      parcelas.push({
        id: uid(),
        vendaId: vId,
        empreendimentoId: empId,
        matriculaId: mat.id,
        compradorNome: comprador,
        origemTipo: "parcelas",
        origemDescricao: `Parcela ${i}/${parcelasN}`,
        numero: i,
        totalParcelas: parcelasN,
        vencimento: venc,
        valor: valorParcela,
        valorPago: paid ? valorParcela : 0,
        dataPagamento: paid ? venc : undefined,
        status: paid ? "paga" : vencida ? "vencida" : "pendente",
      });
    }
  };

  mkVenda(1, "emp1", 1, "João da Silva Souza", "Carlos Ribeiro", 80_000, 60, 8_500, "2025-03-15");
  mkVenda(2, "emp1", 2, "Maria Fernanda Lima", "Ana Paula Costa", 120_000, 48, 9_800, "2025-05-10");
  mkVenda(3, "emp1", 3, "Roberto Almeida", "Carlos Ribeiro", 60_000, 72, 7_200, "2025-08-01");
  mkVenda(4, "emp2", 1, "Construtora Horizonte Ltda", "Ana Paula Costa", 45_000, 36, 8_900, "2025-06-20");
  mkVenda(5, "emp2", 2, "Patrícia Menezes", "Rafael Nogueira", 30_000, 60, 5_800, "2025-09-05");
  mkVenda(6, "emp3", 1, "Fernando Barbosa", "Carlos Ribeiro", 150_000, 60, 12_500, "2024-11-12");
  mkVenda(7, "emp3", 2, "Luciana Ferreira", "Rafael Nogueira", 200_000, 48, 14_200, "2024-08-22");

  const config: Config = {
    corretorPctPadrao: 5,
    entradaPctCorretor: 50,
    parcelasPctCorretor: 50,
    aliquotaPadrao: 6.73,
    recebedores: [
      { nome: "Sócio Principal", tipo: "socio" },
      { nome: "Empresa Matriz", tipo: "empresa" },
      { nome: "Carlos Ribeiro", tipo: "corretor" },
      { nome: "Ana Paula Costa", tipo: "corretor" },
      { nome: "Rafael Nogueira", tipo: "corretor" },
    ],
    statusVenda: ["ativa", "cancelada", "quitada"],
    formasPagamento: [
      "À vista",
      "Sinal + parcelas",
      "Sem sinal",
      "Bem material",
      "Outro",
    ],
    aliquotasPorSpe: {
      emp1: 6.73,
      emp2: 5.93,
      emp3: 7.5,
    },
  };

  const trimestres: TrimestreItem[] = [
    {
      id: uid(),
      trimestre: "1º Tri 2025",
      contratosSeparados: true,
      relatoriosPreparados: true,
      boletosReunidos: true,
      documentosEnviados: true,
      guiaRecebida: true,
      guiaPaga: true,
      valorContador: 84_500,
      status: "concluido",
    },
    {
      id: uid(),
      trimestre: "2º Tri 2025",
      contratosSeparados: true,
      relatoriosPreparados: true,
      boletosReunidos: true,
      documentosEnviados: true,
      guiaRecebida: true,
      guiaPaga: false,
      valorContador: 92_300,
      status: "andamento",
    },
    {
      id: uid(),
      trimestre: "3º Tri 2025",
      contratosSeparados: true,
      relatoriosPreparados: false,
      boletosReunidos: false,
      documentosEnviados: false,
      guiaRecebida: false,
      guiaPaga: false,
      valorContador: 0,
      status: "aberto",
    },
  ];

  return { empreendimentos: [emp1, emp2, emp3], matriculas, vendas, parcelas, config, trimestres };
}

function loadState(): State {
  if (typeof window === "undefined") return makeSeed();
  try {
    const raw = window.localStorage.getItem(SEED_KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {}
  const seed = makeSeed();
  try {
    window.localStorage.setItem(SEED_KEY, JSON.stringify(seed));
  } catch {}
  return seed;
}

// ---------- Context ----------
interface Ctx {
  state: State;
  setState: (updater: (s: State) => State) => void;
  resetSeed: () => void;
  addEmpreendimento: (e: Omit<Empreendimento, "id">) => Empreendimento;
  updateEmpreendimento: (id: string, patch: Partial<Empreendimento>) => void;
  addMatricula: (m: Omit<Matricula, "id">) => Matricula;
  updateMatricula: (id: string, patch: Partial<Matricula>) => void;
  addVenda: (v: Omit<Venda, "id" | "status"> & { status?: VendaStatus }) => Venda;
  marcarParcelaPaga: (id: string, dataPagamento?: string) => void;
  desmarcarParcela: (id: string) => void;
  updateConfig: (patch: Partial<Config>) => void;
  updateTrimestre: (id: string, patch: Partial<TrimestreItem>) => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<State>(() => makeSeed());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStateRaw(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(SEED_KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  const api = useMemo<Ctx>(() => {
    const setState = (updater: (s: State) => State) => setStateRaw(updater);

    return {
      state,
      setState,
      resetSeed: () => setStateRaw(makeSeed()),
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
        const vId = uid();
        const newVenda: Venda = { ...v, id: vId, status: v.status ?? "ativa" };
        const newParcelas: Parcela[] = [];
        for (const item of newVenda.composicao) {
          if (item.tipo === "bem") continue;
          const n = Math.max(1, item.parcelas || 1);
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
      marcarParcelaPaga: (id, dataPagamento) =>
        setStateRaw((s) => ({
          ...s,
          parcelas: s.parcelas.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "paga",
                  valorPago: p.valor,
                  dataPagamento: dataPagamento ?? todayISO(),
                }
              : p,
          ),
        })),
      desmarcarParcela: (id) =>
        setStateRaw((s) => ({
          ...s,
          parcelas: s.parcelas.map((p) =>
            p.id === id
              ? { ...p, status: "pendente", valorPago: 0, dataPagamento: undefined }
              : p,
          ),
        })),
      updateConfig: (patch) =>
        setStateRaw((s) => ({ ...s, config: { ...s.config, ...patch } })),
      updateTrimestre: (id, patch) =>
        setStateRaw((s) => ({
          ...s,
          trimestres: s.trimestres.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
    };
  }, [state]);

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
  const recebido = ps.reduce((a, p) => a + (p.valorPago || 0), 0);
  const previsto = ps.reduce((a, p) => a + p.valor, 0) || v.valorTotal;
  const saldo = Math.max(0, previsto - recebido);
  return { recebido, previsto, saldo };
}

export function empTotais(empId: string, vendas: Venda[], parcelas: Parcela[]) {
  const vs = vendas.filter((v) => v.empreendimentoId === empId);
  const vendido = vs.reduce((a, v) => a + v.valorTotal, 0);
  const recebido = parcelas
    .filter((p) => p.empreendimentoId === empId)
    .reduce((a, p) => a + (p.valorPago || 0), 0);
  const saldo = Math.max(0, vendido - recebido);
  return { vendas: vs.length, vendido, recebido, saldo };
}

// Commission calc for a single venda
export function comissaoDaVenda(v: Venda, parcelas: Parcela[], cfg: Config) {
  const total = v.valorTotal * (v.corretorPct / 100);
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
    const pct =
      p.origemTipo === "sinal" || p.origemTipo === "sinal_parcelado" || p.origemTipo === "avista"
        ? cfg.entradaPctCorretor
        : cfg.parcelasPctCorretor;
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
