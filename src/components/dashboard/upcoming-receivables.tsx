import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ParcelaStatusBadge } from "@/components/status-badges";
import { useStore, type ParcelaStatus } from "@/lib/store";
import { brl0, formatDate } from "@/lib/format";

export function UpcomingReceivables() {
  const { state } = useStore();
  const today = new Date();
  const rows = state.parcelas
    .map((p) => {
      const status: ParcelaStatus =
        p.status === "pendente" && new Date(p.vencimento) < today ? "vencida" : p.status;
      return { ...p, status };
    })
    .filter((p) => p.status !== "paga" && p.status !== "cancelada")
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .slice(0, 8);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Próximos Recebimentos</CardTitle>
        <CardDescription>Parcelas previstas em ordem de vencimento</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Cliente</TableHead>
                <TableHead>Empreendimento</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor previsto</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const emp = state.empreendimentos.find((e) => e.id === r.empreendimentoId);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.compradorNome}</TableCell>
                    <TableCell className="text-muted-foreground">{emp?.nome}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {r.numero}/{r.totalParcelas}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatDate(r.vencimento)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {brl0(r.valor)}
                    </TableCell>
                    <TableCell><ParcelaStatusBadge status={r.status} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-border/60 p-2">
          <Button asChild variant="ghost" size="sm" className="w-full text-xs">
            <Link to="/parcelas">Ver todos os recebimentos</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
