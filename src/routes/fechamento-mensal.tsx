import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, CalendarDays, CheckCircle2, Download, FileText, Plus, Printer, RefreshCw, RotateCcw, Search, Wallet } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/page-shell";
import { CurrencyInput } from "@/components/currency-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { brl, formatDate, todayISO } from "@/lib/format";
import { temAlgumaPermissao } from "@/lib/permissoes";
import { useStore } from "@/lib/store";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/fechamento-mensal")({
  component: FechamentoMensalPage,
  head: () => ({ meta: [{ title: "Fechamento Mensal · ImobControl" }] }),
});

const tipos = {
  CUSTO_EMPREENDIMENTO: "Custo com empreendimento",
  IMPOSTO_PAGO: "Imposto efetivamente pago",
  DISTRATO_DEVOLUCAO: "Valor devolvido em distrato",
  RETENCAO: "Valor retido / reservado",
  OUTRA_RECEITA: "Outra entrada recebida",
  COMISSAO_PAGA: "Comissão efetivamente paga ao corretor",
  REPASSE_SOCIO_PAGO: "Repasse efetivamente pago ao sócio",
  REPASSE_EMPREENDEDOR_PAGO: "Repasse efetivamente pago à empresa",
} as const;

type TipoLancamento = keyof typeof tipos;

type Lancamento = {
  id: number;
  empreendimentoId: number;
  data: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  estornado: boolean;
  criadoEm: string;
};

type UnidadeFechamento = {
  unidadeId: number;
  unidade: string;
  comprador: string;
  pagouNoMes: boolean;
  inadimplenteNoFim: boolean;
  recebidoNoMes: number;
  saldoVencido: number;
  ultimoPagamentoMes: string | null;
};

type Fechamento = {
  mes: string;
  empreendimentoId: number | null;
  totalGlebas: number;
  glebasAdimplentes: number;
  glebasInadimplentes: number;
  glebasComPagamentoMes: number;
  recebidoParcelas: number;
  outrasReceitas: number;
  valorTotalRecebido: number;
  custoEmpreendimento: number;
  valorSocio: number;
  valorEmpreendedor: number;
  impostoReservado: number;
  impostoPago: number;
  comissaoRegistrada: number;
  comissaoEfetivamentePaga: number;
  socioEfetivamentePago: number;
  empreendedorEfetivamentePago: number;
  valorDevolvidoDistrato: number;
  valorRetido: number;
  saldoDisponivelEstimado: number;
  lancamentos: Lancamento[];
  unidades: UnidadeFechamento[];
};

type Arquivo = {
  id: number;
  mes: string;
  empreendimentoId: number;
  criadoEm: string;
  criadoPorUsuarioId: number;
  relatorio: Fechamento;
};

const brlSeguro = (n: number | null | undefined) => brl(Number(n || 0));

function FechamentoMensalPage() {
  const { empresaAtualId, empresaAtual } = useTenant();
  const { state } = useStore();
  const { usuario } = useAuth();
  const podeLancar = temAlgumaPermissao(usuario, ["RECEBIMENTOS_REGISTRAR", "CONFIGURACOES_GERENCIAR"]);
  const podeEstornar = temAlgumaPermissao(usuario, ["RECEBIMENTOS_ESTORNAR", "CONFIGURACOES_GERENCIAR"]);
  const podeArquivar = temAlgumaPermissao(usuario, ["CONFIGURACOES_GERENCIAR"]);
  const [mes, setMes] = useState(() => todayISO().slice(0, 7));
  const [empreendimento, setEmpreendimento] = useState("todos");
  const [fechamento, setFechamento] = useState<Fechamento | null>(null);
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [arquivoAberto, setArquivoAberto] = useState<Arquivo | null>(null);
  const [arquivando, setArquivando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoLancamento>("CUSTO_EMPREENDIMENTO");
  const [data, setData] = useState(() => todayISO());
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState("resumo");
  const [buscaUnidade, setBuscaUnidade] = useState("");
  const [filtroUnidade, setFiltroUnidade] = useState("todas");

  const empreendimentos = useMemo(
    () => [...state.empreendimentos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [state.empreendimentos],
  );

  const carregar = useCallback(async () => {
    if (!empresaAtualId) {
      setFechamento(null);
      return;
    }
    setCarregando(true);
    setErro("");
    try {
      const params = new URLSearchParams({ mes });
      if (empreendimento !== "todos") params.set("empreendimentoId", empreendimento);
      const resultado = await apiJson<Fechamento>(
        `/api/fechamento-mensal?${params.toString()}`,
        { empresaId: empresaAtualId },
      );
      setFechamento(resultado);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Não foi possível calcular o fechamento";
      setErro(msg);
      setFechamento(null);
      toast.error(msg);
    } finally {
      setCarregando(false);
    }
  }, [empresaAtualId, mes, empreendimento]);

  useEffect(() => { void carregar(); }, [carregar]);

  const carregarArquivos = useCallback(async () => {
    if (!empresaAtualId) {
      setArquivos([]);
      return;
    }
    try {
      const lista = await apiJson<Arquivo[]>("/api/fechamento-mensal/arquivos", {
        empresaId: empresaAtualId,
      });
      setArquivos(lista);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar os arquivos");
    }
  }, [empresaAtualId]);

  useEffect(() => { void carregarArquivos(); }, [carregarArquivos]);

  const exibido = arquivoAberto?.relatorio ?? fechamento;
  const arquivadoNesteMes = arquivos.some((item) =>
    item.mes === mes && String(item.empreendimentoId) === empreendimento
  );
  const mesEncerrado = mes < todayISO().slice(0, 7);
  const unidadesFiltradas = useMemo(() => {
    const lista = exibido?.unidades ?? [];
    const busca = buscaUnidade.trim().toLocaleLowerCase("pt-BR");
    return lista.filter((item) => {
      if (busca && !(item.unidade + " " + item.comprador).toLocaleLowerCase("pt-BR").includes(busca)) return false;
      if (filtroUnidade === "pagaram") return item.pagouNoMes;
      if (filtroUnidade === "inadimplentes") return item.inadimplenteNoFim;
      if (filtroUnidade === "adimplentes") return !item.inadimplenteNoFim;
      return true;
    });
  }, [exibido, buscaUnidade, filtroUnidade]);

  const arquivar = async () => {
    if (!empresaAtualId || empreendimento === "todos" || !fechamento || !mesEncerrado) return;
    if (!window.confirm(
      `Arquivar definitivamente o fechamento de ${mes} para ${nomeEmpreendimento(Number(empreendimento))}? Os números guardados não serão alterados mesmo após correções futuras.`
    )) return;
    setArquivando(true);
    try {
      const salvo = await apiJson<Arquivo>("/api/fechamento-mensal/arquivos", {
        method: "POST", empresaId: empresaAtualId,
        body: JSON.stringify({ mes, empreendimentoId: Number(empreendimento) }),
      });
      setArquivoAberto(salvo);
      setAba("resumo");
      await carregarArquivos();
      toast.success("Fechamento arquivado. Pode ser consultado ou impresso depois.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível arquivar");
    } finally {
      setArquivando(false);
    }
  };

  const nomeEmpreendimento = (id: number) =>
    empreendimentos.find((e) => String(e.id) === String(id))?.nome ?? `Empreendimento #${id}`;

  const abrirLancamento = () => {
    setData(mes === todayISO().slice(0, 7) ? todayISO() : `${mes}-01`);
    setDescricao("");
    setValor(0);
    setTipo("CUSTO_EMPREENDIMENTO");
    setFormAberto(true);
  };

  const cadastrar = async () => {
    if (!empresaAtualId || empreendimento === "todos") {
      toast.error("Selecione um empreendimento específico para registrar o lançamento.");
      return;
    }
    if (!data.startsWith(mes)) {
      toast.error("A data precisa pertencer ao mês selecionado.");
      return;
    }
    if (!descricao.trim() || valor <= 0 || !Number.isFinite(valor)) {
      toast.error("Preencha o motivo e um valor positivo.");
      return;
    }
    setSalvando(true);
    try {
      await apiJson<Lancamento>("/api/fechamento-mensal/lancamentos", {
        empresaId: empresaAtualId,
        method: "POST",
        body: JSON.stringify({
          empreendimentoId: Number(empreendimento),
          data,
          tipo,
          descricao: descricao.trim(),
          valor: Math.round(valor * 100) / 100,
        }),
      });
      toast.success("Lançamento registrado no fechamento");
      setFormAberto(false);
      setValor(0);
      setDescricao("");
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível lançar");
    } finally {
      setSalvando(false);
    }
  };

  const estornar = async (item: Lancamento) => {
    if (!empresaAtualId || !window.confirm(
      `Estornar ${tipos[item.tipo]} de ${brlSeguro(item.valor)}? O histórico será preservado.`
    )) return;
    try {
      await apiJson<void>(`/api/fechamento-mensal/lancamentos/${item.id}/estornar`, {
        method: "POST",
        empresaId: empresaAtualId,
      });
      toast.success("Lançamento estornado");
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível estornar");
    }
  };

  const exportarCsv = () => {
    if (!exibido) return;
    const linhas: Array<[string, string]> = [
      ["Situação do relatório", arquivoAberto ? "Arquivado em " + arquivoAberto.criadoEm : "Prévia dinâmica"],
      ["Fechamento", mes],
      ["Empresa", empresaAtual?.nome || ""],
      ["Empreendimento", empreendimento === "todos" ? "Todos" : nomeEmpreendimento(Number(empreendimento))],
      ["Glebas com venda ativa", String(exibido.totalGlebas)],
      ["Glebas adimplentes", String(exibido.glebasAdimplentes)],
      ["Glebas inadimplentes", String(exibido.glebasInadimplentes)],
      ["Unidades que pagaram no mês", String(exibido.glebasComPagamentoMes)],
      ["Valor recebido de parcelas", exibido.recebidoParcelas.toFixed(2)],
      ["Outras receitas", exibido.outrasReceitas.toFixed(2)],
      ["Valor total recebido", exibido.valorTotalRecebido.toFixed(2)],
      ["Custo com empreendimento", exibido.custoEmpreendimento.toFixed(2)],
      ["Valor destinado ao sócio", exibido.valorSocio.toFixed(2)],
      ["Valor destinado ao empreendedor", exibido.valorEmpreendedor.toFixed(2)],
      ["Imposto reservado", exibido.impostoReservado.toFixed(2)],
      ["Imposto efetivamente pago", exibido.impostoPago.toFixed(2)],
      ["Comissões atribuídas", exibido.comissaoRegistrada.toFixed(2)],
      ["Comissões efetivamente pagas", exibido.comissaoEfetivamentePaga.toFixed(2)],
      ["Repasses efetivos ao sócio", exibido.socioEfetivamentePago.toFixed(2)],
      ["Repasses efetivos ao empreendedor", exibido.empreendedorEfetivamentePago.toFixed(2)],
      ["Valor devolvido em distrato", exibido.valorDevolvidoDistrato.toFixed(2)],
      ["Valor retido", exibido.valorRetido.toFixed(2)],
      ["Disponível estimado após saídas/reservas", exibido.saldoDisponivelEstimado.toFixed(2)],
    ];
    const escapar = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + linhas.map(([a, b]) => `${escapar(a)};${escapar(b)}`).join("\r\n") +
      "\r\n\r\n" + ["Data", "Empreendimento", "Tipo", "Motivo", "Valor", "Situação"].join(";") +
      "\r\n" + exibido.lancamentos.map((l) =>
        [l.data, nomeEmpreendimento(l.empreendimentoId), tipos[l.tipo], l.descricao,
          Number(l.valor).toFixed(2), l.estornado ? "Estornado" : "Ativo"]
          .map(escapar).join(";")
      ).join("\r\n");
    const detalhes = "\r\n\r\n" +
      ["Unidade", "Comprador", "Pagou no mês", "Situação no encerramento", "Recebido no mês", "Saldo vencido", "Último pagamento no mês"]
        .map(escapar).join(";") + "\r\n" +
      exibido.unidades.map((u) =>
        [u.unidade, u.comprador, u.pagouNoMes ? "Sim" : "Não",
          u.inadimplenteNoFim ? "Inadimplente" : "Adimplente",
          Number(u.recebidoNoMes).toFixed(2), Number(u.saldoVencido).toFixed(2),
          u.ultimoPagamentoMes || ""].map(escapar).join(";")
      ).join("\r\n");
    const blob = new Blob([csv + detalhes], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fechamento-imobcontrol-${mes}-${empreendimento}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell>
      <div className="print:hidden space-y-5">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Gestão financeira / Prestação de contas
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Fechamento mensal
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Consulte o movimento do mês, confira as unidades e guarde o fechamento para o histórico.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando}>
              <RefreshCw className={"mr-2 h-4 w-4 " + (carregando ? "animate-spin" : "")} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" disabled={!exibido} onClick={exportarCsv}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button size="sm" disabled={!exibido} onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
            </Button>
          </div>
        </header>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <Label htmlFor="fechamento-mes" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Mês de referência
              </Label>
              <Input
                id="fechamento-mes"
                type="month"
                value={mes}
                className="h-11 w-full"
                onChange={(e) => {
                  if (!e.target.value) return;
                  setMes(e.target.value);
                  setArquivoAberto(null);
                  setFormAberto(false);
                }}
              />
            </div>
            <div className="min-w-0">
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Empreendimento
              </Label>
              <Select
                value={empreendimento}
                onValueChange={(value) => {
                  setEmpreendimento(value);
                  setArquivoAberto(null);
                  setFormAberto(false);
                }}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Selecione um empreendimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os empreendimentos</SelectItem>
                  {empreendimentos.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>{item.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            {arquivoAberto ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <Archive className="h-3.5 w-3.5" /> Arquivado #{arquivoAberto.id}
                · {new Date(arquivoAberto.criadoEm).toLocaleDateString("pt-BR")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Prévia dinâmica do período
              </span>
            )}
            {arquivoAberto && (
              <button
                type="button"
                className="font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => setArquivoAberto(null)}
              >
                Voltar à prévia atual
              </button>
            )}
            <span className="sm:ml-auto">
              {empreendimento === "todos" ? "Visão consolidada" : "Visão individual por empreendimento"}
            </span>
          </div>
        </div>

        {erro && (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {erro}
          </div>
        )}
        {carregando && (
          <p className="text-sm text-muted-foreground">Atualizando dados do período...</p>
        )}

        {exibido && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="min-w-0 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-card p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Wallet className="h-4 w-4 text-primary" /> Total recebido no mês
              </div>
              <p className="mt-4 break-words text-3xl font-semibold tracking-tight tabular-nums text-foreground sm:text-4xl">
                {brlSeguro(exibido.valorTotalRecebido)}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Parcelas recebidas e outras entradas efetivas
              </p>
            </div>
            <div className="min-w-0 rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Em dia no encerramento
              </div>
              <p className="mt-4 text-4xl font-semibold tabular-nums">{exibido.glebasAdimplentes}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                De {exibido.totalGlebas} unidades com contrato
              </p>
            </div>
            <div className="min-w-0 rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Inadimplentes
              </div>
              <p className="mt-4 text-4xl font-semibold tabular-nums">{exibido.glebasInadimplentes}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                {exibido.glebasComPagamentoMes} unidades realizaram pagamento no mês
              </p>
            </div>
          </div>
        )}

        <Tabs value={aba} onValueChange={setAba} className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-border/60 bg-muted/50 p-1.5 sm:grid-cols-4">
            <TabsTrigger value="resumo" className="min-h-10 px-2 text-xs sm:text-sm">Visão geral</TabsTrigger>
            <TabsTrigger value="unidades" className="min-h-10 px-2 text-xs sm:text-sm">Unidades</TabsTrigger>
            <TabsTrigger value="lancamentos" className="min-h-10 px-2 text-xs sm:text-sm">Lançamentos</TabsTrigger>
            <TabsTrigger value="arquivos" className="min-h-10 px-2 text-xs sm:text-sm">Arquivados</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="mt-0 space-y-4">
            {exibido ? (
              <>
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card className="min-w-0 overflow-hidden rounded-2xl border-border/70">
                    <CardHeader className="border-b border-border/60 pb-4">
                      <CardTitle className="text-base">Movimentação do mês</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        O que entrou e o que foi efetivamente pago ou reservado.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-5 text-sm">
                      <Linha titulo="Recebimento de parcelas" valor={exibido.recebidoParcelas} />
                      <Linha titulo="Outras entradas" valor={exibido.outrasReceitas} />
                      <div className="border-y border-border/60 py-3">
                        <Linha titulo="Total arrecadado" valor={exibido.valorTotalRecebido} forte />
                      </div>
                      <Linha titulo="Custos do empreendimento" valor={-exibido.custoEmpreendimento} />
                      <Linha titulo="Impostos pagos" valor={-exibido.impostoPago} />
                      <Linha titulo="Comissões pagas" valor={-exibido.comissaoEfetivamentePaga} />
                      <Linha titulo="Repasses pagos ao sócio" valor={-exibido.socioEfetivamentePago} />
                      <Linha titulo="Repasses pagos à empresa" valor={-exibido.empreendedorEfetivamentePago} />
                      <Linha titulo="Distratos devolvidos" valor={-exibido.valorDevolvidoDistrato} />
                      <Linha titulo="Retenções / reservas" valor={-exibido.valorRetido} />
                      <div className="mt-4 rounded-xl border border-primary/15 bg-primary/5 p-4">
                        <p className="text-xs font-medium text-muted-foreground">Disponível estimado</p>
                        <p className="mt-1 break-words text-2xl font-semibold tabular-nums">
                          {brlSeguro(exibido.saldoDisponivelEstimado)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Não equivale ao saldo bancário.</p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid content-start gap-4">
                    <Card className="min-w-0 rounded-2xl border-border/70">
                      <CardHeader className="border-b border-border/60 pb-4">
                        <CardTitle className="text-base">Destinação do dinheiro</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Valor atribuído é diferente de transferência efetuada.
                        </p>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 gap-y-4 text-sm">
                          <span></span>
                          <span className="text-right text-xs font-medium text-muted-foreground">Atribuído</span>
                          <span className="text-right text-xs font-medium text-muted-foreground">Pago</span>
                          {([
                            ["Corretor", exibido.comissaoRegistrada, exibido.comissaoEfetivamentePaga],
                            ["Sócio", exibido.valorSocio, exibido.socioEfetivamentePago],
                            ["Empreendedor", exibido.valorEmpreendedor, exibido.empreendedorEfetivamentePago],
                          ] as Array<[string, number, number]>).map(([nome, atribuido, pago]) => (
                            <div key={nome} className="contents">
                              <span className="min-w-0 self-center font-medium">{nome}</span>
                              <span className="self-center text-right text-xs tabular-nums sm:text-sm">{brlSeguro(atribuido)}</span>
                              <span className="self-center text-right text-xs font-semibold tabular-nums sm:text-sm">{brlSeguro(pago)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="min-w-0 rounded-2xl border-border/70">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Tributos e retenções</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <Linha titulo="Imposto reservado" valor={exibido.impostoReservado} />
                        <Linha titulo="Imposto efetivamente pago" valor={exibido.impostoPago} />
                        <div className="border-t border-border/60 pt-3">
                          <Linha titulo="Outros valores retidos" valor={exibido.valorRetido} />
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Imposto reservado não é pagamento efetuado. Valores atribuídos não são descontados duas vezes.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAba("unidades")}
                  className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-muted/40"
                >
                  <span>Ver a lista de compradores e a situação de cada unidade</span>
                  <span className="font-medium text-primary">Ver unidades</span>
                </button>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Selecione o mês e o empreendimento para visualizar o resumo.
              </div>
            )}
          </TabsContent>

          <TabsContent value="unidades" className="mt-0 space-y-4">
            <Card className="min-w-0 overflow-hidden rounded-2xl border-border/70">
              <CardHeader className="space-y-4 border-b border-border/60">
                <div>
                  <CardTitle className="text-base">Situação das unidades</CardTitle>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Pagou no mês e estar em dia no fechamento são informações diferentes.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
                  <div className="relative min-w-0">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      aria-label="Buscar unidade ou comprador"
                      value={buscaUnidade}
                      onChange={(e) => setBuscaUnidade(e.target.value)}
                      placeholder="Buscar unidade ou comprador"
                      className="h-10 pl-9"
                    />
                  </div>
                  <Select value={filtroUnidade} onValueChange={setFiltroUnidade}>
                    <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as unidades</SelectItem>
                      <SelectItem value="pagaram">Pagaram no mês</SelectItem>
                      <SelectItem value="adimplentes">Em dia</SelectItem>
                      <SelectItem value="inadimplentes">Inadimplentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  {unidadesFiltradas.length} de {exibido?.unidades.length ?? 0} unidades
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {unidadesFiltradas.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma unidade encontrada.</div>
                )}
                <div className="divide-y divide-border/60 md:hidden">
                  {unidadesFiltradas.map((unidade) => (
                    <div key={unidade.unidadeId} className="space-y-3 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold">{unidade.unidade}</p>
                          <p className="mt-1 break-words text-sm text-muted-foreground">{unidade.comprador}</p>
                        </div>
                        <span className={"rounded-md px-2 py-1 text-xs font-medium " +
                          (unidade.inadimplenteNoFim
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300")}>
                          {unidade.inadimplenteNoFim ? "Inadimplente" : "Em dia"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-muted-foreground">Recebido no mês</p>
                          <p className="mt-1 font-semibold tabular-nums">{brlSeguro(unidade.recebidoNoMes)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-muted-foreground">Saldo vencido</p>
                          <p className="mt-1 font-semibold tabular-nums">{brlSeguro(unidade.saldoVencido)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {unidade.pagouNoMes ? "Pagamento registrado neste mês" : "Sem pagamento neste mês"}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Comprador</TableHead>
                        <TableHead>Pagou no mês</TableHead>
                        <TableHead>Situação final</TableHead>
                        <TableHead className="text-right">Recebido</TableHead>
                        <TableHead className="text-right">Vencido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unidadesFiltradas.map((unidade) => (
                        <TableRow key={unidade.unidadeId}>
                          <TableCell className="font-medium">{unidade.unidade}</TableCell>
                          <TableCell className="max-w-[220px] truncate">{unidade.comprador}</TableCell>
                          <TableCell>{unidade.pagouNoMes ? "Sim" : "Não"}</TableCell>
                          <TableCell className={unidade.inadimplenteNoFim ? "text-amber-700 dark:text-amber-300" : ""}>
                            {unidade.inadimplenteNoFim ? "Inadimplente" : "Em dia"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{brlSeguro(unidade.recebidoNoMes)}</TableCell>
                          <TableCell className="text-right tabular-nums">{brlSeguro(unidade.saldoVencido)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lancamentos" className="mt-0 space-y-4">
            <Card className="min-w-0 rounded-2xl border-border/70">
              <CardHeader className="flex flex-col gap-3 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Despesas e movimentações</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pagamentos, retenções, distratos e outras entradas lançadas manualmente.
                  </p>
                </div>
                {podeLancar && (
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={abrirLancamento}
                    disabled={empreendimento === "todos" || !empresaAtualId || !!arquivoAberto}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Novo lançamento
                  </Button>
                )}
              </CardHeader>
              {empreendimento === "todos" && podeLancar && (
                <p className="px-5 pt-4 text-xs text-muted-foreground">
                  Selecione um empreendimento específico para registrar despesas ou repasses.
                </p>
              )}
              {formAberto && podeLancar && !arquivoAberto && (
                <CardContent className="space-y-4 border-b border-border/60 bg-muted/20 pt-5">
                  <p className="text-sm font-medium">Novo lançamento para {nomeEmpreendimento(Number(empreendimento))}</p>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="min-w-0 sm:col-span-2 xl:col-span-1">
                      <Label>Tipo de movimentação</Label>
                      <Select value={tipo} onValueChange={(value) => setTipo(value as TipoLancamento)}>
                        <SelectTrigger className="mt-1 h-10 w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.entries(tipos) as Array<[TipoLancamento, string]>).map(([chave, titulo]) => (
                            <SelectItem key={chave} value={chave}>{titulo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Data efetiva</Label>
                      <Input className="mt-1 h-10" type="date" value={data} onChange={(e) => setData(e.target.value)} />
                    </div>
                    <div>
                      <Label>Valor (R$)</Label>
                      <CurrencyInput className="mt-1" value={valor} onValueChange={setValor} />
                    </div>
                  </div>
                  <div>
                    <Label>Descrição / comprovante</Label>
                    <Input
                      className="mt-1"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      maxLength={240}
                      placeholder="Ex.: pagamento de ISS, nota fiscal 123"
                    />
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" onClick={() => setFormAberto(false)} disabled={salvando}>Cancelar</Button>
                    <Button onClick={() => void cadastrar()} disabled={salvando}>
                      {salvando ? "Registrando..." : "Registrar lançamento"}
                    </Button>
                  </div>
                </CardContent>
              )}
              <CardContent className="p-0">
                {!exibido || exibido.lancamentos.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Nenhuma movimentação adicional registrada neste mês.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {exibido.lancamentos.map((item) => (
                      <div key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <div className="min-w-0">
                          <p className={"text-sm font-medium " + (item.estornado ? "line-through text-muted-foreground" : "")}>
                            {tipos[item.tipo] ?? item.tipo}
                          </p>
                          <p className="mt-1 break-words text-xs text-muted-foreground">
                            {formatDate(item.data)} · {nomeEmpreendimento(item.empreendimentoId)} · {item.descricao}
                          </p>
                          {item.estornado && <p className="mt-1 text-xs text-amber-700">Lançamento estornado</p>}
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <span className="text-sm font-semibold tabular-nums">{brlSeguro(item.valor)}</span>
                          {!item.estornado && podeEstornar && !arquivoAberto && (
                            <Button variant="ghost" size="sm" onClick={() => void estornar(item)}>
                              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Estornar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="arquivos" className="mt-0 space-y-4">
            <Card className="min-w-0 rounded-2xl border-border/70">
              <CardHeader className="flex flex-col gap-3 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Fechamentos arquivados</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Fotografias permanentes dos meses já encerrados.
                  </p>
                </div>
                {podeArquivar && mesEncerrado && !arquivadoNesteMes && !arquivoAberto && (
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => void arquivar()}
                    disabled={!fechamento || empreendimento === "todos" || arquivando}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    {arquivando ? "Arquivando..." : "Arquivar este mês"}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                {arquivos.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-8 text-center">
                    <FileText className="h-7 w-7 text-muted-foreground" />
                    <p className="text-sm font-medium">Ainda não há fechamentos arquivados</p>
                    <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                      Depois de conferir um mês encerrado, um gestor pode arquivar a prestação de contas para consultas futuras.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {arquivos.map((item) => (
                      <div key={item.id} className="flex min-w-0 flex-col justify-between gap-4 rounded-xl border border-border/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            <Archive className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-semibold">{item.mes}</p>
                            <p className="mt-1 break-words text-sm">{nomeEmpreendimento(item.empreendimentoId)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Arquivo #{item.id} · {new Date(item.criadoEm).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMes(item.mes);
                            setEmpreendimento(String(item.empreendimentoId));
                            setFormAberto(false);
                            setArquivoAberto(item);
                            setAba("resumo");
                          }}
                        >
                          Abrir fechamento
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {podeArquivar && empreendimento === "todos" && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Para arquivar um mês, selecione um empreendimento individual.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <details className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium text-foreground">
            Como este fechamento é calculado?
          </summary>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Pagamento no mês significa entrada registrada no período. Adimplência significa não ter
            saldo vencido no último dia. Valores atribuídos a sócios, empresa e corretor não são
            necessariamente transferências pagas. A prévia é dinâmica e pode mudar com correções
            retroativas; o fechamento arquivado preserva a apuração na data do registro.
          </p>
        </details>
      </div>
      {exibido && (
        <section className="hidden print:block bg-white p-2 text-black">
          <header className="mb-5 border-b-2 border-black pb-3">
            <p className="text-sm font-bold tracking-wide">IMOBCONTROL | FECHAMENTO MENSAL</p>
            <h1 className="mt-1 text-2xl font-bold">{nomeEmpreendimento(Number(empreendimento))}</h1>
            <p className="text-sm">Empresa: {empresaAtual?.nome || "-"} | Referência: {mes}</p>
            <p className="mt-1 text-xs">
              {arquivoAberto
                ? `Arquivo #${arquivoAberto.id} · Emitido em ${new Date(arquivoAberto.criadoEm).toLocaleString("pt-BR")} · versão arquivada`
                : "PRÉVIA DINÂMICA — NÃO ARQUIVADA"}
            </p>
          </header>
          <h2 className="mb-2 text-lg font-bold">Situação das unidades</h2>
          <table className="mb-5 w-full border-collapse text-sm">
            <tbody>
              <tr><td>Total com contrato</td><td className="text-right">{exibido.totalGlebas}</td></tr>
              <tr><td>Unidades que pagaram no mês</td><td className="text-right">{exibido.glebasComPagamentoMes}</td></tr>
              <tr><td>Adimplentes no último dia</td><td className="text-right">{exibido.glebasAdimplentes}</td></tr>
              <tr><td>Inadimplentes no último dia</td><td className="text-right">{exibido.glebasInadimplentes}</td></tr>
            </tbody>
          </table>
          <h2 className="mb-2 text-lg font-bold">Resumo financeiro</h2>
          <table className="mb-5 w-full border-collapse text-sm">
            <tbody>
              {([
                ["Recebido em parcelas", exibido.recebidoParcelas],
                ["Outras entradas", exibido.outrasReceitas],
                ["Total recebido", exibido.valorTotalRecebido],
                ["Comissão atribuída", exibido.comissaoRegistrada],
                ["Comissão efetivamente paga", exibido.comissaoEfetivamentePaga],
                ["Imposto reservado", exibido.impostoReservado],
                ["Imposto efetivamente pago", exibido.impostoPago],
                ["Custos de empreendimento", exibido.custoEmpreendimento],
                ["Devoluções em distrato", exibido.valorDevolvidoDistrato],
                ["Retenções e reservas", exibido.valorRetido],
                ["Destinado ao sócio", exibido.valorSocio],
                ["Efetivamente pago ao sócio", exibido.socioEfetivamentePago],
                ["Destinado ao empreendedor", exibido.valorEmpreendedor],
                ["Efetivamente pago ao empreendedor", exibido.empreendedorEfetivamentePago],
                ["Saldo disponível estimado", exibido.saldoDisponivelEstimado],
              ] as Array<[string, number]>).map(([nome, quantia]) =>
                <tr key={nome} className="border-b border-neutral-200">
                  <td className="py-1">{nome}</td>
                  <td className="py-1 text-right tabular-nums">{brlSeguro(quantia)}</td>
                </tr>
              )}
            </tbody>
          </table>
          <h2 className="mb-2 text-lg font-bold">Relação de unidades</h2>
          <table className="mb-5 w-full border-collapse text-xs">
            <thead><tr className="border-b border-black text-left">
              <th className="py-1">Unidade</th><th>Comprador</th>
              <th>Pagou no mês</th><th>Fim do mês</th>
              <th className="text-right">Recebido</th><th className="text-right">Vencido</th>
            </tr></thead>
            <tbody>{exibido.unidades.map((u) =>
              <tr key={u.unidadeId} className="border-b border-neutral-200">
                <td className="py-1">{u.unidade}</td><td>{u.comprador}</td>
                <td>{u.pagouNoMes ? "Sim" : "Não"}</td>
                <td>{u.inadimplenteNoFim ? "Inadimplente" : "Adimplente"}</td>
                <td className="text-right">{brlSeguro(u.recebidoNoMes)}</td>
                <td className="text-right">{brlSeguro(u.saldoVencido)}</td>
              </tr>
            )}</tbody>
          </table>
          <h2 className="mb-2 text-lg font-bold">Despesas e outros lançamentos</h2>
          <table className="w-full border-collapse text-xs">
            <thead><tr className="border-b border-black text-left">
              <th>Data</th><th>Descrição</th><th>Tipo</th>
              <th className="text-right">Valor</th>
            </tr></thead>
            <tbody>{exibido.lancamentos.map((l) =>
              <tr key={l.id} className="border-b border-neutral-200">
                <td>{formatDate(l.data)}</td>
                <td>{l.descricao}{l.estornado ? " (estornado)" : ""}</td>
                <td>{tipos[l.tipo] || l.tipo}</td>
                <td className="text-right">{brlSeguro(l.valor)}</td>
              </tr>
            )}</tbody>
          </table>
          <footer className="mt-5 border-t border-neutral-400 pt-2 text-xs">
            Critério: valores recebidos por data efetiva; distribuídos ≠ pagos.
            Posição histórica de adimplência reconstruída conforme dados disponíveis.
            Arquivos mensais preservam a fotografia da apuração no momento do arquivamento.
          </footer>
        </section>
      )}
    </PageShell>
  );
}

function Linha({ titulo, valor, forte = false }: { titulo: string; valor: number; forte?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 ${forte ? "font-semibold" : ""}`}>
    <span>{titulo}</span><span className="tabular-nums">{brlSeguro(valor)}</span>
  </div>;
}
