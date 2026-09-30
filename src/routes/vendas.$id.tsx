import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  Pencil,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  Receipt,
  RotateCcw,
  Trash2,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CurrencyInput } from "@/components/currency-input";
import { DistribuicaoFinanceira } from "@/components/distribuicao-financeira";
import { RegrasInadimplenciaForm } from "@/components/regras-inadimplencia-form";
import { PageHeader, PageShell } from "@/components/page-shell";
import { apiJson } from "@/lib/api";
import type { VendaUpdatePatch } from "@/lib/financeiro-api";
import { ParcelaStatusBadge, VendaStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { addMonths, brl, formatDate, pct, uid } from "@/lib/format";
import { useLiveNow } from "@/lib/use-live-now";
import { useTenant } from "@/lib/tenant";
import {
  comissaoDaVenda,
  DEFAULT_REGRAS_INADIMPLENCIA,
  distribuicaoPrevista,
  inadimplenciaCalc,
  regrasEfetivasEmpreendimento,
  useStore,
  vendaTotais,
  type PagamentoItem,
  type PagamentoTipo,
  type ParcelaStatus,
  type RegrasInadimplencia,
  type Venda,
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

type ClienteEdicao = {
  id: number;
  nome: string;
  cpf: string | null;
};

type PaginaClientesEdicao = {
  content: ClienteEdicao[];
};

function VendaDetail() {
  const { id } = Route.useParams();
  const { empresaAtualId } = useTenant();
  const { state, receberParcela, reverterParcela, updateVenda, deleteVenda } = useStore();
  const navigate = Route.useNavigate();
  const [editarAberta, setEditarAberta] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [clientes, setClientes] = useState<ClienteEdicao[]>([]);
  useEffect(() => {
    if (!empresaAtualId) {
      setClientes([]);
      return;
    }

    let cancelado = false;
    void apiJson<PaginaClientesEdicao>("/api/clientes?pagina=0&tamanho=100", {
      empresaId: empresaAtualId,
    })
      .then((pagina) => {
        if (!cancelado) setClientes(pagina.content);
      })
      .catch(() => {
        if (!cancelado) setClientes([]);
      });

    return () => {
      cancelado = true;
    };
  }, [empresaAtualId]);

  const v = state.vendas.find((x) => x.id === id);
  if (!v) throw notFound();

  const emp = state.empreendimentos.find((e) => e.id === v.empreendimentoId)!;
  const mat = state.matriculas.find((m) => m.id === v.matriculaId)!;
  const regras = v.regras ?? regrasEfetivasEmpreendimento(emp, state.config);
  const totais = vendaTotais(v, state.parcelas);
  const hoje = useLiveNow();
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
  const comissaoProgresso = c.total > 0 ? Math.min(100, (c.pago / c.total) * 100) : 100;
  const ultimoRepasseComissao = [...c.repasses].reverse().find((r) => r.valorRepasse > 0);
  const parcelaQuitacaoComissao = ultimoRepasseComissao
    ? state.parcelas.find((p) => p.id === ultimoRepasseComissao.parcelaId)
    : undefined;
  const comissaoQuitada = c.saldo <= 0.01;
  const comissaoStatus = comissaoQuitada
    ? parcelaQuitacaoComissao?.origemTipo === "sinal" ||
      parcelaQuitacaoComissao?.origemTipo === "sinal_parcelado" ||
      parcelaQuitacaoComissao?.origemTipo === "avista"
      ? "Comissão quitada pela entrada/recebimento inicial. Os próximos recebimentos não geram nova comissão."
      : parcelaQuitacaoComissao
        ? `Comissão quitada na parcela ${parcelaQuitacaoComissao.numero}/${parcelaQuitacaoComissao.totalParcelas}. As próximas parcelas não geram nova comissão.`
        : "Comissão totalmente quitada. Os próximos recebimentos não geram nova comissão."
    : `Em pagamento. Faltam ${brl(c.saldo)} para quitar a comissão do corretor.`;
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
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <VendaStatusBadge status={v.status} />
            <Button size="sm" variant="outline" onClick={() => setEditarAberta(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Editar venda
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir venda
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza que deseja excluir esta venda?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A composição e as parcelas desta venda serão removidas, e a unidade {mat.unidade}
                    voltará para Disponível. Vendas que já possuem histórico de recebimentos não podem
                    ser excluídas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={excluindo}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async (event) => {
                      event.preventDefault();
                      setExcluindo(true);
                      try {
                        await deleteVenda(v.id);
                        toast.success("Venda excluída. A unidade voltou a ficar disponível.");
                        void navigate({ to: "/vendas" });
                      } catch (error) {
                        setExcluindo(false);
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Não foi possível excluir a venda",
                        );
                      }
                    }}
                  >
                    {excluindo ? "Excluindo..." : "Sim, excluir venda"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      <Dialog open={editarAberta} onOpenChange={setEditarAberta}>
        <EditarVendaDialog
          venda={v}
          clientes={clientes}
          possuiRecebimentos={movs.length > 0}
          onSalvar={async (patch) => {
            try {
              await updateVenda(v.id, patch);
              toast.success("Venda atualizada");
              setEditarAberta(false);
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Não foi possível atualizar a venda",
              );
            }
          }}
          onClose={() => setEditarAberta(false)}
        />
      </Dialog>

      <Card className="border-border/70">
        <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-5">
          <FlowItem icon={User} label="Cliente" value={v.compradorNome} />
          <FlowItem icon={Building2} label="Empreendimento" value={emp.nome} sub={emp.spe} />
          <FlowItem icon={Wallet} label="Unidade" value={mat.unidade} sub={mat.numero} />
          <FlowItem
            icon={CircleDollarSign}
            label="Valor"
            value={brl(v.valorTotal)}
            sub={`Corretor: ${v.corretorNome || "—"}`}
          />
          <FlowItem
            icon={Receipt}
            label="Liquidado"
            value={brl(totais.recebido)}
            sub={`${pct(progresso)} do contrato`}
          />
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-sm">
          <div className="font-semibold text-foreground">Regras financeiras desta venda</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Tributação e participações ficam vinculadas ao contrato. Juros, correção, multa e tolerância
            podem ser ajustados nesta venda e recalculam as parcelas ainda abertas. Recebimentos já
            realizados permanecem no histórico com os valores efetivamente registrados.
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

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleDollarSign className="h-4 w-4" />
            Acompanhamento da comissão do corretor
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            O sistema acumula os repasses até atingir a comissão total do contrato e interrompe
            automaticamente novos repasses depois da quitação.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Comissão contratada</p>
              <p className="font-semibold">{brl(c.total)} · {v.corretorPct}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Já paga</p>
              <p className="font-semibold text-success">{brl(c.pago)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo da comissão</p>
              <p className="font-semibold">{brl(c.saldo)}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso da comissão</span>
              <span>{pct(comissaoProgresso)}</span>
            </div>
            <Progress value={comissaoProgresso} className="h-2" />
          </div>
          <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-sm">
            <div className="flex items-start gap-2">
              {comissaoQuitada && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />}
              <span>{comissaoStatus}</span>
            </div>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Regra deste contrato: a comissão total é {v.corretorPct}% da venda ({brl(c.total)}).
            A cada entrada ou parcela, {(v.repasseComissaoPct ?? regras.repasseComissaoPct ?? 50)}% do valor-base
            é destinado ao corretor até atingir esse teto. Depois da quitação, os próximos recebimentos
            geram comissão de R$ 0. Acréscimos por atraso: {(v.comissaoSobreAcrescimos ?? regras.comissaoSobreAcrescimos)
              ? "entram na base do repasse"
              : "não entram na base do repasse"}.
          </p>
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
                    <div className="font-semibold">{brl(it.valor * quantidade)}</div>
                    <div className="text-xs text-muted-foreground">
                      {parcelado && quantidade > 1
                        ? `${quantidade}x de ${brl(it.valor)}`
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
              sub={`Total: ${brl(c.total)} · Saldo: ${brl(c.saldo)}`}
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
                    {brl(p.status === "vencida" ? p.valorCobrado : p.valor)}
                    {p.status === "vencida" && p.valorCobrado !== p.valor && (
                      <div className="text-[11px] text-muted-foreground">
                        original {brl(p.valor)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-success">
                    {brl(p.valorPago)}
                  </TableCell>
                  <TableCell>
                    <ParcelaStatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status === "paga" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            await reverterParcela(p.id);
                            toast("Recebimento revertido");
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Não foi possível reverter o recebimento",
                            );
                          }
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
                        onClick={async () => {
                          try {
                            await receberParcela(p.id, p.valorCobrado);
                            toast.success(
                              p.status === "vencida"
                                ? "Parcela recebida com os acréscimos contratuais"
                                : "Recebimento registrado",
                            );
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Não foi possível registrar o recebimento",
                            );
                          }
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
                <TableHead className="text-right">Base comissão</TableHead>
                <TableHead className="text-right">% repasse</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
                <TableHead className="text-right">Saldo comissão</TableHead>
                <TableHead className="text-right">Empresa</TableHead>
                <TableHead className="text-right">Sócio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-sm text-muted-foreground">
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
                    {brl(m.valorRecebido)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {brl(m.impostoReservado)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {brl(m.comissaoBaseCalculo ?? m.valorRecebido)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {(m.comissaoRepassePctAplicado ?? v.repasseComissaoPct ?? regras.repasseComissaoPct ?? 50)}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {brl(m.comissaoPaga)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {m.saldoComissaoApos == null ? "—" : brl(m.saldoComissaoApos)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{brl(m.empresaValor)}</TableCell>
                  <TableCell className="text-right tabular-nums">{brl(m.socioValor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}


function EditarVendaDialog({
  venda,
  clientes,
  possuiRecebimentos,
  onSalvar,
  onClose,
}: {
  venda: Venda;
  clientes: ClienteEdicao[];
  possuiRecebimentos: boolean;
  onSalvar: (patch: VendaUpdatePatch) => void;
  onClose: () => void;
}) {
  const [clienteId, setClienteId] = useState(venda.clienteId ?? "");
  const clienteSelecionado = clientes.find((cliente) => String(cliente.id) === clienteId);
  const [valorTotal, setValorTotal] = useState(venda.valorTotal);
  const [dataContrato, setDataContrato] = useState(venda.dataContrato);
  const [corretorNome, setCorretorNome] = useState(venda.corretorNome);
  const [corretorPct, setCorretorPct] = useState(String(venda.corretorPct));
  const [repassePct, setRepassePct] = useState(String(venda.repasseComissaoPct ?? 50));
  const [sobreAcrescimos, setSobreAcrescimos] = useState(
    venda.comissaoSobreAcrescimos ? "sim" : "nao",
  );
  const [regrasInadimplencia, setRegrasInadimplencia] =
    useState<RegrasInadimplencia>({
      ...DEFAULT_REGRAS_INADIMPLENCIA,
      ...(venda.regras?.inadimplencia ?? {}),
    });
  const [observacoes, setObservacoes] = useState(venda.observacoes ?? "");
  const [composicao, setComposicao] = useState<PagamentoItem[]>(() =>
    venda.composicao.map((item) => ({ ...item })),
  );

  const totalVenda = valorTotal;
  const totalVendaCentavos = Math.round(totalVenda * 100);
  const totalComposicaoCentavos = composicao.reduce((total, item) => {
    const quantidade = itemParcelado(item.tipo) ? Math.max(1, item.parcelas) : 1;
    return total + Math.round(item.valor * 100) * quantidade;
  }, 0);
  const totalComposicao = totalComposicaoCentavos / 100;
  const diferencaCentavos = totalVendaCentavos - totalComposicaoCentavos;
  const parcelasAjustaveis = composicao.reduce(
    (total, item) =>
      total + (itemParcelado(item.tipo) ? Math.max(1, item.parcelas) : 0),
    0,
  );
  const limiteArredondamentoCentavos = Math.max(1, Math.ceil(parcelasAjustaveis / 2));
  const composicaoConfere =
    diferencaCentavos === 0 ||
    (parcelasAjustaveis > 0 &&
      Math.abs(diferencaCentavos) <= limiteArredondamentoCentavos);

  const adicionar = (tipo: PagamentoTipo) => {
    setComposicao((itens) => [
      ...itens,
      {
        id: uid(),
        tipo,
        descricao: "",
        valor: 0,
        parcelas: 1,
        primeiroVencimento:
          tipo === "parcelas" || tipo === "sinal_parcelado"
            ? addMonths(dataContrato, 1)
            : dataContrato,
        status: "pendente",
      },
    ]);
  };

  const salvar = () => {
    const comissao = Number(corretorPct) || 0;
    const repasse = Number(repassePct) || 0;
    if (!clienteId || !clienteSelecionado) {
      toast.error("Selecione o cliente");
      return;
    }
    if (comissao < 0 || comissao > 100 || repasse < 0 || repasse > 100) {
      toast.error("Os percentuais devem ficar entre 0% e 100%");
      return;
    }
    if (!possuiRecebimentos && (totalVenda <= 0 || !composicaoConfere)) {
      toast.error("A composição não fecha com o valor da venda. Diferenças normais de arredondamento de parcelas são ajustadas automaticamente.");
      return;
    }

    onSalvar({
      clienteId,
      compradorNome: clienteSelecionado.nome,
      ...(!possuiRecebimentos
        ? { valorTotal: totalVenda, composicao }
        : {}),
      dataContrato,
      corretorNome: corretorNome.trim(),
      corretorPct: comissao,
      repasseComissaoPct: repasse,
      comissaoSobreAcrescimos: sobreAcrescimos === "sim",
      regrasInadimplencia,
      observacoes,
    });
  };

  return (
    <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Editar venda</DialogTitle>
        <DialogDescription>
          Dados cadastrais, comissão e regras de atraso podem ser corrigidos. Valor e composição das
          parcelas ficam bloqueados após o primeiro recebimento, mas juros, correção, multa e tolerância
          continuam editáveis para as parcelas ainda abertas.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Cliente / Comprador</Label>
          <Select
            value={clienteId}
            onValueChange={setClienteId}
            disabled={possuiRecebimentos}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={String(cliente.id)}>
                  {cliente.nome}
                  {cliente.cpf ? ` · CPF ${cliente.cpf}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {possuiRecebimentos && (
            <p className="mt-1 text-xs text-muted-foreground">
              O comprador fica bloqueado após o primeiro recebimento para preservar o histórico.
            </p>
          )}
        </div>
        <div>
          <Label>Valor total da venda</Label>
          <CurrencyInput
            value={valorTotal}
            onValueChange={setValorTotal}
            disabled={possuiRecebimentos}
            placeholder="Ex.: 100.000,00"
          />
        </div>
        <div>
          <Label>Data do contrato</Label>
          <Input type="date" value={dataContrato} onChange={(e) => setDataContrato(e.target.value)} />
        </div>
        <div>
          <Label>Corretor</Label>
          <Input value={corretorNome} onChange={(e) => setCorretorNome(e.target.value)} />
        </div>
        <div>
          <Label>% comissão total sobre a venda</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={corretorPct}
            onChange={(e) => setCorretorPct(e.target.value)}
          />
        </div>
        <div>
          <Label>% de cada recebimento para quitar a comissão</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={repassePct}
            onChange={(e) => setRepassePct(e.target.value)}
          />
        </div>
        <div>
          <Label>Repasse incide sobre multa/juros/correção?</Label>
          <Select value={sobreAcrescimos} onValueChange={setSobreAcrescimos}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nao">Não — somente principal</SelectItem>
              <SelectItem value="sim">Sim — total recebido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Observações</Label>
          <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>
      </div>

      <div className="border-t border-border/70 pt-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Juros, correção e multa desta venda</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Você pode alterar estas condições a qualquer momento. O novo cálculo passa a valer para
            parcelas ainda abertas e vencidas. Recebimentos já quitados não são reescritos.
          </p>
        </div>
        <RegrasInadimplenciaForm
          value={regrasInadimplencia}
          onChange={setRegrasInadimplencia}
        />
      </div>

      <div className="border-t border-border/70 pt-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Composição do pagamento</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {possuiRecebimentos
                ? "Bloqueada porque já existem recebimentos registrados."
                : `Total da composição: ${brl(totalComposicao)}`}
            </p>
          </div>
          {!possuiRecebimentos && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => adicionar("sinal")}>+ Entrada</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => adicionar("parcelas")}>+ Parcelas</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => adicionar("outro")}>+ Outro</Button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {composicao.map((item, idx) => {
            const parcelado = itemParcelado(item.tipo);
            return (
              <div key={item.id} className="grid grid-cols-1 gap-3 rounded-lg border border-border/70 p-3 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={item.tipo}
                    disabled={possuiRecebimentos}
                    onValueChange={(value) =>
                      setComposicao((atuais) =>
                        atuais.map((x, i) =>
                          i === idx ? { ...x, tipo: value as PagamentoTipo } : x,
                        ),
                      )
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="avista">À vista</SelectItem>
                      <SelectItem value="sinal">Entrada</SelectItem>
                      <SelectItem value="sinal_parcelado">Entrada parcelada</SelectItem>
                      <SelectItem value="parcelas">Parcelas</SelectItem>
                      <SelectItem value="bem">Bem material</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Descrição</Label>
                  <Input
                    value={item.descricao}
                    disabled={possuiRecebimentos}
                    onChange={(e) =>
                      setComposicao((atuais) =>
                        atuais.map((x, i) => (i === idx ? { ...x, descricao: e.target.value } : x)),
                      )
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">{parcelado ? "Valor/parcela" : "Valor"}</Label>
                  <CurrencyInput
                    value={item.valor}
                    disabled={possuiRecebimentos}
                    onValueChange={(valor) =>
                      setComposicao((atuais) =>
                        atuais.map((x, i) => (i === idx ? { ...x, valor } : x)),
                      )
                    }
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label className="text-xs">Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    value={parcelado ? item.parcelas : 1}
                    disabled={possuiRecebimentos || !parcelado}
                    onChange={(e) =>
                      setComposicao((atuais) =>
                        atuais.map((x, i) =>
                          i === idx ? { ...x, parcelas: Math.max(1, Number(e.target.value) || 1) } : x,
                        ),
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">1º vencimento</Label>
                  <Input
                    type="date"
                    value={item.primeiroVencimento}
                    disabled={possuiRecebimentos || item.tipo === "bem"}
                    onChange={(e) =>
                      setComposicao((atuais) =>
                        atuais.map((x, i) =>
                          i === idx ? { ...x, primeiroVencimento: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </div>
                {!possuiRecebimentos && (
                  <div className="flex items-end sm:col-span-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setComposicao((atuais) => atuais.filter((_, i) => i !== idx))}
                    >
                      Remover item
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar}>Salvar alterações</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function itemParcelado(tipo: PagamentoTipo) {
  return tipo === "parcelas" || tipo === "sinal_parcelado";
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
      <span className="font-semibold tabular-nums">{brl(value)}</span>
    </div>
  );
}
