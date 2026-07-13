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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Row = {
  cliente: string;
  empreendimento: string;
  parcela: string;
  vencimento: string;
  valor: string;
  status: "Em dia" | "A vencer" | "Atenção" | "Vencido";
};

const rows: Row[] = [
  {
    cliente: "Marcos Andrade",
    empreendimento: "Residencial Vila Jardins · 302",
    parcela: "12/60",
    vencimento: "15/07/2026",
    valor: "R$ 4.320,00",
    status: "A vencer",
  },
  {
    cliente: "Juliana Prado",
    empreendimento: "Edifício Vitória · 802",
    parcela: "07/48",
    vencimento: "18/07/2026",
    valor: "R$ 2.980,00",
    status: "A vencer",
  },
  {
    cliente: "Construtora Delta LTDA",
    empreendimento: "Reserva Alphaville · Lote 14",
    parcela: "23/120",
    vencimento: "20/07/2026",
    valor: "R$ 12.450,00",
    status: "Atenção",
  },
  {
    cliente: "Rafael Nogueira",
    empreendimento: "Condomínio Parque das Águas · 205",
    parcela: "18/60",
    vencimento: "22/07/2026",
    valor: "R$ 3.870,00",
    status: "Em dia",
  },
  {
    cliente: "Beatriz Salles",
    empreendimento: "Ed. Horizonte Anchieta · 1101",
    parcela: "03/36",
    vencimento: "25/07/2026",
    valor: "R$ 5.100,00",
    status: "Em dia",
  },
  {
    cliente: "Otávio Ribeiro",
    empreendimento: "Residencial Vila Jardins · 408",
    parcela: "09/24",
    vencimento: "27/07/2026",
    valor: "R$ 1.980,00",
    status: "A vencer",
  },
  {
    cliente: "Camila Fontoura",
    empreendimento: "Edifício Vitória · 502",
    parcela: "15/48",
    vencimento: "10/07/2026",
    valor: "R$ 3.410,00",
    status: "Vencido",
  },
];

const statusStyles: Record<Row["status"], string> = {
  "Em dia": "border-success/30 bg-success/10 text-success",
  "A vencer": "border-primary/25 bg-primary/10 text-primary",
  Atenção: "border-warning/40 bg-warning/15 text-warning-foreground",
  Vencido: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function UpcomingReceivables() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Próximos Recebimentos</CardTitle>
        <CardDescription>
          Parcelas previstas para os próximos 15 dias
        </CardDescription>
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
              {rows.map((r) => (
                <TableRow key={r.cliente + r.parcela}>
                  <TableCell className="font-medium text-foreground">
                    {r.cliente}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.empreendimento}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {r.parcela}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {r.vencimento}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-foreground">
                    {r.valor}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(statusStyles[r.status])}
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="border-t border-border/60 p-2">
          <Button variant="ghost" size="sm" className="w-full text-xs">
            Ver todos os recebimentos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
