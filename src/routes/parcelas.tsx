import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { ParcelaStatusBadge } from "@/components/status-badges";
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
import { brl0, formatDate } from "@/lib/format";
import { inadimplenciaCalc, useStore, type ParcelaStatus } from "@/lib/store";

export const Route = createFileRoute("/parcelas")({
  component: ParcelasPage,
  head: () => ({ meta: [{ title: "Parcelas · ImobControl" }] }),
});

function ParcelasPage() {
  const { state, receberParcela, desmarcarParcela } = useStore();
  const [empFilter, setEmpFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<ParcelaStatus | "todos">("todos");
  const [busca, setBusca] = useState("");

  const hoje = new Date();
  const parcelasView = useMemo(() => {
    return state.parcelas
      .map((p) => {
        const calc = inadimplenciaCalc(p, state.config, hoje);
        const status: ParcelaStatus =
          p.status === "pendente" && calc.diasAtraso > 0 ? "vencida" : p.status;
        return {
          ...p,
          status,
          calc,
          valorCobrado: calc.diasAtraso > 0 ? calc.atualizado : p.valor,
        };
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
  }, [state.parcelas, state.config, empFilter, statusFilter, busca]);

  const totalPrevisto = parcelasView.reduce((a, p) => a + p.valor, 0);
  const totalRecebido = parcelasView.reduce((a, p) => a + p.valorPago, 0);
  const totalAtraso = parcelasView
    .filter((p) => p.status === "vencida")
    .reduce((a, p) => a + p.valorCobrado, 0);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Cobrança"
        title="Parcelas"
        description="Acompanhe as parcelas dos contratos. Valores vencidos são atualizados com a regra congelada em cada contrato, preservando o que foi negociado naquela venda."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MiniStat label="Total previsto" value={brl0(totalPrevisto)} />
        <MiniStat label="Total recebido" value={brl0(totalRecebido)} tone="success" />
        <MiniStat label="Em atraso atualizado" value={brl0(totalAtraso)} tone="destructive" />
        <MiniStat label="Parcelas listadas" value={String(parcelasView.length)} />
      </div>

      <Card className="border-border/70">
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-4">
          <div>
            <Label>Empreendimento</Label>
            <Select value={empFilter} onValueChange={setEmpFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {state.empreendimentos.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as ParcelaStatus | "todos")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
            <Input
              placeholder="Ex.: João, entrada, parcela..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
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
                    <TableCell className="text-sm">
                      {p.numero}/{p.totalParcelas}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(p.vencimento)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {brl0(p.status === "vencida" ? p.valorCobrado : p.valor)}
                      {p.status === "vencida" && p.valorCobrado !== p.valor && (
                        <div className="text-[11px] font-normal text-muted-foreground">
                          original {brl0(p.valor)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <ParcelaStatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {p.status === "paga" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            desmarcarParcela(p.id);
                            toast("Recebimento revertido");
                          }}
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reverter
                        </Button>
                      ) : p.status === "cancelada" ? (
                        <span className="text-xs text-muted-foreground">Sem ação</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            receberParcela(p.id, p.valorCobrado);
                            toast.success(
                              p.status === "vencida"
                                ? "Parcela recebida com os acréscimos contratuais"
                                : "Recebimento registrado",
                            );
                          }}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Receber
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

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "destructive";
}) {
  const cls =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
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
