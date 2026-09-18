import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronDown, ChevronUp, Inbox, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { ParcelaStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(() => new Set());

  const hoje = useMemo(() => new Date(), []);

  const parcelasView = useMemo(() => {
    const termo = busca.trim().toLowerCase();

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
      .filter((p) => {
        if (!termo) return true;
        const emp = state.empreendimentos.find((e) => e.id === p.empreendimentoId);
        const mat = state.matriculas.find((m) => m.id === p.matriculaId);
        const venda = state.vendas.find((v) => v.id === p.vendaId);
        return [
          p.compradorNome,
          p.origemDescricao,
          emp?.nome,
          emp?.spe,
          mat?.unidade,
          mat?.numero,
          venda?.corretorNome,
          venda?.dataContrato,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(termo);
      })
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  }, [
    state.parcelas,
    state.config,
    state.empreendimentos,
    state.matriculas,
    state.vendas,
    empFilter,
    statusFilter,
    busca,
    hoje,
  ]);

  const grupos = useMemo(() => {
    const map = new Map<string, typeof parcelasView>();

    for (const p of parcelasView) {
      const atuais = map.get(p.vendaId) ?? [];
      atuais.push(p);
      map.set(p.vendaId, atuais);
    }

    return [...map.entries()]
      .map(([vendaId, parcelas]) => {
        const venda = state.vendas.find((v) => v.id === vendaId);
        const emp = state.empreendimentos.find((e) => e.id === parcelas[0]?.empreendimentoId);
        const mat = state.matriculas.find((m) => m.id === parcelas[0]?.matriculaId);
        const pagas = parcelas.filter((p) => p.status === "paga").length;
        const pendentes = parcelas.filter((p) => p.status === "pendente").length;
        const vencidas = parcelas.filter((p) => p.status === "vencida").length;
        const canceladas = parcelas.filter((p) => p.status === "cancelada").length;
        const totalPrevisto = parcelas.reduce((a, p) => a + p.valor, 0);
        const totalRecebido = parcelas.reduce((a, p) => a + p.valorPago, 0);
        const proximoVencimento = parcelas
          .filter((p) => p.status !== "paga" && p.status !== "cancelada")
          .map((p) => p.vencimento)
          .sort((a, b) => a.localeCompare(b))[0];

        return {
          vendaId,
          venda,
          emp,
          mat,
          parcelas,
          pagas,
          pendentes,
          vencidas,
          canceladas,
          totalPrevisto,
          totalRecebido,
          proximoVencimento,
        };
      })
      .sort((a, b) => {
        if (a.vencidas > 0 && b.vencidas === 0) return -1;
        if (a.vencidas === 0 && b.vencidas > 0) return 1;
        return (a.venda?.dataContrato || "").localeCompare(b.venda?.dataContrato || "");
      });
  }, [parcelasView, state.vendas, state.empreendimentos, state.matriculas]);

  const totalPrevisto = parcelasView.reduce((a, p) => a + p.valor, 0);
  const totalRecebido = parcelasView.reduce((a, p) => a + p.valorPago, 0);
  const totalAtraso = parcelasView
    .filter((p) => p.status === "vencida")
    .reduce((a, p) => a + p.valorCobrado, 0);

  const alternarGrupo = (vendaId: string) => {
    setGruposAbertos((atuais) => {
      const proximos = new Set(atuais);
      if (proximos.has(vendaId)) proximos.delete(vendaId);
      else proximos.add(vendaId);
      return proximos;
    });
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Cobrança"
        title="Parcelas"
        description="As parcelas ficam organizadas por venda/contrato. Abra apenas a venda que quiser consultar, sem misturar todos os clientes em uma única lista."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MiniStat label="Total previsto" value={brl0(totalPrevisto)} />
        <MiniStat label="Total recebido" value={brl0(totalRecebido)} tone="success" />
        <MiniStat label="Em atraso atualizado" value={brl0(totalAtraso)} tone="destructive" />
        <MiniStat label="Vendas listadas" value={String(grupos.length)} />
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
            <Label>Buscar venda</Label>
            <Input
              placeholder="Cliente, empreendimento, unidade, matrícula, corretor ou descrição"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {grupos.length === 0 ? (
        <Card className="border-dashed border-border/80">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Inbox className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Nenhuma parcela para os filtros selecionados.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grupos.map((grupo) => (
            <Card key={grupo.vendaId} className="overflow-hidden border-border/70">
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <Link
                      to="/vendas/$id"
                      params={{ id: grupo.vendaId }}
                      className="text-base font-semibold text-foreground hover:text-primary"
                    >
                      {grupo.venda?.compradorNome || grupo.parcelas[0]?.compradorNome}
                    </Link>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {grupo.emp?.nome || "Empreendimento não identificado"} · Unidade{" "}
                      {grupo.mat?.unidade || "—"} · Matrícula {grupo.mat?.numero || "—"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Contrato de {formatDate(grupo.venda?.dataContrato)} · Corretor:{" "}
                      {grupo.venda?.corretorNome || "—"}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:items-end">
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
                      <span><strong>{grupo.parcelas.length}</strong> parcelas</span>
                      <span className="text-success"><strong>{grupo.pagas}</strong> pagas</span>
                      <span><strong>{grupo.pendentes}</strong> pendentes</span>
                      {grupo.vencidas > 0 && (
                        <span className="text-destructive"><strong>{grupo.vencidas}</strong> vencidas</span>
                      )}
                      {grupo.canceladas > 0 && (
                        <span className="text-muted-foreground"><strong>{grupo.canceladas}</strong> canceladas</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Previsto</div>
                        <div className="font-semibold">{brl0(grupo.totalPrevisto)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Recebido</div>
                        <div className="font-semibold">{brl0(grupo.totalRecebido)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Próximo vencimento</div>
                        <div className="font-semibold">
                          {grupo.proximoVencimento ? formatDate(grupo.proximoVencimento) : "—"}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => alternarGrupo(grupo.vendaId)}
                      className="w-full justify-between sm:w-auto sm:min-w-40"
                    >
                      {gruposAbertos.has(grupo.vendaId)
                        ? "Ocultar parcelas"
                        : `Ver parcelas (${grupo.parcelas.length})`}
                      {gruposAbertos.has(grupo.vendaId) ? (
                        <ChevronUp className="ml-2 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {gruposAbertos.has(grupo.vendaId) && (
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Origem</TableHead>
                          <TableHead>Parcela</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {grupo.parcelas.map((p) => (
                          <TableRow key={p.id}>
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
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
