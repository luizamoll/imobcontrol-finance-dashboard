import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { VendaStatusBadge } from "@/components/status-badges";
import {
  useStore,
  vendaTotais,
  type PagamentoItem,
  type PagamentoTipo,
} from "@/lib/store";
import { brl0, formatDate, todayISO, uid } from "@/lib/format";

export const Route = createFileRoute("/vendas")({
  component: VendasPage,
  head: () => ({ meta: [{ title: "Vendas · ImobControl" }] }),
});

function VendasPage() {
  const { state } = useStore();
  const [open, setOpen] = useState(false);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Comercial"
        title="Vendas"
        description="Registre novos contratos, composição de pagamento e comissionamento."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova venda
              </Button>
            </DialogTrigger>
            <NewVendaDialog onClose={() => setOpen(false)} />
          </Dialog>
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
                <TableHead className="text-right">Saldo</TableHead>
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
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <ShoppingCart className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{mat?.numero || "—"}</div>
                          <div className="text-xs text-muted-foreground">{mat?.unidade}</div>
                        </div>
                      </div>
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
                    <TableCell className="text-right font-medium">{brl0(v.valorTotal)}</TableCell>
                    <TableCell className="text-right text-success">{brl0(t.recebido)}</TableCell>
                    <TableCell className="text-right">{brl0(t.saldo)}</TableCell>
                    <TableCell>
                      <VendaStatusBadge status={v.status} />
                    </TableCell>
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

function emptyItem(tipo: PagamentoTipo): PagamentoItem {
  return {
    id: uid(),
    tipo,
    descricao: "",
    valor: 0,
    parcelas: 1,
    primeiroVencimento: todayISO(),
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
    case "bem":
      return "Ex.: veículo dado como parte do pagamento";
    default:
      return "Descreva esta parte do pagamento";
  }
}

function NewVendaDialog({ onClose }: { onClose: () => void }) {
  const { state, addVenda } = useStore();
  const [empId, setEmpId] = useState<string>("");
  const [matId, setMatId] = useState<string>("");
  const [comprador, setComprador] = useState("");
  const [valorNegociado, setValorNegociado] = useState("");
  const [dataContrato, setDataContrato] = useState(todayISO());
  const [corretor, setCorretor] = useState(
    state.config.recebedores.find((r) => r.tipo === "corretor")?.nome || "",
  );
  const [corretorPct, setCorretorPct] = useState("0");
  const [obs, setObs] = useState("");
  const [items, setItems] = useState<PagamentoItem[]>([]);

  const empreendimento = state.empreendimentos.find((e) => e.id === empId);
  const matricula = state.matriculas.find((m) => m.id === matId);
  const matriculas = useMemo(
    () =>
      state.matriculas.filter(
        (m) => m.empreendimentoId === empId && m.status === "disponivel",
      ),
    [state.matriculas, empId],
  );

  const totalComposicao = items.reduce(
    (total, item) =>
      total + item.valor * (itemParcelado(item.tipo) ? Math.max(1, item.parcelas) : 1),
    0,
  );
  const valorContrato = Number(valorNegociado) || 0;
  const diferenca = valorContrato - totalComposicao;
  const composicaoConfere = valorContrato > 0 && Math.abs(diferenca) <= 0.01;

  const adicionar = (tipo: PagamentoTipo) => {
    setItems((atuais) => [...atuais, emptyItem(tipo)]);
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

  const submit = () => {
    if (!empId || !matId || !comprador.trim()) {
      toast.error("Preencha empreendimento, unidade e comprador");
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
        description: `Valor negociado: ${brl0(valorContrato)} · composição: ${brl0(totalComposicao)}.`,
      });
      return;
    }

    addVenda({
      empreendimentoId: empId,
      matriculaId: matId,
      compradorNome: comprador.trim(),
      valorTotal: valorContrato,
      dataContrato,
      corretorNome: corretor,
      corretorPct: Number(corretorPct) || 0,
      observacoes: obs,
      composicao: items,
    });
    toast.success("Venda registrada");
    onClose();
  };

  return (
    <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Nova venda</DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Empreendimento</Label>
          <Select
            value={empId}
            onValueChange={(value) => {
              setEmpId(value);
              setMatId("");
              setValorNegociado("");
              setItems([]);
              const selecionado = state.empreendimentos.find((e) => e.id === value);
              setCorretorPct(String(selecionado?.corretorPct ?? 0));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {state.empreendimentos.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome}
                </SelectItem>
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
              setValorNegociado(selecionada?.valorVenda ? String(selecionada.valorVenda) : "");
              setItems([]);
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
                <SelectItem key={m.id} value={m.id}>
                  {m.numero} · {m.unidade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {empId && matriculas.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Cadastre uma unidade com status Disponível antes de registrar a venda.
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <Label>Comprador</Label>
          <Input
            value={comprador}
            onChange={(e) => setComprador(e.target.value)}
            placeholder="Nome do comprador"
          />
        </div>

        <div>
          <Label>Valor negociado do contrato (R$)</Label>
          <Input
            type="number"
            min="0"
            value={valorNegociado}
            onChange={(e) => setValorNegociado(e.target.value)}
            placeholder="Informe o valor efetivamente negociado"
          />
          {matricula && (
            <p className="mt-1 text-xs text-muted-foreground">
              Valor cadastrado da unidade: {brl0(matricula.valorVenda)}. Altere apenas se a venda tiver
              negociação diferente.
            </p>
          )}
        </div>

        <div>
          <Label>Data do contrato</Label>
          <Input
            type="date"
            value={dataContrato}
            onChange={(e) => setDataContrato(e.target.value)}
          />
        </div>

        <div>
          <Label>Corretor responsável</Label>
          <Select value={corretor} onValueChange={setCorretor}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione, se houver" />
            </SelectTrigger>
            <SelectContent>
              {state.config.recebedores
                .filter((r) => r.tipo === "corretor")
                .map((r) => (
                  <SelectItem key={r.nome} value={r.nome}>
                    {r.nome}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>% Comissão do corretor</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={corretorPct}
            onChange={(e) => setCorretorPct(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {empreendimento
              ? `Regra carregada de ${empreendimento.nome}. Se este contrato tiver uma exceção, informe-a aqui.`
              : "Selecione o empreendimento para carregar a regra dele."}
          </p>
        </div>
      </div>

      <Separator className="my-2" />

      <div>
        <div className="mb-3 flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <h3 className="text-sm font-semibold">Composição do pagamento</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Adicione somente as partes que existem neste contrato. “Sem sinal” não é uma forma de
              pagamento: basta não adicionar um sinal.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button size="sm" variant="outline" onClick={() => adicionar("avista")}>
              + À vista
            </Button>
            <Button size="sm" variant="outline" onClick={() => adicionar("sinal")}>
              + Sinal
            </Button>
            <Button size="sm" variant="outline" onClick={() => adicionar("sinal_parcelado")}>
              + Sinal parcelado
            </Button>
            <Button size="sm" variant="outline" onClick={() => adicionar("parcelas")}>
              + Parcelas
            </Button>
            <Button size="sm" variant="outline" onClick={() => adicionar("bem")}>
              + Bem
            </Button>
            <Button size="sm" variant="outline" onClick={() => adicionar("outro")}>
              + Outro
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/80 px-5 py-8 text-center text-sm text-muted-foreground">
            Nenhuma forma de pagamento adicionada. Escolha acima como esta venda foi negociada.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => {
              const parcelado = itemParcelado(item.tipo);
              const subtotal = item.valor * (parcelado ? Math.max(1, item.parcelas) : 1);
              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-border/70 bg-muted/20 p-3"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Tipo</Label>
                      <Select
                        value={item.tipo}
                        onValueChange={(value) => alterarTipo(idx, value as PagamentoTipo)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="avista">À vista</SelectItem>
                          <SelectItem value="sinal">Sinal</SelectItem>
                          <SelectItem value="sinal_parcelado">Sinal parcelado</SelectItem>
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
                        onChange={(e) =>
                          setItems((atuais) =>
                            atuais.map((x, i) =>
                              i === idx ? { ...x, descricao: e.target.value } : x,
                            ),
                          )
                        }
                        placeholder={descricaoPlaceholder(item.tipo)}
                      />
                    </div>

                    <div className={parcelado ? "" : "sm:col-span-2"}>
                      <Label className="text-xs">
                        {parcelado ? "Valor por parcela" : "Valor"}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.valor || ""}
                        onChange={(e) =>
                          setItems((atuais) =>
                            atuais.map((x, i) =>
                              i === idx ? { ...x, valor: Number(e.target.value) || 0 } : x,
                            ),
                          )
                        }
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
                        {parcelado ? "Primeiro vencimento" : item.tipo === "bem" ? "Data prevista" : "Vencimento"}
                      </Label>
                      <Input
                        type="date"
                        value={item.primeiroVencimento}
                        onChange={(e) =>
                          setItems((atuais) =>
                            atuais.map((x, i) =>
                              i === idx ? { ...x, primeiroVencimento: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </div>

                    {item.tipo === "bem" && (
                      <div className="sm:col-span-3">
                        <Label className="text-xs">Detalhes do bem</Label>
                        <Input
                          value={item.observacoes || ""}
                          placeholder="Ex.: veículo, modelo, placa ou outra identificação"
                          onChange={(e) =>
                            setItems((atuais) =>
                              atuais.map((x, i) =>
                                i === idx ? { ...x, observacoes: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </div>
                    )}

                    <div className="flex items-end justify-between gap-3 sm:col-span-1 sm:justify-end">
                      <div className="text-xs sm:hidden">
                        <span className="text-muted-foreground">Subtotal: </span>
                        <strong>{brl0(subtotal)}</strong>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setItems((atuais) => atuais.filter((_, i) => i !== idx))
                        }
                        aria-label="Remover item"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 hidden text-right text-xs sm:block">
                    <span className="text-muted-foreground">Subtotal desta composição: </span>
                    <strong>{brl0(subtotal)}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3 grid gap-2 rounded-lg border border-border/70 bg-muted/40 px-4 py-3 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">Valor negociado</div>
            <div className="font-semibold">{brl0(valorContrato)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Composição informada</div>
            <div className="font-semibold">{brl0(totalComposicao)}</div>
          </div>
          <div className="sm:text-right">
            <div className="text-xs text-muted-foreground">Diferença</div>
            <div
              className={`font-semibold ${
                valorContrato > 0 && !composicaoConfere ? "text-destructive" : "text-success"
              }`}
            >
              {brl0(Math.abs(diferenca))}
            </div>
          </div>
        </div>
        {valorContrato > 0 && !composicaoConfere && (
          <p className="mt-2 text-xs text-destructive">
            A composição precisa totalizar exatamente o valor negociado antes de registrar a venda.
          </p>
        )}
      </div>

      <div>
        <Label>Observações</Label>
        <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={submit}>Registrar venda</Button>
      </DialogFooter>
    </DialogContent>
  );
}
