import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  Receipt,
  RotateCcw,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { DistribuicaoFinanceira } from "@/components/distribuicao-financeira";
import { PageHeader, PageShell } from "@/components/page-shell";
import { ParcelaStatusBadge, VendaStatusBadge } from "@/components/status-badges";
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
import { brl0, formatDate, pct } from "@/lib/format";
import {
  comissaoDaVenda,
  distribuicaoPrevista,
  inadimplenciaCalc,
  regrasEfetivasEmpreendimento,
  useStore,
  vendaTotais,
  type PagamentoTipo,
  type ParcelaStatus,
} from "@/lib/store";

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
  const regras = v.regras ?? regrasEfetivasEmpreendimento(emp, state.config);
  const totais = vendaTotais(v, state.parcelas);
  const hoje = new Date();
  const parcelas = state.parcelas
    .filter((p) => p.vendaId === v.id)
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
    });
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

      <Card className="border-border/70">
        <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-5">
          <FlowItem icon={User} label="Cliente" value={v.compradorNome} />
          <FlowItem icon={Building2} label="Empreendimento" value={emp.nome} sub={emp.spe} />
          <FlowItem icon={Wallet} label="Unidade" value={mat.unidade} sub={mat.numero} />
          <FlowItem
            icon={CircleDollarSign}
            label="Valor"
            value={brl0(v.valorTotal)}
            sub={`Corretor: ${v.corretorNome || "—"}`}
          />
          <FlowItem
            icon={Receipt}
            label="Liquidado"
            value={brl0(totais.recebido)}
            sub={`${pct(progresso)} do contrato`}
          />
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-sm">
          <div className="font-semibold text-foreground">Regras contratuais congeladas</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Este contrato preserva as regras registradas no momento da venda. Alterações posteriores em
            {" "}{emp.nome} não modificam cálculos históricos nem parcelas deste contrato.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
            <MiniRegra label="Tributação" value={`${regras.aliquotaTributaria}%`} />
            <MiniRegra label="Corretor" value={`${v.corretorPct}%`} />
            <MiniRegra label="Sócio · líquido" value={`${regras.socioPct}%`} />
            <MiniRegra label="Empresa · líquido" value={`${regras.empresaPct}%`} />
            <MiniRegra
              label="Atraso"
              value={regras.inadimplencia.jurosAtivo || regras.inadimplencia.moraAtiva || regras.inadimplencia.correcaoAtiva ? "Configurado" : "Sem acréscimos"}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-border/70 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Composição do pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {v.composicao.map((it) => {
              const parcelado = it.tipo === "parcelas" || it.tipo === "sinal_parcelado";
              const quantidade = parcelado ? Math.max(1, it.parcelas || 1) : 1;
              return (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-border/60 bg-muted/20 p-3 text-sm"
                >
                  <div>
                    <div className="font-medium">{pagamentoLegivel(it.tipo)}</div>
                    <div className="text-xs text-muted-foreground">
                      {it.descricao || "Sem descrição adicional"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{brl0(it.valor * quantidade)}</div>
                    <div className="text-xs text-muted-foreground">
                      {parcelado && quantidade > 1
                        ? `${quantidade}x de ${brl0(it.valor)}`
                        : it.tipo === "bem"
                          ? "parte do pagamento"
                          : "pagamento único"}
                    </div>
                  </div>
                </div>
              );
            })}
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
              Valores realizados com as regras congeladas deste contrato.
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row
              icon={Landmark}
              label={`Reserva tributária (${regras.aliquotaTributaria}%)`}
              value={imposto}
            />
            <Row
              icon={Users}
              label={`Comissão do corretor · ${v.corretorNome || "—"}`}
              value={c.pago}
              sub={`Total: ${brl0(c.total)} · Saldo: ${brl0(c.saldo)}`}
            />
            <Row icon={Building2} label={`Empresa (${regras.empresaPct}%)`} value={empresa} />
            <Row icon={User} label={`Sócio (${regras.socioPct}%)`} value={socio} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Recebimentos e parcelas</CardTitle>
          <p className="text-xs text-muted-foreground">
            Cada parcela usa a regra de inadimplência congelada no contrato, não uma configuração global
            atual do sistema.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origem</TableHead>
                <TableHead>Nº</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">A receber</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{p.origemDescricao}</TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {p.numero}/{p.totalParcelas}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(p.vencimento)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {brl0(p.status === "vencida" ? p.valorCobrado : p.valor)}
                    {p.status === "vencida" && p.valorCobrado !== p.valor && (
                      <div className="text-[11px] text-muted-foreground">
                        original {brl0(p.valor)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-success">
                    {brl0(p.valorPago)}
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
                          reverterParcela(p.id);
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
        </CardContent>
      </Card>

      <DistribuicaoFinanceira
        movimentos={movs}
        empreendimentos={state.empreendimentos}
        previsto={previstoDist}
        descricao="Como cada recebimento deste contrato foi dividido entre imposto da SPE, corretor, empresa e sócio."
      />

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Histórico de auditoria</CardTitle>
          <p className="text-xs text-muted-foreground">
            Cada linha registra a distribuição efetivamente aplicada no recebimento.
          </p>
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
                  <TableCell className="text-right font-medium tabular-nums">
                    {brl0(m.valorRecebido)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {brl0(m.impostoReservado)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {brl0(m.comissaoPaga)}
                  </TableCell>
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

function pagamentoLegivel(tipo: PagamentoTipo) {
  const labels: Record<PagamentoTipo, string> = {
    avista: "À vista",
    sinal: "Sinal",
    sinal_parcelado: "Sinal parcelado",
    parcelas: "Parcelas",
    bem: "Bem material",
    sem_sinal: "Sem sinal (legado)",
    outro: "Outro",
  };
  return labels[tipo];
}

function MiniRegra({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
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
