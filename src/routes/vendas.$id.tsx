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
  User,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DistribuicaoFinanceira } from "@/components/distribuicao-financeira";
import { PageHeader, PageShell } from "@/components/page-shell";
import { apiJson } from "@/lib/api";
import { ParcelaStatusBadge, VendaStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
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
import { addMonths, brl0, formatDate, pct, uid } from "@/lib/format";
import { useLiveNow } from "@/lib/use-live-now";
import { useTenant } from "@/lib/tenant";
import {
  comissaoDaVenda,
  distribuicaoPrevista,
  inadimplenciaCalc,
  regrasEfetivasEmpreendimento,
  useStore,
  vendaTotais,
  type PagamentoItem,
  type PagamentoTipo,
  type ParcelaStatus,
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
  const { state, receberParcela, reverterParcela, updateVenda } = useStore();
  const [editarAberta, setEditarAberta] = useState(false);
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
    : `Em pagamento. Faltam ${brl0(c.saldo)} para quitar a comissão do corretor.`;
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
          <div className="flex items-center gap-2">
            <VendaStatusBadge status={v.status} />
            <Button size="sm" variant="outline" onClick={() => setEditarAberta(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Editar venda
            </Button>
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
              <p className="font-semibold">{brl0(c.total)} · {v.corretorPct}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Já paga</p>
              <p className="font-semibold text-success">{brl0(c.pago)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo da comissão</p>
              <p className="font-semibold">{brl0(c.saldo)}</p>
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
            Regra deste contrato: a comissão total é {v.corretorPct}% da venda ({brl0(c.total)}).
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
                    {brl0(m.valorRecebido)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {brl0(m.impostoReservado)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {brl0(m.comissaoBaseCalculo ?? m.valorRecebido)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {(m.comissaoRepassePctAplicado ?? v.repasseComissaoPct ?? regras.repasseComissaoPct ?? 50)}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {brl0(m.comissaoPaga)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {m.saldoComissaoApos == null ? "—" : brl0(m.saldoComissaoApos)}
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
  onSalvar: (patch: Partial<Venda>) => void;
  onClose: () => void;
}) {
  const [clienteId, setClienteId] = useState(venda.clienteId ?? "");
  const clienteSelecionado = clientes.find((cliente) => String(cliente.id) === clienteId);
  const [valorTotal, setValorTotal] = useState(String(venda.valorTotal));
  const [dataContrato, setDataContrato] = useState(venda.dataContrato);
  const [corretorNome, setCorretorNome] = useState(venda.corretorNome);
  const [corretorPct, setCorretorPct] = useState(String(venda.corretorPct));
  const [repassePct, setRepassePct] = useState(String(venda.repasseComissaoPct ?? 50));
  const [sobreAcrescimos, setSobreAcrescimos] = useState(
    venda.comissaoSobreAcrescimos ? "sim" : "nao",
  );
  const [observacoes, setObservacoes] = useState(venda.observacoes ?? "");
  const [composicao, setComposicao] = useState<PagamentoItem[]>(() =>
    venda.composicao.map((item) => ({ ...item })),
  );

  const totalComposicao = composicao.reduce(
    (total, item) =>
      total + item.valor * (itemParcelado(item.tipo) ? Math.max(1, item.parcelas) : 1),
    0,
  );
  const totalVenda = Number(valorTotal) || 0;
  const composicaoConfere = Math.abs(totalComposicao - totalVenda) <= 0.01;

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
      toast.error("O valor da venda e a composição do pagamento precisam fechar");
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
      observacoes,
    });
  };

  return (
    <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Editar venda</DialogTitle>
        <DialogDescription>
          Dados cadastrais e regras de comissão podem ser corrigidos. Valor e parcelas só podem ser
          alterados antes do primeiro recebimento, para preservar o histórico financeiro.
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
          <Input
            type="number"
            min="0"
            value={valorTotal}
            disabled={possuiRecebimentos}
            onChange={(e) => setValorTotal(e.target.value)}
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
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Composição do pagamento</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {possuiRecebimentos
                ? "Bloqueada porque já existem recebimentos registrados."
                : `Total da composição: ${brl0(totalComposicao)}`}
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
                  <Input
                    type="number"
                    min="0"
                    value={item.valor}
                    disabled={possuiRecebimentos}
                    onChange={(e) =>
                      setComposicao((atuais) =>
                        atuais.map((x, i) => (i === idx ? { ...x, valor: Number(e.target.value) || 0 } : x)),
                      )
                    }
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
      <span className="font-semibold tabular-nums">{brl0(value)}</span>
    </div>
  );
}
