import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
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
import { cn } from "@/lib/utils";

const rows = [
  {
    tipo: "entrada",
    descricao: "Pagamento parcela 11/60 — Marcos Andrade",
    categoria: "Recebimento",
    data: "12/07/2026",
    valor: "+ R$ 4.320,00",
  },
  {
    tipo: "saida",
    descricao: "Comissão corretor — Ed. Vitória",
    categoria: "Comissão",
    data: "11/07/2026",
    valor: "- R$ 1.870,00",
  },
  {
    tipo: "entrada",
    descricao: "Sinal contrato — Empresa Delta",
    categoria: "Recebimento",
    data: "10/07/2026",
    valor: "+ R$ 42.000,00",
  },
  {
    tipo: "saida",
    descricao: "Taxa cartorial — Vila Jardins",
    categoria: "Tributos",
    data: "09/07/2026",
    valor: "- R$ 980,00",
  },
  {
    tipo: "entrada",
    descricao: "Pagamento parcela 06/48 — Juliana Prado",
    categoria: "Recebimento",
    data: "08/07/2026",
    valor: "+ R$ 2.980,00",
  },
];

export function MovementsTable() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Últimas Movimentações</CardTitle>
        <CardDescription>Entradas e saídas mais recentes da carteira</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10"></TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      r.tipo === "entrada"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {r.tipo === "entrada" ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{r.descricao}</TableCell>
                <TableCell className="text-muted-foreground">{r.categoria}</TableCell>
                <TableCell className="text-muted-foreground">{r.data}</TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium tabular-nums",
                    r.tipo === "entrada" ? "text-success" : "text-destructive",
                  )}
                >
                  {r.valor}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
