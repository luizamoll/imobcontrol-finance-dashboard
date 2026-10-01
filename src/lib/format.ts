export const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(v || 0);

export const brl0 = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v || 0);

export const num = (v: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(v || 0);

export const pct = (v: number) => `${(v || 0).toFixed(1).replace(".", ",")}%`;

export const formatDate = (iso?: string) => {
  if (!iso) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
};

export const formatCNPJ = (v: string) => {
  const d = (v || "").replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

export const formatCPF = (v: string) => {
  const d = (v || "").replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
};

export const parseBRLInput = (v: string): number => {
  if (!v) return 0;

  const bruto = v.trim().replace(/[^\d,.-]/g, "");
  if (!bruto) return 0;

  const negativo = bruto.startsWith("-");
  const valor = bruto.replace(/-/g, "");
  const ultimaVirgula = valor.lastIndexOf(",");
  const ultimoPonto = valor.lastIndexOf(".");

  let separadorDecimal: "," | "." | null = null;

  if (ultimaVirgula >= 0 && ultimoPonto >= 0) {
    separadorDecimal = ultimaVirgula > ultimoPonto ? "," : ".";
  } else if (ultimaVirgula >= 0) {
    separadorDecimal = ",";
  } else if (ultimoPonto >= 0) {
    const casasDepoisDoUltimoPonto = valor.length - ultimoPonto - 1;
    const quantidadePontos = (valor.match(/\./g) || []).length;

    // Aceita também entrada no padrão 870.00, sem confundir 100.000 com R$ 100,00.
    separadorDecimal =
      casasDepoisDoUltimoPonto <= 2 || (quantidadePontos > 1 && casasDepoisDoUltimoPonto <= 2)
        ? "."
        : null;
  }

  let normalizado: string;
  if (separadorDecimal) {
    const indice = valor.lastIndexOf(separadorDecimal);
    const inteira = valor.slice(0, indice).replace(/[.,]/g, "") || "0";
    const decimal = valor.slice(indice + 1).replace(/[.,]/g, "");
    normalizado = decimal ? `${inteira}.${decimal}` : inteira;
  } else {
    normalizado = valor.replace(/[.,]/g, "");
  }

  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return 0;
  return negativo ? -numero : numero;
};

export const formatBRLInput = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(v) ? v : 0);

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Timezone-safe e com ajuste para o último dia do mês.
// Ex.: 31/01 + 1 mês = 28/02 (ou 29/02), sem "pular" para março.
export const addMonths = (iso: string, months: number) => {
  const [y, m, day] = (iso || "").slice(0, 10).split("-").map(Number);
  const baseYear = y || 1970;
  const baseMonth = (m || 1) - 1;
  const baseDay = day || 1;

  const targetIndex = baseMonth + months;
  const targetYear = baseYear + Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(baseDay, lastDay);

  return new Date(Date.UTC(targetYear, targetMonth, clampedDay))
    .toISOString()
    .slice(0, 10);
};

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
