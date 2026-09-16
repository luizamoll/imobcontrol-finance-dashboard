const DATA_KEY = "imobcontrol.v2";
const RESET_MARKER_KEY = "imobcontrol.clean-start.v1";

const cleanState = {
  empreendimentos: [],
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
    formasPagamento: [
      "À vista",
      "Sinal + parcelas",
      "Sem sinal",
      "Bem material",
      "Outro",
    ],
    aliquotasPorSpe: {},
  },
  trimestres: [],
};

/**
 * Migração temporária para a transição dos dados fictícios do protótipo
 * para uma base limpa, antes da persistência definitiva no back-end Java.
 *
 * É executada uma única vez por navegador. Depois disso, os dados criados
 * pelo usuário continuam sendo preservados normalmente no localStorage.
 */
export function applyCleanStartMigration() {
  if (typeof window === "undefined") return;

  try {
    if (window.localStorage.getItem(RESET_MARKER_KEY)) return;

    window.localStorage.setItem(DATA_KEY, JSON.stringify(cleanState));
    window.localStorage.setItem(RESET_MARKER_KEY, "done");
  } catch {
    // O app continua funcionando mesmo quando o navegador bloqueia storage.
  }
}

applyCleanStartMigration();
