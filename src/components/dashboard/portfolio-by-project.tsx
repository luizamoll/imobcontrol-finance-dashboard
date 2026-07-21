import { Building2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmpStatusBadge } from "@/components/status-badges";
import { useStore, empTotais } from "@/lib/store";
import { brl0, pct } from "@/lib/format";

export function PortfolioByProject() {
  const { state } = useStore();
  const rows = state.empreendimentos.map((e) => {
    const t = empTotais(e.id, state.vendas, state.parcelas);
    const vendidoPct = e.valorTotal ? Math.min(100, (t.vendido / e.valorTotal) * 100) : 0;
    return { emp: e, ...t, vendidoPct };
  });

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Carteira por empreendimento</CardTitle>
        <CardDescription>Desempenho comercial e recebíveis por SPE</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {rows.map(({ emp, vendido, recebido, vendidoPct }) => (
          <Link
            key={emp.id}
            to="/empreendimentos/$id"
            params={{ id: emp.id }}
            className="block rounded-lg border border-border/60 bg-card p-4 transition hover:border-border hover:shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{emp.nome}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{emp.spe}</p>
                </div>
              </div>
              <EmpStatusBadge status={emp.status} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">VGV total</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">{brl0(emp.valorTotal)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Recebido</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-success">{brl0(recebido)}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Vendido</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">{pct(vendidoPct)}</p>
              </div>
            </div>
            <div className="mt-3">
              <Progress value={vendidoPct} className="h-1.5" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
