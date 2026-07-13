import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const rows = [
  {
    cliente: "Marcos Andrade",
    parcela: "12/60",
    valor: "R$ 4.320,00",
    vencimento: "15/07",
    status: "Em dia",
  },
  {
    cliente: "Juliana Prado",
    parcela: "07/48",
    valor: "R$ 2.980,00",
    vencimento: "18/07",
    status: "Em dia",
  },
  {
    cliente: "Empresa Delta LTDA",
    parcela: "23/120",
    valor: "R$ 12.450,00",
    vencimento: "20/07",
    status: "Atenção",
  },
  {
    cliente: "Rafael Nogueira",
    parcela: "18/60",
    valor: "R$ 3.870,00",
    vencimento: "22/07",
    status: "Em dia",
  },
  {
    cliente: "Beatriz Salles",
    parcela: "03/36",
    valor: "R$ 5.100,00",
    vencimento: "25/07",
    status: "Em dia",
  },
  {
    cliente: "Otávio Ribeiro",
    parcela: "09/24",
    valor: "R$ 1.980,00",
    vencimento: "27/07",
    status: "Em dia",
  },
];

export function UpcomingTable() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Próximos vencimentos</CardTitle>
        <CardDescription>Parcelas dos próximos 15 dias</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 p-2">
        {rows.map((r) => (
          <div
            key={r.cliente}
            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition hover:bg-muted/60"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {r.cliente}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Parcela {r.parcela} · vence {r.vencimento}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {r.valor}
              </span>
              <Badge
                variant="outline"
                className={
                  r.status === "Em dia"
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-warning/40 bg-warning/15 text-warning-foreground"
                }
              >
                {r.status}
              </Badge>
            </div>
          </div>
        ))}
        <div className="pt-2">
          <Button variant="ghost" size="sm" className="w-full text-xs">
            Ver todos os vencimentos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
