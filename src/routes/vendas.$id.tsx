import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  User,
  CircleDollarSign,
  Landmark,
  Users,
  Wallet,
  Receipt,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ParcelaStatusBadge, VendaStatusBadge } from "@/components/status-badges";
import { DistribuicaoFinanceira } from "@/components/distribuicao-financeira";
import { useStore, vendaTotais, comissaoDaVenda, distribuicaoPrevista } from "@/lib/store";
import { brl0, formatDate, pct } from "@/lib/format";

export const Route = createFileRoute("/vendas/$id")({
  component: VendaDetail,
  head: () => ({ meta: [{ title: "Venda · ImobControl" }] }),
  notFoundComponent: () => (
    <PageShell>
      <PageHeader eyebrow="Vendas" title="Venda não encontrada" />
    </PageShell>
  ),
});

function VendaDetail() {
  const { id } = Route.useParams();
  const { state, receberParcela, reverterParcela } = useStore();
  const v = state.vendas.find((x) => x.id === id);
  if (!v) throw notFound();
  const emp = state.empreendimentos.find((e) => e.id === v.empreendimentoId)!;
  const mat = state.matriculas.find((m) => m.id === v.matriculaId)!;
  const totais = vendaTotais(v, state.parcelas);
  const parcelas = state.parcelas.filter((p) => p.vendaId === v.id);
  const movs = state.movimentos.filter((m) => m.vendaId === v.id);
  const c = comissaoDaVenda(v, state.parcelas, state.config, state.movimentos);
  const imposto = movs.reduce((a, m) => a + m.impostoReservado, 0);
  const empresa = movs.reduce((a, m) => a + m.empresaValor, 0);
  const socio = movs.reduce((a, m) => a + m.socioValor, 0);
  const progresso = totais.previsto ? (totais.recebido / totais.previsto) * 100 : 0;
  const previstoDist = distribuicaoPrevista([emp], [v], state.parcelas, state.config);


  return (
    <PageShell>
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link to="/vendas">
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para vendas
          </Link>
        </Button>
      </div>
      <PageHeader
        eyebrow={`Contrato · ${mat.numero}`}
        title={v.compradorNome}
        description={`${emp.nome} · ${mat.unidade} · assinada em ${formatDate(v.dataContrato)}`}
        actions={<VendaStatusBadge status={v.status} />}
      />

      {/* Fluxo Cliente → Unidade → Valor */}
      <Card className="border-border/70">
        <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-5">
          <FlowItem icon={User} label="Cliente" value={v.compradorNome} />
          <FlowItem icon={Building2} label="Empreendimento" value={emp.nome} sub={emp.spe} />
          <FlowItem icon={Wallet} label="Unidade" value={mat.unidade} sub={mat.numero} />
          <FlowItem icon={CircleDollarSign} label="Valor" value={brl0(v.valorTotal)} sub={`Corretor: ${v.corretorNome}`} />
          <FlowItem icon={Receipt} label="Recebido" value={brl0(totais.recebido)} sub={`${pct(progresso)} do contrato`} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-border/70 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Forma de pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {v.composicao.map((it) => (
              <div key={it.id} className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 p-3 text-sm">
                <div>
                  <div className="font-medium capitalize">{it.tipo.replace("_", " ")}</div>
                  <div className="text-xs text-muted-foreground">{it.descricao}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{brl0(it.valor * (it.parcelas || 1))}</div>
                  <div className="text-xs text-muted-foreground">
                    {it.parcelas > 1 ? `${it.parcelas}x de ${brl0(it.valor)}` : "único"}
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progresso do contrato</span>
                <span>{pct(progresso)}</span>
              </div>
              <Progress value={progresso} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Distribuição financeira</CardTitle>
            <p className="text-xs text-muted-foreground">
              Regras aplicadas automaticamente a cada recebimento.
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row icon={Landmark} label={`Reserva tributária (${emp.aliquotaTributaria}%)`} value={imposto} />
            <Row icon={Users} label={`Comissão do corretor · ${v.corretorNome}`} value={c.pago} sub={`Total: ${brl0(c.total)} · Saldo: ${brl0(c.saldo)}`} />
            <Row icon={Building2} label={`Empresa (${emp.empresaPct}%)`} value={empresa} />
            <Row icon={User} label={`Sócio (${emp.socioPct}%)`} value={socio} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Recebimentos e parcelas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origem</TableHead>
                <TableHead>Nº</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Previsto</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{p.origemDescricao}</TableCell>
                  <TableCell className="text-sm tabular-nums">{p.numero}/{p.totalParcelas}</TableCell>
                  <TableCell className="text-sm">{formatDate(p.vencimento)}</TableCell>
                  <TableCell className="text-right tabular-nums">{brl0(p.valor)}</TableCell>
                  <TableCell className="text-right tabular-nums text-success">{brl0(p.valorPago)}</TableCell>
                  <TableCell><ParcelaStatusBadge status={p.status} /></TableCell>
                  <TableCell className="text-right">
                    {p.status === "paga" ? (
                      <Button size="sm" variant="ghost" onClick={() => { reverterParcela(p.id); toast("Recebimento revertido"); }}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reverter
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { receberParcela(p.id); toast.success("Recebimento registrado"); }}>
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Receber
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DistribuicaoFinanceira
        movimentos={movs}
        empreendimentos={state.empreendimentos}
        previsto={previstoDist}
        descricao={`Como cada recebimento deste contrato foi dividido entre imposto da SPE, corretor, empresa e sócio.`}
      />

      <Card className="border-border/70">

        <CardHeader>
          <CardTitle className="text-base">Histórico de auditoria</CardTitle>
          <p className="text-xs text-muted-foreground">Cada linha registra a distribuição aplicada em um recebimento.</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
                <TableHead className="text-right">Imposto</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
                <TableHead className="text-right">Empresa</TableHead>
                <TableHead className="text-right">Sócio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum recebimento registrado ainda.
                  </TableCell>
                </TableRow>
              )}
              {movs.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm">{formatDate(m.data)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.usuario}</TableCell>
                  <TableCell className="text-sm">{m.origemDescricao}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{brl0(m.valorRecebido)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{brl0(m.impostoReservado)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{brl0(m.comissaoPaga)}</TableCell>
                  <TableCell className="text-right tabular-nums">{brl0(m.empresaValor)}</TableCell>
                  <TableCell className="text-right tabular-nums">{brl0(m.socioValor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function FlowItem({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="flex items-start justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <div>
          <div className="text-sm">{label}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
      </div>
      <span className="font-semibold tabular-nums">{brl0(value)}</span>
    </div>
  );
}
