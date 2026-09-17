const DATA_KEY = "imobcontrol.v2";
const RESET_MARKER_KEY = "imobcontrol.clean-start.v2";

const cleanState = {
  empreendimentos: [],
  quadras: [],
  matriculas: [],
  vendas: [],
  parcelas: [],
  movimentos: [],
  config: {
    corretorPctPadrao: 0,
    entradaPctCorretor: 0,
    parcelasPctCorretor: 0,
    aliquotaPadrao: 0,
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
    recebedores: [],
    statusVenda: ["ativa", "cancelada", "quitada"],
    formasPagamento: ["À vista", "Sinal + parcelas", "Bem material", "Outro"],
    aliquotasPorSpe: {},
  },
  trimestres: [],
};

const DEMO_NAMES = new Set([
  "Residencial Alvorada",
  "Loteamento Vila Verde",
  "Edifício Panorama",
]);

/**
 * Remove apenas o antigo conteúdo demonstrativo conhecido.
 * Dados reais ou dados inseridos manualmente pelo usuário são preservados.
 */
export function applyCleanStartMigration() {
  if (typeof window === "undefined") return;

  try {
    if (window.localStorage.getItem(RESET_MARKER_KEY)) return;

    const raw = window.localStorage.getItem(DATA_KEY);
    if (!raw) {
      window.localStorage.setItem(DATA_KEY, JSON.stringify(cleanState));
      window.localStorage.setItem(RESET_MARKER_KEY, "done");
      return;
    }

    const parsed = JSON.parse(raw) as { empreendimentos?: { nome?: string }[] };
    const hasDemo = (parsed.empreendimentos ?? []).some((e) =>
      e.nome ? DEMO_NAMES.has(e.nome) : false,
    );

    if (hasDemo) {
      window.localStorage.setItem(DATA_KEY, JSON.stringify(cleanState));
    }

    window.localStorage.setItem(RESET_MARKER_KEY, "done");
  } catch {
    // Se o navegador bloquear storage, o app continua normalmente.
  }
}

applyCleanStartMigration();
