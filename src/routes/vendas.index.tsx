import { createFileRoute, Link } from "@tanstack/react-router";
import { Calculator, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { apiJson } from "@/lib/api";
import { composicaoEconomica } from "@/lib/composicao-economica";
import { useAuth } from "@/lib/auth";
import { temPermissao } from "@/lib/permissoes";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/currency-input";
import { RegrasInadimplenciaForm } from "@/components/regras-inadimplencia-form";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { VendaStatusBadge } from "@/components/status-badges";
import {
  regrasEfetivasUnidade,
  useStore,
  vendaTotais,
  type PagamentoItem,
  type PagamentoTipo,
  type RegrasInadimplencia,
} from "@/lib/store";
import { addMonths, brl, formatDate, todayISO, uid } from "@/lib/format";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/vendas/")({
  component: VendasPage,
});

function VendasPage() {
  const { state } = useStore();
  const { usuario } = useAuth();
  const podeCriarVenda = temPermissao(usuario, "VENDAS_CRIAR");
  const [open, setOpen] = useState(false);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Comercial"
        title="Vendas"
        description="Registre o valor negociado, a composição real do pagamento e as regras aplicáveis ao contrato."
        actions={
          podeCriarVenda ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Nova venda
                </Button>
              </DialogTrigger>
              <NewVendaDialog onClose={() => setOpen(false)} />
            </Dialog>
          ) : null
        }
      />

      <Card className="border-border/70">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead>Empreendimento</TableHead>
                <TableHead>Corretor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor total</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
                <TableHead className="text-right">Saldo financeiro</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.vendas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma venda registrada.
                  </TableCell>
                </TableRow>
              )}
              {state.vendas.map((v) => {
                const emp = state.empreendimentos.find((e) => e.id === v.empreendimentoId);
                const mat = state.matriculas.find((m) => m.id === v.matriculaId);
                const t = vendaTotais(v, state.parcelas);
                return (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Link
                        to="/vendas/$id"
                        params={{ id: v.id }}
                        className="flex items-center gap-2 hover:text-primary"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <ShoppingCart className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{mat?.numero || "—"}</div>
                          <div className="text-xs text-muted-foreground">{mat?.unidade}</div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{v.compradorNome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {emp ? (
                        <Link
                          to="/empreendimentos/$id"
                          params={{ id: emp.id }}
                          className="hover:text-primary"
                        >
                          {emp.nome}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{v.corretorNome || "—"}</TableCell>
                    <TableCell className="text-sm">{formatDate(v.dataContrato)}</TableCell>
                    <TableCell className="text-right font-medium">{brl(v.valorTotal)}</TableCell>
                    <TableCell className="text-right text-success">{brl(t.recebido)}</TableCell>
                    <TableCell className="text-right">{brl(t.saldo)}</TableCell>
                    <TableCell><VendaStatusBadge status={v.status} /></TableCell>
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

function emptyItem(tipo: PagamentoTipo, dataContrato: string): PagamentoItem {
  const parcelado = tipo === "parcelas" || tipo === "sinal_parcelado";
  const personalizada = tipo === "parcela_personalizada";
  return {
    id: uid(),
    tipo,
    descricao: "",
    valor: 0,
    parcelas: 1,
    primeiroVencimento: parcelado || personalizada ? addMonths(dataContrato, 1) : dataContrato,
    status: "pendente",
  };
}

function itemParcelado(tipo: PagamentoTipo) {
  return tipo === "parcelas" || tipo === "sinal_parcelado";
}

function descricaoPlaceholder(tipo: PagamentoTipo) {
  switch (tipo) {
    case "avista":
      return "Ex.: pagamento integral na assinatura";
    case "sinal":
      return "Ex.: entrada na assinatura";
    case "sinal_parcelado":
      return "Ex.: entrada parcelada";
    case "parcelas":
      return "Ex.: parcelas mensais";
    case "parcela_personalizada":
      return "Ex.: reforço, balão ou parcela especial";
    case "bem":
      return "Ex.: veículo dado como parte do pagamento";
    default:
      return "Descreva esta parte do pagamento";
  }
}

type ClienteVenda = {
  id: number;
  nome: string;
  cpf: string | null;
  email?: string | null;
  telefone?: string | null;
};

type PaginaClientes = {
  content: ClienteVenda[];
};

function NewVendaDialog({ onClose }: { onClose: () => void }) {
  const { state, addVenda } = useStore();
  const { empresaAtualId } = useTenant();
  const [empId, setEmpId] = useState("");
  const [matId, setMatId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [clientes, setClientes] = useState<ClienteVenda[]>([]);
  const [carregandoClientes, setCarregandoClientes] = useState(false);
  const [novoClienteAberto, setNovoClienteAberto] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState("");
  const [novoClienteCpf, setNovoClienteCpf] = useState("");
  const [novoClienteEmail, setNovoClienteEmail] = useState("");
  const [novoClienteTelefone, setNovoClienteTelefone] = useState("");
  const [cadastroCompletoAberto, setCadastroCompletoAberto] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [dadosAdicionaisCliente, setDadosAdicionaisCliente] = useState({
    estadoCivil: "", profissao: "", cep: "", logradouro: "", numero: "",
    complemento: "", bairro: "", cidade: "", uf: "",
  });
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [valorNegociado, setValorNegociado] = useState(0);
  const [corretagemCompoeTotal, setCorretagemCompoeTotal] = useState<"sim" | "nao">("sim");
  const [corretagemForma, setCorretagemForma] = useState<
    "repasse_recebimentos" | "direto_corretor" | "separada" | "outro"
  >("repasse_recebimentos");
  const [dataContrato, setDataContrato] = useState(todayISO());
  const [corretor, setCorretor] = useState("");
  const [corretorPct, setCorretorPct] = useState("0");
  const [repasseComissaoPct, setRepasseComissaoPct] = useState("50");
  const [comissaoSobreAcrescimos, setComissaoSobreAcrescimos] = useState("nao");
  const [regrasInadimplencia, setRegrasInadimplencia] =
    useState<RegrasInadimplencia | null>(null);
  const [obs, setObs] = useState("");
  const [items, setItems] = useState<PagamentoItem[]>([]);

  const { valorImovel, corretagemValor } = composicaoEconomica(
    valorNegociado, Number(corretorPct) || 0, corretagemCompoeTotal,
  );

  useEffect(() => {
    if (!empresaAtualId) {
      setClientes([]);
      return;
    }

    let cancelado = false;
    setCarregandoClientes(true);
    void apiJson<PaginaClientes>("/api/clientes?pagina=0&tamanho=100", {
      empresaId: empresaAtualId,
    })
      .then((pagina) => {
        if (!cancelado) setClientes(pagina.content);
      })
      .catch((error) => {
        if (!cancelado) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os clientes",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCarregandoClientes(false);
      });

    return () => {
      cancelado = true;
    };
  }, [empresaAtualId]);

  const buscarCepNovoCliente = async () => {
    const cep = dadosAdicionaisCliente.cep.replace(/\D/g, "").slice(0, 8);
    if (cep.length !== 8) return;
    setBuscandoCep(true);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!resposta.ok) throw new Error("Não foi possível consultar o CEP");
      const dados = await resposta.json() as {
        erro?: boolean; logradouro?: string; complemento?: string;
        bairro?: string; localidade?: string; uf?: string;
      };
      if (dados.erro) {
        toast.error("CEP não encontrado");
        return;
      }
      setDadosAdicionaisCliente((atual) => ({
        ...atual,
        cep,
        logradouro: dados.logradouro || atual.logradouro,
        complemento: dados.complemento || atual.complemento,
        bairro: dados.bairro || atual.bairro,
        cidade: dados.localidade || atual.cidade,
        uf: dados.uf || atual.uf,
      }));
      toast.success("Endereço encontrado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao consultar o CEP");
    } finally {
      setBuscandoCep(false);
    }
  };

  const cadastrarClienteRapido = async () => {
    if (!empresaAtualId) {
      toast.error("Selecione uma empresa antes de cadastrar o cliente");
      return;
    }
    if (!novoClienteNome.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }

    setSalvandoCliente(true);
    try {
      const criado = await apiJson<ClienteVenda>("/api/clientes", {
        method: "POST",
        empresaId: empresaAtualId,
        body: JSON.stringify({
          nome: novoClienteNome.trim(),
          cpf: novoClienteCpf.trim() || null,
          email: novoClienteEmail.trim() || null,
          telefone: novoClienteTelefone.trim() || null,
          cep: dadosAdicionaisCliente.cep.replace(/\D/g, "") || null,
          logradouro: dadosAdicionaisCliente.logradouro.trim() || null,
          numero: dadosAdicionaisCliente.numero.trim() || null,
          complemento: dadosAdicionaisCliente.complemento.trim() || null,
          bairro: dadosAdicionaisCliente.bairro.trim() || null,
          cidade: dadosAdicionaisCliente.cidade.trim() || null,
          uf: dadosAdicionaisCliente.uf.trim().toUpperCase() || null,
          estadoCivil: dadosAdicionaisCliente.estadoCivil.trim() || null,
          profissao: dadosAdicionaisCliente.profissao.trim() || null,
          versao: null,
        }),
      });

      setClientes((atuais) =>
        [...atuais.filter((item) => item.id !== criado.id), criado].sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR"),
        ),
      );
      setClienteId(String(criado.id));
      setNovoClienteNome("");
      setNovoClienteCpf("");
      setNovoClienteEmail("");
      setNovoClienteTelefone("");
      setDadosAdicionaisCliente({
        estadoCivil: "", profissao: "", cep: "", logradouro: "", numero: "",
        complemento: "", bairro: "", cidade: "", uf: "",
      });
      setCadastroCompletoAberto(false);
      setNovoClienteAberto(false);
      toast.success("Cliente cadastrado e selecionado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível cadastrar o cliente",
      );
    } finally {
      setSalvandoCliente(false);
    }
  };

  const clienteSelecionado = clientes.find(
    (cliente) => String(cliente.id) === clienteId,
  );

  const empreendimento = state.empreendimentos.find((e) => e.id === empId);
  const matricula = state.matriculas.find((m) => m.id === matId);
  const quadra = matricula?.quadraId
    ? state.quadras.find((q) => q.id === matricula.quadraId)
    : undefined;
  const regraSelecionada =
    empreendimento && matricula
      ? regrasEfetivasUnidade(empreendimento, matricula, quadra, state.config)
      : null;

  const matriculas = useMemo(
    () =>
      state.matriculas.filter(
        (m) => m.empreendimentoId === empId && m.status === "disponivel",
      ),
    [state.matriculas, empId],
  );

  const valorContrato = valorNegociado;
  const valorContratoCentavos = Math.round(valorContrato * 100);
  const totalComposicaoCentavos = items.reduce((total, item) => {
    const quantidade = itemParcelado(item.tipo) ? Math.max(1, item.parcelas) : 1;
    return total + Math.round(item.valor * 100) * quantidade;
  }, 0);
  const totalComposicao = totalComposicaoCentavos / 100;
  const diferencaCentavos = valorContratoCentavos - totalComposicaoCentavos;
  const diferenca = diferencaCentavos / 100;
  const parcelasAjustaveis = items.reduce(
    (total, item) =>
      total + (itemParcelado(item.tipo) ? Math.max(1, item.parcelas) : 0),
    0,
  );
  const limiteArredondamentoCentavos = Math.max(1, parcelasAjustaveis * 5);
  const ajusteAutomatico =
    valorContrato > 0 &&
    parcelasAjustaveis > 0 &&
    diferencaCentavos !== 0 &&
    Math.abs(diferencaCentavos) <= limiteArredondamentoCentavos;
  const composicaoConfere =
    valorContrato > 0 && (diferencaCentavos === 0 || ajusteAutomatico);

  const adicionar = (tipo: PagamentoTipo) => {
    setItems((atuais) => [...atuais, emptyItem(tipo, dataContrato)]);
  };

  const alterarTipo = (idx: number, tipo: PagamentoTipo) => {
    setItems((atuais) =>
      atuais.map((item, i) =>
        i === idx
          ? {
              ...item,
              tipo,
              descricao: "",
              parcelas: itemParcelado(tipo) ? Math.max(1, item.parcelas || 1) : 1,
            }
          : item,
      ),
    );
  };

  const dividirSaldoAutomaticamente = (idx: number) => {
    const item = items[idx];
    if (!item || !itemParcelado(item.tipo) || valorContratoCentavos <= 0) return;

    const quantidade = Math.max(1, item.parcelas);
    const outrosCentavos = items.reduce((total, atual, i) => {
      if (i === idx) return total;
      const qtd = itemParcelado(atual.tipo) ? Math.max(1, atual.parcelas) : 1;
      return total + Math.round(atual.valor * 100) * qtd;
    }, 0);
    const saldoCentavos = valorContratoCentavos - outrosCentavos;

    if (saldoCentavos <= 0) {
      toast.error("Não há saldo positivo para dividir nesta linha.");
      return;
    }

    const valorBaseCentavos = Math.round(saldoCentavos / quantidade);
    setItems((atuais) =>
      atuais.map((atual, i) =>
        i === idx ? { ...atual, valor: valorBaseCentavos / 100 } : atual,
      ),
    );
  };

  const submit = async () => {
    if (!empId || !matId || !clienteId || !clienteSelecionado) {
      toast.error("Preencha empreendimento, unidade e cliente");
      return;
    }
    if (valorContrato <= 0) {
      toast.error("Informe o valor negociado do contrato");
      return;
    }
    if (items.length === 0 || items.some((item) => item.valor <= 0)) {
      toast.error("Informe a composição real do pagamento");
      return;
    }
    if (!composicaoConfere) {
      toast.error("A composição do pagamento não fecha com o valor negociado", {
        description: `Valor negociado: ${brl(valorContrato)} · composição: ${brl(totalComposicao)}.`,
      });
      return;
    }
    const pctCorretor = Number(corretorPct) || 0;
    const pctRepasse = Number(repasseComissaoPct) || 0;
    if (pctCorretor < 0 || pctCorretor > 100 || pctRepasse < 0 || pctRepasse > 100) {
      toast.error("Os percentuais da comissão devem ficar entre 0% e 100%");
      return;
    }
    if (pctCorretor > 0 && !corretor) {
      toast.error("Selecione o corretor responsável ou informe comissão de 0%");
      return;
    }

    try {
      await addVenda({
        empreendimentoId: empId,
        matriculaId: matId,
        clienteId,
        compradorNome: clienteSelecionado.nome,
        valorTotal: valorContrato,
        valorImovel,
        corretagemValor,
        corretagemCompoeValorContrato: corretagemCompoeTotal === "sim",
        corretagemFormaPagamento: corretagemValor > 0 ? corretagemForma : undefined,
        dataContrato,
        corretorNome: corretor,
        corretorPct: pctCorretor,
        repasseComissaoPct: pctRepasse,
        comissaoSobreAcrescimos: comissaoSobreAcrescimos === "sim",
        regrasInadimplencia:
          regrasInadimplencia ?? regraSelecionada?.regras.inadimplencia,
        observacoes: obs,
        composicao: items,
      });
      toast.success("Venda registrada");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível registrar a venda",
      );
    }
  };

  return (
    <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Nova venda</DialogTitle>
        <DialogDescription>
          Selecione primeiro o empreendimento e a unidade. O sistema identifica a regra financeira
          mais específica disponível e congela essa regra no contrato.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Empreendimento</Label>
          <Select
            value={empId}
            onValueChange={(value) => {
              setEmpId(value);
              setMatId("");
              setValorNegociado(0);
              setCorretagemCompoeTotal("sim");
              setCorretagemForma("repasse_recebimentos");
              setCorretorPct("0");
              setRepasseComissaoPct("50");
              setComissaoSobreAcrescimos("nao");
              setRegrasInadimplencia(null);
              setItems([]);
            }}
          >
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {state.empreendimentos.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Matrícula / Unidade</Label>
          <Select
            value={matId}
            onValueChange={(value) => {
              setMatId(value);
              const selecionada = state.matriculas.find((m) => m.id === value);
              const valorBase = selecionada?.valorVenda ?? 0;
              setValorNegociado(valorBase);
              setItems([]);
              if (empreendimento && selecionada) {
                const q = selecionada.quadraId
                  ? state.quadras.find((item) => item.id === selecionada.quadraId)
                  : undefined;
                const efetiva = regrasEfetivasUnidade(
                  empreendimento,
                  selecionada,
                  q,
                  state.config,
                );
                setCorretorPct(String(efetiva.regras.corretorPct));
                setRepasseComissaoPct(String(efetiva.regras.repasseComissaoPct ?? 50));
                setComissaoSobreAcrescimos(
                  efetiva.regras.comissaoSobreAcrescimos ? "sim" : "nao",
                );
                setRegrasInadimplencia({ ...efetiva.regras.inadimplencia });
              }
            }}
            disabled={!empId || matriculas.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !empId
                    ? "Escolha o empreendimento"
                    : matriculas.length === 0
                      ? "Nenhuma unidade disponível"
                      : "Selecione"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {matriculas.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.numero} · {m.unidade}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {regraSelecionada && empreendimento && (
          <div className="sm:col-span-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
            <span className="text-muted-foreground">Regra financeira identificada: </span>
            <strong>{descricaoOrigemRegra(regraSelecionada.origem, empreendimento.nome, quadra?.nome)}</strong>
            <span className="text-muted-foreground">
              {` · tributação ${regraSelecionada.regras.aliquotaTributaria}% · corretor ${regraSelecionada.regras.corretorPct}% · sócio ${regraSelecionada.regras.socioNome || "não definido"} (${regraSelecionada.regras.socioPct}%) · empresa ${regraSelecionada.regras.empresaPct}%`}
            </span>
          </div>
        )}

        <div className="sm:col-span-2">
          <div className="flex items-end justify-between gap-3">
            <Label>Cliente / Comprador</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNovoClienteAberto((aberto) => !aberto)}
              disabled={!empresaAtualId}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {novoClienteAberto ? "Fechar cadastro" : "Novo cliente"}
            </Button>
          </div>

          <Select value={clienteId} onValueChange={setClienteId}>
            <SelectTrigger className="mt-1">
              <SelectValue
                placeholder={
                  carregandoClientes
                    ? "Carregando clientes..."
                    : clientes.length === 0
                      ? "Cadastre um cliente aqui para continuar"
                      : "Selecione o cliente"
                }
              />
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

          {novoClienteAberto && (
            <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold">Cadastrar comprador sem sair da venda</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  O cliente será salvo no cadastro da empresa e já ficará selecionado nesta venda.
                  Preencha os dados essenciais agora ou abra o cadastro completo para incluir endereço,
                  estado civil e profissão. Tudo será salvo em Clientes da empresa.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="text-xs">Nome completo *</Label>
                  <Input
                    value={novoClienteNome}
                    onChange={(e) => setNovoClienteNome(e.target.value)}
                    placeholder="Nome do comprador"
                  />
                </div>
                <div>
                  <Label className="text-xs">CPF</Label>
                  <Input
                    value={novoClienteCpf}
                    onChange={(e) => setNovoClienteCpf(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <Label className="text-xs">Telefone</Label>
                  <Input
                    value={novoClienteTelefone}
                    onChange={(e) => setNovoClienteTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">E-mail</Label>
                  <Input
                    type="email"
                    value={novoClienteEmail}
                    onChange={(e) => setNovoClienteEmail(e.target.value)}
                    placeholder="cliente@email.com"
                  />
                </div>
              </div>

              <div className="mt-3 border-t border-border/70 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCadastroCompletoAberto((aberto) => !aberto)}
                >
                  {cadastroCompletoAberto ? "Ocultar dados adicionais" : "Preencher cadastro completo"}
                </Button>
                {cadastroCompletoAberto && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <Label className="text-xs">Estado civil</Label>
                      <Select value={dadosAdicionaisCliente.estadoCivil || "__nao_informado__"} onValueChange={(valor) => setDadosAdicionaisCliente((d) => ({ ...d, estadoCivil: valor === "__nao_informado__" ? "" : valor }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__nao_informado__">Não informado</SelectItem>
                          {["Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)", "Separado(a)", "Viúvo(a)"].map((estado) => (
                            <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-3">
                      <Label className="text-xs">Profissão</Label>
                      <Input value={dadosAdicionaisCliente.profissao} onChange={(e) => setDadosAdicionaisCliente((d) => ({ ...d, profissao: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs">CEP</Label>
                      <div className="flex gap-2">
                        <Input
                          value={dadosAdicionaisCliente.cep.replace(/^(\d{5})(\d)/, "$1-$2")}
                          onChange={(e) => setDadosAdicionaisCliente((d) => ({ ...d, cep: e.target.value.replace(/\D/g, "").slice(0, 8) }))}
                          onBlur={() => { if (dadosAdicionaisCliente.cep.length === 8) void buscarCepNovoCliente(); }}
                          placeholder="00000-000"
                        />
                        <Button type="button" variant="outline" disabled={buscandoCep || dadosAdicionaisCliente.cep.length !== 8} onClick={() => void buscarCepNovoCliente()}>
                          {buscandoCep ? "..." : "Buscar"}
                        </Button>
                      </div>
                    </div>
                    <div className="sm:col-span-3">
                      <Label className="text-xs">Logradouro</Label>
                      <Input value={dadosAdicionaisCliente.logradouro} onChange={(e) => setDadosAdicionaisCliente((d) => ({ ...d, logradouro: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-1">
                      <Label className="text-xs">Número</Label>
                      <Input value={dadosAdicionaisCliente.numero} onChange={(e) => setDadosAdicionaisCliente((d) => ({ ...d, numero: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Complemento</Label>
                      <Input value={dadosAdicionaisCliente.complemento} onChange={(e) => setDadosAdicionaisCliente((d) => ({ ...d, complemento: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Bairro</Label>
                      <Input value={dadosAdicionaisCliente.bairro} onChange={(e) => setDadosAdicionaisCliente((d) => ({ ...d, bairro: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-1">
                      <Label className="text-xs">UF</Label>
                      <Input maxLength={2} value={dadosAdicionaisCliente.uf} onChange={(e) => setDadosAdicionaisCliente((d) => ({ ...d, uf: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2) }))} placeholder="MG" />
                    </div>
                    <div className="sm:col-span-1">
                      <Label className="text-xs">Cidade</Label>
                      <Input value={dadosAdicionaisCliente.cidade} onChange={(e) => setDadosAdicionaisCliente((d) => ({ ...d, cidade: e.target.value }))} />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void cadastrarClienteRapido()}
                  disabled={salvandoCliente || !novoClienteNome.trim()}
                >
                  {salvandoCliente ? "Cadastrando..." : "Cadastrar e selecionar"}
                </Button>
              </div>
            </div>
          )}

          <p className="mt-1 text-xs text-muted-foreground">
            O comprador continua vinculado ao cadastro de Clientes, evitando cadastros paralelos.
          </p>
        </div>

        <div>
          <Label>Valor total do contrato (R$)</Label>
          <CurrencyInput
            value={valorNegociado}
            onValueChange={setValorNegociado}
            placeholder="Ex.: 320.000,00"
          />
          {matricula && (
            <p className="mt-1 text-xs text-muted-foreground">
              Valor cadastrado da unidade: {brl(matricula.valorVenda)}. O total do contrato pode incluir outros componentes.
            </p>
          )}
        </div>

        <div>
          <Label>A corretagem está incluída no valor do contrato?</Label>
          <Select
            value={corretagemCompoeTotal}
            onValueChange={(value) => {
              const modo = value as "sim" | "nao";
              setCorretagemCompoeTotal(modo);
              setCorretagemForma(modo === "nao" ? "separada" : "repasse_recebimentos");
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sim">Sim — descontar do valor contratado</SelectItem>
              <SelectItem value="nao">Não — comissão cobrada separadamente</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            {corretagemCompoeTotal === "sim"
              ? "O contrato não aumenta: a comissão sai do valor contratado."
              : "A comissão não aumenta as parcelas deste contrato nem será descontada dos recebimentos dele."}
          </p>
        </div>

        <div>
          <Label>Comissão calculada (R$)</Label>
          <div className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm font-semibold">{brl(corretagemValor)}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {brl(valorContrato)} × {Number(corretorPct) || 0}% — base: valor contratado.
          </p>
        </div>

        <div className="sm:col-span-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground">
            {corretagemCompoeTotal === "sim" ? "Valor do imóvel após descontar a comissão" : "Valor do imóvel, sem comissão externa"}
          </p>
          <p className="text-lg font-semibold">{brl(valorImovel)}</p>
          {corretagemCompoeTotal === "nao" && corretagemValor > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Comissão externa à parte: {brl(corretagemValor)}. Não compõe o total da venda ou as parcelas.
            </p>
          )}
        </div>

        {corretagemValor > 0 && corretagemCompoeTotal === "sim" && (
          <div>
            <Label>Forma de pagamento da corretagem</Label>
            <Select value={corretagemForma} onValueChange={(value) => setCorretagemForma(value as typeof corretagemForma)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="repasse_recebimentos">Repasse a partir dos recebimentos</SelectItem>
                <SelectItem value="direto_corretor">Pagamento direto ao corretor</SelectItem>
                <SelectItem value="separada">Cobrança separada</SelectItem>
                <SelectItem value="outro">Outra forma prevista no contrato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label>Data do contrato</Label>
          <Input type="date" value={dataContrato} onChange={(e) => setDataContrato(e.target.value)} />
        </div>

        <div>
          <Label>Corretor responsável</Label>
          <Select value={corretor} onValueChange={setCorretor}>
            <SelectTrigger><SelectValue placeholder="Selecione, se houver" /></SelectTrigger>
            <SelectContent>
              {state.config.recebedores
                .filter((r) => r.tipo === "corretor")
                .map((r) => <SelectItem key={r.nome} value={r.nome}>{r.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>% Comissão total sobre a venda</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={corretorPct}
            onChange={(e) => setCorretorPct(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            É o teto total devido ao corretor sobre o valor do contrato. Ex.: 5% da venda.
          </p>
        </div>

        <div>
          <Label>% de cada recebimento para quitar a comissão</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={repasseComissaoPct}
            onChange={(e) => setRepasseComissaoPct(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {corretagemCompoeTotal === "sim"
              ? "Ex.: 50% da entrada e de cada parcela, até atingir o teto da comissão total."
              : "Comissão externa: os recebimentos deste contrato não fazem repasse automático."}
          </p>
        </div>

        <div>
          <Label>Aplicar o repasse também sobre multa/juros/correção?</Label>
          <Select value={comissaoSobreAcrescimos} onValueChange={setComissaoSobreAcrescimos}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nao">Não — somente sobre o principal</SelectItem>
              <SelectItem value="sim">Sim — sobre o valor total recebido</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            Esta escolha fica registrada no contrato e controla a base de cálculo dos repasses.
          </p>
        </div>
      </div>

      {regrasInadimplencia && (
        <div className="rounded-lg border border-border/70 bg-muted/10 p-4">
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <h3 className="text-sm font-semibold">Juros, correção e multa desta venda</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                A venda começa com a regra do empreendimento/unidade, mas você pode alterar somente este
                contrato. Essas condições continuam editáveis depois e recalculam as parcelas ainda abertas.
              </p>
            </div>
            {regraSelecionada && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setRegrasInadimplencia({ ...regraSelecionada.regras.inadimplencia })
                }
              >
                Restaurar padrão
              </Button>
            )}
          </div>
          <RegrasInadimplenciaForm
            value={regrasInadimplencia}
            onChange={setRegrasInadimplencia}
          />
        </div>
      )}

      <Separator className="my-2" />

      <div>
        <div className="mb-3 flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <h3 className="text-sm font-semibold">Composição do pagamento</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Adicione somente o que existe no contrato. “Sem sinal” não é forma de pagamento: se não
              houver entrada, simplesmente não adicione um sinal.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button size="sm" variant="outline" onClick={() => adicionar("avista")}>+ À vista</Button>
            <Button size="sm" variant="outline" onClick={() => adicionar("sinal")}>+ Sinal</Button>
            <Button size="sm" variant="outline" onClick={() => adicionar("sinal_parcelado")}>+ Sinal parcelado</Button>
            <Button size="sm" variant="outline" onClick={() => adicionar("parcelas")}>+ Parcelas iguais</Button>
            <Button size="sm" variant="outline" onClick={() => adicionar("parcela_personalizada")}>+ Parcela personalizada</Button>
            <Button size="sm" variant="outline" onClick={() => adicionar("bem")}>+ Bem</Button>
            <Button size="sm" variant="outline" onClick={() => adicionar("outro")}>+ Outro</Button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/80 px-5 py-8 text-center text-sm text-muted-foreground">
            Nenhuma forma de pagamento adicionada.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => {
              const parcelado = itemParcelado(item.tipo);
              const subtotal = item.valor * (parcelado ? Math.max(1, item.parcelas) : 1);
              return (
                <div key={item.id} className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Tipo</Label>
                      <Select
                        value={item.tipo}
                        onValueChange={(value) => alterarTipo(idx, value as PagamentoTipo)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="avista">À vista</SelectItem>
                          <SelectItem value="sinal">Sinal</SelectItem>
                          <SelectItem value="sinal_parcelado">Sinal parcelado</SelectItem>
                          <SelectItem value="parcelas">Parcelas iguais</SelectItem>
                          <SelectItem value="parcela_personalizada">Parcela personalizada</SelectItem>
                          <SelectItem value="bem">Bem material</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        value={item.descricao}
                        onChange={(e) =>
                          setItems((atuais) =>
                            atuais.map((x, i) => i === idx ? { ...x, descricao: e.target.value } : x),
                          )
                        }
                        placeholder={descricaoPlaceholder(item.tipo)}
                      />
                    </div>

                    <div className={parcelado ? "" : "sm:col-span-2"}>
                      <Label className="text-xs">{parcelado ? "Valor por parcela" : "Valor"}</Label>
                      <CurrencyInput
                        value={item.valor}
                        onValueChange={(valor) =>
                          setItems((atuais) =>
                            atuais.map((x, i) => i === idx ? { ...x, valor } : x),
                          )
                        }
                        placeholder="0,00"
                      />
                    </div>

                    {parcelado && (
                      <div>
                        <Label className="text-xs">Nº de parcelas</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.parcelas}
                          onChange={(e) =>
                            setItems((atuais) =>
                              atuais.map((x, i) =>
                                i === idx
                                  ? { ...x, parcelas: Math.max(1, Number(e.target.value) || 1) }
                                  : x,
                              ),
                            )
                          }
                        />
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <Label className="text-xs">
                        {item.tipo === "parcelas"
                          ? "Primeira parcela"
                          : item.tipo === "sinal_parcelado"
                            ? "1º vencimento do sinal"
                            : item.tipo === "bem"
                              ? "Data prevista"
                              : "Vencimento"}
                      </Label>
                      <Input
                        type="date"
                        value={item.primeiroVencimento}
                        onChange={(e) =>
                          setItems((atuais) =>
                            atuais.map((x, i) => i === idx ? { ...x, primeiroVencimento: e.target.value } : x),
                          )
                        }
                      />
                      {parcelado && (
                        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                          As próximas parcelas serão geradas mensalmente a partir desta data. Você não precisa
                          configurar uma por uma.
                        </p>
                      )}
                      {item.tipo === "parcela_personalizada" && (
                        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                          Esta parcela terá valor e vencimento próprios. Adicione outra parcela personalizada
                          para cada valor/data diferente do contrato.
                        </p>
                      )}
                    </div>

                    {item.tipo === "bem" && (
                      <div className="sm:col-span-3">
                        <Label className="text-xs">Detalhes do bem</Label>
                        <Input
                          value={item.observacoes || ""}
                          placeholder="Ex.: veículo, modelo, placa ou outra identificação"
                          onChange={(e) =>
                            setItems((atuais) =>
                              atuais.map((x, i) => i === idx ? { ...x, observacoes: e.target.value } : x),
                            )
                          }
                        />
                      </div>
                    )}

                    <div className="flex items-end justify-end sm:col-span-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setItems((atuais) => atuais.filter((_, i) => i !== idx))}
                        aria-label="Remover item"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
                    {parcelado ? (
                      <div className="flex flex-col items-start gap-1.5">
                        <span className="text-muted-foreground">
                          Agenda: {item.parcelas} {item.parcelas === 1 ? "parcela" : "parcelas"} mensais ·{" "}
                          {formatDate(item.primeiroVencimento)}
                          {item.parcelas > 1
                            ? ` até ${formatDate(addMonths(item.primeiroVencimento, item.parcelas - 1))}`
                            : ""}
                        </span>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                          onClick={() => dividirSaldoAutomaticamente(idx)}
                        >
                          <Calculator className="h-3.5 w-3.5" />
                          Dividir saldo automaticamente
                        </button>
                      </div>
                    ) : (
                      <span />
                    )}
                    <span>
                      <span className="text-muted-foreground">Subtotal: </span>
                      <strong>{brl(subtotal)}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3 grid gap-2 rounded-lg border border-border/70 bg-muted/40 px-4 py-3 text-sm sm:grid-cols-3">
          <ResumoValor label="Valor negociado" value={valorContrato} />
          <ResumoValor label="Composição informada" value={totalComposicao} />
          <div className="sm:text-right">
            <div className="text-xs text-muted-foreground">Diferença</div>
            <div
              className={`font-semibold ${
                valorContrato > 0 && !composicaoConfere
                  ? "text-destructive"
                  : ajusteAutomatico
                    ? "text-amber-600"
                    : "text-success"
              }`}
            >
              {brl(Math.abs(diferenca))}
            </div>
          </div>
        </div>
        {valorContrato > 0 && ajusteAutomatico && (
          <p className="mt-2 text-xs leading-5 text-amber-700">
            Essa diferença é pequena em relação ao parcelamento. Ao registrar a venda, o
            ImobControl ajustará {brl(Math.abs(diferenca))} somente na última parcela para que a
            soma final fique exatamente em {brl(valorContrato)}.
          </p>
        )}
        {valorContrato > 0 && !composicaoConfere && (
          <p className="mt-2 text-xs text-destructive">
            A diferença ultrapassa o limite seguro de ajuste automático (até R$ 0,05 por parcela).
            Revise os valores antes de registrar a venda.
          </p>
        )}
      </div>

      <div>
        <Label>Observações</Label>
        <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit}>Registrar venda</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function descricaoOrigemRegra(
  origem: "empreendimento" | "quadra" | "unidade",
  empreendimento: string,
  quadra?: string,
) {
  if (origem === "unidade") return "regra própria da unidade";
  if (origem === "quadra") return `regra da ${quadra || "quadra"}`;
  return `regra do empreendimento ${empreendimento}`;
}

function ResumoValor({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{brl(value)}</div>
    </div>
  );
}
