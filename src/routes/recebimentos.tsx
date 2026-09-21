import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronDown, ChevronUp, Inbox, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { ParcelaStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { brl0, formatDate, todayISO } from "@/lib/format";
import {
  inadimplenciaCalc,
  useStore,
  type Parcela,
  type ParcelaStatus,
} from "@/lib/store";

export const Route = createFileRoute("/recebimentos")({
  component: RecebimentosPage,
  head: () => ({ meta: [{ title: "Central de Recebimentos · ImobControl" }] }),
});

function RecebimentosPage() {
  const { state, receberParcela } = useStore();
  const [empFilter, setEmpFilter] = useState("todos");
  const [origem, setOrigem] = useState<"todos" | "sinal" | "parcelas">("todos");
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<Parcela | null>(null);
  const [valor, setValor] = useState("");
  const [data, setData] = useState(todayISO());
  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(() => new Set());

  const hoje = useMemo(() => new Date(), []);

  const parcelas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return state.parcelas
      .map((p) => {
        const calc = inadimplenciaCalc(p, state.config, hoje);
        const status: ParcelaStatus =
          p.status === "pendente" && calc.diasAtraso > 0 ? "vencida" : p.status;
        const valorCobrado = calc.diasAtraso > 0 ? calc.atualizado : p.valor;
        return { ...p, status, calc, valorCobrado };
      })
      .filter((p) => p.status !== "paga" && p.status !== "cancelada")
      .filter((p) => (empFilter === "todos" ? true : p.empreendimentoId === empFilter))
      .filter((p) =>
        origem === "todos"
          ? true
          : origem === "sinal"
            ? p.origemTipo === "sinal" ||
              p.origemTipo === "sinal_parcelado" ||
              p.origemTipo === "avista"
            : p.origemTipo === "parcelas",
      )
      .filter((p) => {
        if (!termo) return true;
        const emp = state.empreendimentos.find((e) => e.id === p.empreendimentoId);
        const mat = state.matriculas.find((m) => m.id === p.matriculaId);
        const venda = state.vendas.find((v) => v.id === p.vendaId);
        const texto = [
          p.compradorNome,
          emp?.nome,
          emp?.spe,
          mat?.unidade,
          mat?.numero,
          venda?.corretorNome,
          venda?.dataContrato,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return texto.includes(termo);
      })
      .sort((a, b) => {
        if (a.status === "vencida" && b.status !== "vencida") return -1;
        if (a.status !== "vencida" && b.status === "vencida") return 1;
        return a.vencimento.localeCompare(b.vencimento);
      });
  }, [
    state.parcelas,
    state.config,
    state.empreendimentos,
    state.matriculas,
    state.vendas,
    empFilter,
    origem,
    busca,
    hoje,
  ]);

  const grupos = useMemo(() => {
    const map = new Map<string, typeof parcelas>();

    for (const p of parcelas) {
      const atuais = map.get(p.vendaId) ?? [];
      atuais.push(p);
      map.set(p.vendaId, atuais);
    }

    return [...map.entries()]
      .map(([vendaId, ps]) => {
        const venda = state.vendas.find((v) => v.id === vendaId);
        const emp = state.empreendimentos.find((e) => e.id === ps[0]?.empreendimentoId);
        const mat = state.matriculas.find((m) => m.id === ps[0]?.matriculaId);
        const total = ps.reduce((a, p) => a + p.valorCobrado, 0);
        const vencidas = ps.filter((p) => p.status === "vencida").length;
        const proximoVencimento = ps
          .map((p) => p.vencimento)
          .sort((a, b) => a.localeCompare(b))[0];

        return { vendaId, venda, emp, mat, parcelas: ps, total, vencidas, proximoVencimento };
      })
      .sort((a, b) => {
        if (a.vencidas > 0 && b.vencidas === 0) return -1;
        if (a.vencidas === 0 && b.vencidas > 0) return 1;
        return (a.proximoVencimento || "").localeCompare(b.proximoVencimento || "");
      });
  }, [parcelas, state.vendas, state.empreendimentos, state.matriculas]);

  const totalAReceber = parcelas.reduce((a, p) => a + p.valorCobrado, 0);
  const totalVencido = parcelas
    .filter((p) => p.status === "vencida")
    .reduce((a, p) => a + p.valorCobrado, 0);

  const abrirRecebimento = (p: Parcela) => {
    const calc = inadimplenciaCalc(p, state.config, new Date());
    setSelecionada(p);
    setValor(String(calc.diasAtraso > 0 ? calc.atualizado : p.valor));
    setData(todayISO());
  };

  const confirmar = () => {
    if (!selecionada) return;
    receberParcela(selecionada.id, Number(valor), data);
    toast.success("Recebimento registrado", {
      description: "Distribuição financeira executada automaticamente.",
    });
    setSelecionada(null);
  };

  const calcSelecionada = selecionada
    ? inadimplenciaCalc(selecionada, state.config, new Date())
    : null;

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
        eyebrow="Operacional"
        title="Central de Recebimentos"
        description="Cada venda aparece em um bloco próprio e as parcelas ficam recolhidas até você abrir o contrato. Assim, novos recebimentos não se misturam em uma lista única."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Mini label="Vendas com recebimentos abertos" value={String(grupos.length)} />
        <Mini label="Parcelas em aberto" value={String(parcelas.length)} />
        <Mini label="Total a receber" value={brl0(totalAReceber)} />
        <Mini label="Vencidas atualizadas" value={brl0(totalVencido)} tone="destructive" />
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
            <Label>Origem</Label>
            <Select value={origem} onValueChange={(v) => setOrigem(v as typeof origem)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="sinal">Sinal / Entrada</SelectItem>
                <SelectItem value="parcelas">Parcelas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Buscar venda</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Cliente, empreendimento, unidade, matrícula ou corretor"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {grupos.length === 0 ? (
        <Card className="border-dashed border-border/80">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Inbox className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Nenhum recebimento pendente para os filtros selecionados.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grupos.map((grupo) => (
            <Card key={grupo.vendaId} className="overflow-hidden border-border/70">
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link
                        to="/vendas/$id"
                        params={{ id: grupo.vendaId }}
                        className="text-base font-semibold text-foreground hover:text-primary"
                      >
                        {grupo.venda?.compradorNome || grupo.parcelas[0]?.compradorNome}
                      </Link>
                      {grupo.vencidas > 0 && (
                        <span className="text-xs font-medium text-destructive">
                          {grupo.vencidas} vencida{grupo.vencidas === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
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
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Em aberto</div>
                        <div className="font-semibold">{grupo.parcelas.length} recebimento(s)</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Total em aberto</div>
                        <div className="font-semibold">{brl0(grupo.total)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Próximo vencimento</div>
                        <div className="font-semibold">{formatDate(grupo.proximoVencimento)}</div>
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
                        <TableHead className="text-right">Valor a receber</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grupo.parcelas.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">
                            <div className="font-medium">{p.origemDescricao}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {p.origemTipo === "sinal" || p.origemTipo === "sinal_parcelado"
                                ? "Entrada"
                                : p.origemTipo === "avista"
                                  ? "À vista"
                                  : "Recebimento contratual"}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {p.numero}/{p.totalParcelas}
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(p.vencimento)}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {brl0(p.valorCobrado)}
                            {p.calc.diasAtraso > 0 && p.valorCobrado !== p.valor && (
                              <div className="text-[11px] font-normal text-muted-foreground">
                                original {brl0(p.valor)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell><ParcelaStatusBadge status={p.status} /></TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => abrirRecebimento(p)}>
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Receber
                            </Button>
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

      <Dialog open={!!selecionada} onOpenChange={(o) => !o && setSelecionada(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar recebimento</DialogTitle>
          </DialogHeader>
          {selecionada && calcSelecionada && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                <div className="font-medium">{selecionada.compradorNome}</div>
                <div className="text-xs text-muted-foreground">
                  {state.empreendimentos.find((e) => e.id === selecionada.empreendimentoId)?.nome} ·
                  Unidade {state.matriculas.find((m) => m.id === selecionada.matriculaId)?.unidade || "—"} ·
                  Matrícula {state.matriculas.find((m) => m.id === selecionada.matriculaId)?.numero || "—"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {selecionada.origemDescricao} · {selecionada.numero}/{selecionada.totalParcelas} · vence em{" "}
                  {formatDate(selecionada.vencimento)}
                </div>
              </div>

              {calcSelecionada.diasAtraso > 0 && (
                <div className="space-y-1.5 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs">
                  <div className="flex justify-between"><span>Valor original</span><strong>{brl0(selecionada.valor)}</strong></div>
                  <div className="flex justify-between"><span>Correção</span><span>{brl0(calcSelecionada.correcao)}</span></div>
                  <div className="flex justify-between"><span>Juros</span><span>{brl0(calcSelecionada.juros)}</span></div>
                  <div className="flex justify-between"><span>Multa / mora</span><span>{brl0(calcSelecionada.mora)}</span></div>
                  <div className="flex justify-between border-t border-destructive/15 pt-1.5 text-sm"><strong>Total atualizado</strong><strong>{brl0(calcSelecionada.atualizado)}</strong></div>
                </div>
              )}

              <div>
                <Label>Valor a registrar</Label>
                <Input type="text" value={brl0(Number(valor) || 0)} readOnly className="bg-muted/30 font-semibold" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Pagamento parcial ainda não está habilitado. O recebimento quita esta parcela integralmente.
                </p>
              </div>
              <div>
                <Label>Data do recebimento</Label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              <p className="rounded bg-primary/5 p-2 text-xs text-muted-foreground">
                Ao confirmar, o sistema reserva o imposto, aplica a comissão do corretor e distribui o saldo entre empresa e sócio.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelecionada(null)}>Cancelar</Button>
            <Button onClick={confirmar}>Confirmar recebimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "destructive" }) {
  const cls = tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-xl font-semibold ${cls}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
