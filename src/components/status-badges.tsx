import { Badge } from "@/components/ui/badge";
import type {
  EmpStatus,
  MatriculaStatus,
  ParcelaStatus,
  VendaStatus,
} from "@/lib/store";

const empMap: Record<EmpStatus, { label: string; className: string }> = {
  planejamento: { label: "Planejamento", className: "bg-muted text-muted-foreground" },
  lancamento: { label: "Lançamento", className: "bg-chart-3/15 text-warning-foreground" },
  em_vendas: { label: "Em vendas", className: "bg-primary/10 text-primary" },
  concluido: { label: "Concluído", className: "bg-success/10 text-success" },
};

const matMap: Record<MatriculaStatus, { label: string; className: string }> = {
  disponivel: { label: "Disponível", className: "bg-success/10 text-success" },
  reservado: { label: "Reservado", className: "bg-warning/15 text-warning-foreground" },
  vendido: { label: "Vendido", className: "bg-primary/10 text-primary" },
  cancelado: { label: "Cancelado", className: "bg-destructive/10 text-destructive" },
};

const vendaMap: Record<VendaStatus, { label: string; className: string }> = {
  ativa: { label: "Ativa", className: "bg-primary/10 text-primary" },
  cancelada: { label: "Cancelada", className: "bg-destructive/10 text-destructive" },
  quitada: { label: "Quitada", className: "bg-success/10 text-success" },
};

const parcMap: Record<ParcelaStatus, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-muted text-muted-foreground" },
  paga: { label: "Paga", className: "bg-success/10 text-success" },
  vencida: { label: "Vencida", className: "bg-destructive/10 text-destructive" },
  cancelada: { label: "Cancelada", className: "bg-muted text-muted-foreground" },
};

export function EmpStatusBadge({ status }: { status: EmpStatus }) {
  const s = empMap[status];
  return <Badge variant="secondary" className={s.className}>{s.label}</Badge>;
}
export function MatriculaStatusBadge({ status }: { status: MatriculaStatus }) {
  const s = matMap[status];
  return <Badge variant="secondary" className={s.className}>{s.label}</Badge>;
}
export function VendaStatusBadge({ status }: { status: VendaStatus }) {
  const s = vendaMap[status];
  return <Badge variant="secondary" className={s.className}>{s.label}</Badge>;
}
export function ParcelaStatusBadge({ status }: { status: ParcelaStatus }) {
  const s = parcMap[status];
  return <Badge variant="secondary" className={s.className}>{s.label}</Badge>;
}
