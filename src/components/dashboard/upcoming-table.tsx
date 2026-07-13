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
import { Badge } from "@/components/ui/badge";

const rows = [
  {
    cliente: "Marcos Andrade",
    empreendimento: "Res. Aurora",
    parcela: "12/60",
    vencimento: "15/07/2026",
    valor: "R$ 4.320,00",
    status: "Em dia",
  },
  {
    cliente: "Juliana Prado",
    empreendimento: "Ed. Vitória",
    parcela: "07/48",
    vencimento: "18/07/2026",
    valor: "R$ 2.980,00",
    status: "Em dia",
  },
  {
    cliente: "Empresa Delta LTDA",
    empreendimento: "Corp. Center",
    parcela: "23/120",
    vencimento: "20/07/2026",
    valor: "R$ 12.450,00",
    status: "Atenção",
  },
  {
    cliente: "Rafael Nogueira",
    empreendimento: "Res. Aurora",
    parcela: "18/60",
    vencimento: "22/07/2026",
    valor: "R$ 3.870,00",
    status: "Em dia",
  },
  {
    cliente: "Beatriz Salles",
    empreendimento: "Vila Jardins",
    parcela: "03/36",
    vencimento: "25/07/2026",
    valor: "R$ 5.100,00",
    status: "Em dia",
  },
];

export function UpcomingTable() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Próximos Recebimentos</CardTitle>
        <CardDescription>Parcelas com vencimento nos próximos 15 dias</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Cliente</TableHead>
              <TableHead>Empreendimento</TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.cliente}>
                <TableCell className="font-medium">{r.cliente}</TableCell>
                <TableCell className="text-muted-foreground">
                  {r.empreendimento}
                </TableCell>
                <TableCell className="text-muted-foreground">{r.parcela}</TableCell>
                <TableCell className="text-muted-foreground">{r.vencimento}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {r.valor}
                </TableCell>
                <TableCell>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
