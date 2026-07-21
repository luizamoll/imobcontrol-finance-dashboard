import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, RotateCcw } from "lucide-react";
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
import { ParcelaStatusBadge } from "@/components/status-badges";
import { useStore, type ParcelaStatus } from "@/lib/store";
import { brl0, formatDate } from "@/lib/format";

export const Route = createFileRoute("/parcelas")({
  component: ParcelasPage,
  head: () => ({ meta: [{ title: "Parcelas · ImobControl" }] }),
});

function ParcelasPage() {
  const { state, marcarParcelaPaga, desmarcarParcela } = useStore();
  const [empFilter, setEmpFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<ParcelaStatus | "todos">("todos");
  const [busca, setBusca] = useState("");

  // Recompute status if vencida
  const today = new Date();
  const parcelasView = useMemo(() => {
    return state.parcelas
      .map((p) => {
        if (p.status === "pendente" && new Date(p.vencimento) < today) {
          return { ...p, status: "vencida" as ParcelaStatus };
        }
        return p;
      })
      .filter((p) => (empFilter === "todos" ? true : p.empreendimentoId === empFilter))
      .filter((p) => (statusFilter === "todos" ? true : p.status === statusFilter))
      .filter((p) =>
        busca
          ? p.compradorNome.toLowerCase().includes(busca.toLowerCase()) ||
            p.origemDescricao.toLowerCase().includes(busca.toLowerCase())
          : true,
      )
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  }, [state.parcelas, empFilter, statusFilter, busca]);

  const totalPrevisto = parcelasView.reduce((a, p) => a + p.valor, 0);
  const totalRecebido = parcelasView.reduce((a, p) => a + p.valorPago, 0);
  const totalAtraso = parcelasView.filter((p) => p.status === "vencida").reduce((a, p) => a + p.valor, 0);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Cobrança"
        title="Parcelas"
        description="Acompanhe todas as parcelas de contratos, marque recebimentos e monitore atrasos."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MiniStat label="Total previsto" value={brl0(totalPrevisto)} />
        <MiniStat label="Total recebido" value={brl0(totalRecebido)} tone="success" />
        <MiniStat label="Em atraso" value={brl0(totalAtraso)} tone="destructive" />
        <MiniStat label="Parcelas listadas" value={String(parcelasView.length)} />
      </div>

      <Card className="border-border/70">
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-4">
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
          <div>
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ParcelaStatus | "todos")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="paga">Paga</SelectItem>
                <SelectItem value="vencida">Vencida</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Buscar por cliente ou descrição</Label>
            <Input placeholder="Ex.: João, Sinal, Parcela 3..." value={busca} onChange={(e) => setBusca(e.target.value)} />
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
                <TableHead>Origem</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelasView.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma parcela para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
              {parcelasView.map((p) => {
                const emp = state.empreendimentos.find((e) => e.id === p.empreendimentoId);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm font-medium">{p.compradorNome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{emp?.nome}</TableCell>
                    <TableCell className="text-sm">{p.origemDescricao}</TableCell>
                    <TableCell className="text-sm">{p.numero}/{p.totalParcelas}</TableCell>
                    <TableCell className="text-sm">{formatDate(p.vencimento)}</TableCell>
                    <TableCell className="text-right font-medium">{brl0(p.valor)}</TableCell>
                    <TableCell><ParcelaStatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right">
                      {p.status === "paga" ? (
                        <Button size="sm" variant="ghost" onClick={() => { desmarcarParcela(p.id); toast("Recebimento revertido"); }}>
                          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reverter
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => { marcarParcelaPaga(p.id); toast.success("Parcela marcada como paga"); }}>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Marcar paga
                        </Button>
                      )}
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

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "success" | "destructive" }) {
  const cls = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-xl font-semibold ${cls}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
