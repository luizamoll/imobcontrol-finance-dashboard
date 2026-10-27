import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, CalendarDays, Download, Plus, Printer, RotateCcw, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { CurrencyInput } from "@/components/currency-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <PageHeader
        eyebrow="Tesouraria e relatórios"
        title="Fechamento mensal"
        description="Apuração por competência de referência para a carteira e por data efetiva para os recebimentos e lançamentos. Consulte um mês e um empreendimento."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando}>
              <RefreshCw className={`mr-2 h-4 w-4 ${carregando ? "animate-spin" : ""}`} /> Atualizar
            </Button>
            <Button variant="outline" size="sm" disabled={!fechamento} onClick={exportarCsv}>
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
            {podeLancar && (
              <Button size="sm" onClick={abrirLancamento} disabled={empreendimento === "todos" || !empresaAtualId}>
                <Plus className="mr-2 h-4 w-4" /> Novo lançamento
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Mês de referência</Label>
          <Input
            type="month"
            className="mt-1"
            value={mes}
            onChange={(e) => { if (e.target.value) setMes(e.target.value); }}
          />
        </div>
        <div>
          <Label>Empreendimento</Label>
          <Select value={empreendimento} onValueChange={setEmpreendimento}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os empreendimentos</SelectItem>
              {empreendimentos.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Critérios:</strong> adimplência conta somente unidades do tipo
        Gleba/Gleba rural com venda atualmente ativa e com contrato até o fim do mês.
        Uma gleba fica inadimplente quando há parcela vencida ainda não quitada até aquela data.
        O histórico é reconstruído com os dados atuais: cancelamentos, acordos, reajustes e
        estornos posteriores podem mudar o resultado de meses anteriores. Não é um fechamento contábil congelado.
      </div>

      {erro && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">{erro}</div>}
      {carregando && <p className="text-sm text-muted-foreground">Calculando indicadores...</p>}
      {exibido && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Indicador titulo="Unidades adimplentes" valor={String(exibido.glebasAdimplentes)} subtitulo={`de ${exibido.totalGlebas} unidades com contrato`} />
            <Indicador titulo="Unidades inadimplentes" valor={String(exibido.glebasInadimplentes)} subtitulo="Com pendências até o fim do mês" />
            <Indicador titulo="Unidades que pagaram no mês" valor={String(exibido.glebasComPagamentoMes)} subtitulo="Independente da situação no último dia" />
            <Indicador titulo="Total recebido no mês" valor={brlSeguro(exibido.valorTotalRecebido)} subtitulo="Parcelas + outras entradas efetivas" destaque />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Indicador titulo="Recebido em parcelas" valor={brlSeguro(exibido.recebidoParcelas)} />
            <Indicador titulo="Outras entradas" valor={brlSeguro(exibido.outrasReceitas)} />
            <Indicador titulo="Custo com empreendimento" valor={brlSeguro(exibido.custoEmpreendimento)} />
            <Indicador titulo="Valor destinado ao sócio" valor={brlSeguro(exibido.valorSocio)} subtitulo="Distribuição registrada, não comprova transferência" />
            <Indicador titulo="Valor destinado ao empreendedor" valor={brlSeguro(exibido.valorEmpreendedor)} subtitulo="Distribuição registrada, não comprova transferência" />
            <Indicador titulo="Imposto reservado" valor={brlSeguro(exibido.impostoReservado)} subtitulo="Previsto nos recebimentos" />
            <Indicador titulo="Imposto efetivamente pago" valor={brlSeguro(exibido.impostoPago)} subtitulo="Com base nos lançamentos de pagamento" />
            <Indicador titulo="Comissão atribuída" valor={brlSeguro(exibido.comissaoRegistrada)} subtitulo="Separada dos pagamentos bancários" />
            <Indicador titulo="Comissão efetivamente paga" valor={brlSeguro(exibido.comissaoEfetivamentePaga)} />
            <Indicador titulo="Repasse pago ao sócio" valor={brlSeguro(exibido.socioEfetivamentePago)} />
            <Indicador titulo="Repasse pago ao empreendedor" valor={brlSeguro(exibido.empreendedorEfetivamentePago)} />
            <Indicador titulo="Devolvido em distrato" valor={brlSeguro(exibido.valorDevolvidoDistrato)} />
            <Indicador titulo="Valores retidos" valor={brlSeguro(exibido.valorRetido)} subtitulo="Reservas não disponíveis para distribuição" />
            <Indicador titulo="Saldo disponível estimado" valor={brlSeguro(exibido.saldoDisponivelEstimado)} subtitulo="Entradas menos custos, impostos pagos, devoluções e retenções. Não representa saldo bancário." destaque />
          </div>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4" /> Reconciliação do mês</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Linha titulo="Recebimentos de parcelas" valor={exibido.recebidoParcelas} />
              <Linha titulo="(+) Outras entradas" valor={exibido.outrasReceitas} />
              <Linha titulo="(=) Valor total recebido" valor={exibido.valorTotalRecebido} forte />
              <Linha titulo="(-) Custos do empreendimento" valor={exibido.custoEmpreendimento} />
              <Linha titulo="(-) Impostos efetivamente pagos" valor={exibido.impostoPago} />
              <Linha titulo="(-) Devoluções em distrato" valor={exibido.valorDevolvidoDistrato} />
              <Linha titulo="(-) Reservas e retenções" valor={exibido.valorRetido} />
              <Linha titulo="(-) Comissões efetivamente pagas" valor={exibido.comissaoEfetivamentePaga} />
              <Linha titulo="(-) Repasse efetivo ao sócio" valor={exibido.socioEfetivamentePago} />
              <Linha titulo="(-) Repasse efetivo ao empreendedor" valor={exibido.empreendedorEfetivamentePago} />
              <div className="border-t pt-3"><Linha titulo="Disponível estimado" valor={exibido.saldoDisponivelEstimado} forte /></div>
              <p className="text-xs text-muted-foreground">
                A distribuição atribuída a sócios, empreendedor e corretor não representa
                pagamento bancário. Somente lançamentos explícitos de pagamentos efetivos
                entram como saída; não registre uma saída duas vezes. Retenções são reservas.
              </p>
            </CardContent>
          </Card>

          {formAberto && podeLancar && !arquivoAberto && (
            <Card className="border-primary/30">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4" /> Lançamento do mês</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Este lançamento será associado a <strong>{nomeEmpreendimento(Number(empreendimento))}</strong>.
                  Não é uma baixa de parcela e não altera vendas existentes.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={tipo} onValueChange={(v) => setTipo(v as TipoLancamento)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.entries(tipos) as Array<[TipoLancamento, string]>).map(([chave, nome]) => (
                          <SelectItem key={chave} value={chave}>{nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data efetiva</Label>
                    <Input className="mt-1" type="date" value={data} onChange={(e) => setData(e.target.value)} />
                  </div>
                  <div>
                    <Label>Valor (R$)</Label>
                    <CurrencyInput className="mt-1" value={valor} onValueChange={setValor} />
                  </div>
                </div>
                <div>
                  <Label>Motivo / referência</Label>
                  <Input className="mt-1" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={240} placeholder="Ex.: pagamento de ISS, nota fiscal 123" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setFormAberto(false)} disabled={salvando}>Cancelar</Button>
                  <Button onClick={() => void cadastrar()} disabled={salvando}>{salvando ? "Registrando..." : "Registrar lançamento"}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Lançamentos adicionais e históricos de estorno</CardTitle>
              <p className="text-xs text-muted-foreground">
                Despesas, devoluções, impostos pagos, retenções e outras receitas. Recebimentos de parcelas vêm automaticamente do sistema.
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Data</TableHead><TableHead>Empreendimento</TableHead>
                  <TableHead>Tipo e motivo</TableHead><TableHead className="text-right">Valor</TableHead>
                  <TableHead>Situação</TableHead><TableHead className="text-right">Ações</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {exibido.lancamentos.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Ainda não há lançamentos adicionais neste mês.</TableCell></TableRow>}
                  {exibido.lancamentos.map((l) => <TableRow key={l.id}>
                    <TableCell>{formatDate(l.data)}</TableCell>
                    <TableCell>{nomeEmpreendimento(l.empreendimentoId)}</TableCell>
                    <TableCell><div className="font-medium">{tipos[l.tipo] ?? l.tipo}</div><div className="text-xs text-muted-foreground">{l.descricao}</div></TableCell>
                    <TableCell className="text-right tabular-nums">{brlSeguro(l.valor)}</TableCell>
                    <TableCell>{l.estornado ? "Estornado" : "Ativo"}</TableCell>
                    <TableCell className="text-right">
                      {!l.estornado && podeEstornar && <Button variant="ghost" size="sm" onClick={() => void estornar(l)}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Estornar
                      </Button>}
                    </TableCell>
                  </TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  );
}

function Indicador({ titulo, valor, subtitulo, destaque = false }: {
  titulo: string; valor: string; subtitulo?: string; destaque?: boolean;
}) {
  return (
    <Card className={destaque ? "border-primary/30 bg-primary/5" : "border-border/70"}>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titulo}</p>
        <p className="mt-2 text-xl font-semibold tabular-nums">{valor}</p>
        {subtitulo && <p className="mt-1 text-xs text-muted-foreground">{subtitulo}</p>}
      </CardContent>
    </Card>
  );
}

function Linha({ titulo, valor, forte = false }: { titulo: string; valor: number; forte?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 ${forte ? "font-semibold" : ""}`}>
    <span>{titulo}</span><span className="tabular-nums">{brlSeguro(valor)}</span>
  </div>;
}
