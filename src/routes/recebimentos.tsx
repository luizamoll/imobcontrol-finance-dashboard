import { createFileRoute, Link } from "@tanstack/react-router";
import { Inbox, CheckCircle2, Search } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ParcelaStatusBadge } from "@/components/status-badges";
import { useStore, type Parcela, type ParcelaStatus } from "@/lib/store";
import { brl0, formatDate, todayISO } from "@/lib/format";

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

  const today = new Date();

  const parcelas = useMemo(() => {
    return state.parcelas
      .map((p) => {
        if (p.status === "pendente" && new Date(p.vencimento) < today) {
          return { ...p, status: "vencida" as ParcelaStatus };
        }
        return p;
      })
      .filter((p) => p.status !== "paga" && p.status !== "cancelada")
      .filter((p) => (empFilter === "todos" ? true : p.empreendimentoId === empFilter))
      .filter((p) =>
        origem === "todos"
          ? true
          : origem === "sinal"
            ? p.origemTipo === "sinal" || p.origemTipo === "sinal_parcelado" || p.origemTipo === "avista"
            : p.origemTipo === "parcelas",
      )
      .filter((p) =>
        busca
          ? p.compradorNome.toLowerCase().includes(busca.toLowerCase())
          : true,
      )
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  }, [state.parcelas, empFilter, origem, busca]);

  const totalAReceber = parcelas.reduce((a, p) => a + p.valor, 0);
  const totalVencido = parcelas.filter((p) => p.status === "vencida").reduce((a, p) => a + p.valor, 0);

  const abrirRecebimento = (p: Parcela) => {
    setSelecionada(p);
    setValor(String(p.valor));
    setData(todayISO());
  };

  const confirmar = () => {
    if (!selecionada) return;
    receberParcela(selecionada.id, Number(valor) || selecionada.valor, data);
    toast.success("Recebimento registrado", {
      description: "Distribuição financeira executada automaticamente.",
    });
    setSelecionada(null);
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Operacional"
        title="Central de Recebimentos"
        description="Tela principal de operação diária. Registre recebimentos e o sistema executa toda a distribuição financeira."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Mini label="Parcelas em aberto" value={String(parcelas.length)} />
        <Mini label="Total a receber" value={brl0(totalAReceber)} />
        <Mini label="Vencidas" value={brl0(totalVencido)} tone="destructive" />
        <Mini label="Empreendimentos" value={String(state.empreendimentos.length)} />
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
            <Label>Buscar cliente</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Nome do cliente" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
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
                <TableHead>Origem</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    <Inbox className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    Nenhum recebimento pendente para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
              {parcelas.map((p) => {
                const emp = state.empreendimentos.find((e) => e.id === p.empreendimentoId);
                const mat = state.matriculas.find((m) => m.id === p.matriculaId);
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
                    <TableCell className="text-sm tabular-nums">{p.numero}/{p.totalParcelas}</TableCell>
                    <TableCell className="text-sm">{formatDate(p.vencimento)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{brl0(p.valor)}</TableCell>
                    <TableCell><ParcelaStatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => abrirRecebimento(p)}>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Receber
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selecionada} onOpenChange={(o) => !o && setSelecionada(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar recebimento</DialogTitle>
          </DialogHeader>
          {selecionada && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                <div className="font-medium">{selecionada.compradorNome}</div>
                <div className="text-xs text-muted-foreground">
                  {state.empreendimentos.find((e) => e.id === selecionada.empreendimentoId)?.nome} · {state.matriculas.find((m) => m.id === selecionada.matriculaId)?.unidade}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {selecionada.origemDescricao} · vence em {formatDate(selecionada.vencimento)}
                </div>
              </div>
              <div>
                <Label>Valor recebido (R$)</Label>
                <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
              <div>
                <Label>Data do recebimento</Label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              <p className="rounded bg-primary/5 p-2 text-xs text-muted-foreground">
                Ao confirmar, o sistema reserva o imposto, quita a comissão do corretor e distribui o saldo entre empresa e sócio.
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
