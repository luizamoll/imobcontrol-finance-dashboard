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
  const clean = v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addMonths = (iso: string, months: number) => {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
