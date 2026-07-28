import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertOctagon, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useStore, inadimplenciaCalc } from "@/lib/store";
import { brl0, formatDate } from "@/lib/format";

export const Route = createFileRoute("/inadimplencia")({
  component: InadimplenciaPage,
  head: () => ({ meta: [{ title: "Inadimplência · ImobControl" }] }),
});

function InadimplenciaPage() {
  const { state, receberParcela } = useStore();
  const [empFilter, setEmpFilter] = useState("todos");
  const [busca, setBusca] = useState("");
  const hoje = new Date();

  const rows = useMemo(() => {
    return state.parcelas
      .filter((p) => p.status !== "paga" && p.status !== "cancelada")
      .map((p) => ({ p, calc: inadimplenciaCalc(p, state.config, hoje) }))
      .filter(({ calc }) => calc.diasAtraso > 0)
      .filter(({ p }) => (empFilter === "todos" ? true : p.empreendimentoId === empFilter))
      .filter(({ p }) =>
        busca ? p.compradorNome.toLowerCase().includes(busca.toLowerCase()) : true,
      )
      .sort((a, b) => b.calc.diasAtraso - a.calc.diasAtraso);
  }, [state, empFilter, busca]);

  const totOriginal = rows.reduce((a, r) => a + r.p.valor, 0);
  const totAtualizado = rows.reduce((a, r) => a + r.calc.atualizado, 0);
  const totJurosMora = rows.reduce((a, r) => a + r.calc.juros + r.calc.mora + r.calc.correcao, 0);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Cobrança"
        title="Inadimplência"
        description="Parcelas vencidas com cálculo automático de correção monetária, juros e mora conforme configuração."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Mini label="Parcelas em atraso" value={String(rows.length)} />
        <Mini label="Valor original" value={brl0(totOriginal)} />
        <Mini label="Acréscimos" value={brl0(totJurosMora)} tone="warning" />
        <Mini label="Valor atualizado" value={brl0(totAtualizado)} tone="destructive" />
      </div>

      <Card className="border-border/70">
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <div>
            <Label>Empreendimento</Label>
            <Select value={empFilter} onValueChange={setEmpFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {state.empreendimentos.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Buscar cliente</Label>
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome do cliente" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Empreendimento</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Dias</TableHead>
                <TableHead className="text-right">Original</TableHead>
                <TableHead className="text-right">Correção</TableHead>
                <TableHead className="text-right">Juros</TableHead>
                <TableHead className="text-right">Mora</TableHead>
                <TableHead className="text-right">Atualizado</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="py-10 text-center text-sm text-muted-foreground">
                    <AlertOctagon className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    Nenhuma parcela em atraso 🎉
                  </TableCell>
                </TableRow>
              )}
              {rows.map(({ p, calc }) => {
                const emp = state.empreendimentos.find((e) => e.id === p.empreendimentoId);
                const mat = state.matriculas.find((m) => m.id === p.matriculaId);
                const gravidade =
                  calc.diasAtraso > 60 ? "destructive" : calc.diasAtraso > 15 ? "warning" : "muted";
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link to="/vendas/$id" params={{ id: p.vendaId }} className="hover:text-primary">
                        {p.compradorNome}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{emp?.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{mat?.unidade}</TableCell>
                    <TableCell className="text-sm">{p.origemDescricao}</TableCell>
                    <TableCell className="text-sm">{formatDate(p.vencimento)}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="secondary"
                        className={
                          gravidade === "destructive"
                            ? "bg-destructive/10 text-destructive"
                            : gravidade === "warning"
                              ? "bg-warning/15 text-warning-foreground"
                              : "bg-muted text-muted-foreground"
                        }
                      >
                        {calc.diasAtraso}d
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{brl0(p.valor)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{brl0(calc.correcao)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{brl0(calc.juros)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{brl0(calc.mora)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-destructive">{brl0(calc.atualizado)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          receberParcela(p.id, calc.atualizado);
                          toast.success("Recebimento com acréscimos registrado");
                        }}
                      >
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Receber
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "destructive" | "warning" }) {
  const cls =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning-foreground"
        : "text-foreground";
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-xl font-semibold ${cls}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
