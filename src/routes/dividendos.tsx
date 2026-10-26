import { createFileRoute } from "@tanstack/react-router";
import { HandCoins, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CurrencyInput } from "@/components/currency-input";
import { PageHeader, PageShell } from "@/components/page-shell";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiJson } from "@/lib/api";
import { brl, pct } from "@/lib/format";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/dividendos")({
  component: DividendosPage,
  head: () => ({ meta: [{ title: "Dividendos de terceiros · ImobControl" }] }),
});

type Participante = {
  nome: string;
  percentual: number;
};

type DividendoTerceiro = {
  id: number;
  empresaId: number;
  imovel: string;
  valorBase: number;
  observacoes: string | null;
  participantes: Participante[];
  versao: number;
  criadoEm: string;
  atualizadoEm: string;
};

function novoParticipante(): Participante {
  return { nome: "", percentual: 0 };
}

function DividendosPage() {
  const { empresaAtualId, empresaAtual } = useTenant();
  const [itens, setItens] = useState<DividendoTerceiro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<DividendoTerceiro | null>(null);
  const [imovel, setImovel] = useState("");
  const [valorBase, setValorBase] = useState(0);
  const [observacoes, setObservacoes] = useState("");
  const [participantes, setParticipantes] = useState<Participante[]>([novoParticipante()]);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!empresaAtualId) {
      setItens([]);
      return;
    }
    setCarregando(true);
    try {
      const dados = await apiJson<DividendoTerceiro[]>("/api/dividendos-terceiros", {
        empresaId: empresaAtualId,
      });
      setItens(dados);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar os dividendos");
    } finally {
      setCarregando(false);
    }
  }, [empresaAtualId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const totalPercentual = useMemo(
    () => participantes.reduce((soma, item) => soma + (Number(item.percentual) || 0), 0),
    [participantes],
  );

  const totalControlado = useMemo(
    () => itens.reduce((soma, item) => soma + Number(item.valorBase || 0), 0),
    [itens],
  );

  const limpar = () => {
    setEditando(null);
    setImovel("");
    setValorBase(0);
    setObservacoes("");
    setParticipantes([novoParticipante()]);
  };

  const abrirNovo = () => {
    limpar();
    setDialogAberto(true);
  };

  const abrirEdicao = (item: DividendoTerceiro) => {
    setEditando(item);
    setImovel(item.imovel);
    setValorBase(Number(item.valorBase));
    setObservacoes(item.observacoes ?? "");
    setParticipantes(item.participantes.map((p) => ({ ...p, percentual: Number(p.percentual) })));
    setDialogAberto(true);
  };

  const atualizarParticipante = (indice: number, patch: Partial<Participante>) => {
    setParticipantes((atuais) =>
      atuais.map((item, i) => (i === indice ? { ...item, ...patch } : item)),
    );
  };

  const salvar = async () => {
    if (!empresaAtualId) return;
    if (!imovel.trim()) {
      toast.error("Informe o imóvel ou operação");
      return;
    }
    if (participantes.length === 0 || participantes.some((p) => !p.nome.trim())) {
      toast.error("Informe o nome de todos os participantes");
      return;
    }
    if (Math.abs(totalPercentual - 100) > 0.01) {
      toast.error("Os percentuais precisam totalizar 100%");
      return;
    }

    const body = {
      imovel: imovel.trim(),
      valorBase,
      observacoes: observacoes.trim() || null,
      participantes: participantes.map((p) => ({
        nome: p.nome.trim(),
        percentual: Number(p.percentual),
      })),
      versao: editando?.versao ?? null,
    };

    setSalvando(true);
    try {
      if (editando) {
        await apiJson<DividendoTerceiro>(`/api/dividendos-terceiros/${editando.id}`, {
          method: "PUT",
          empresaId: empresaAtualId,
          body: JSON.stringify(body),
        });
        toast.success("Controle de dividendos atualizado");
      } else {
        await apiJson<DividendoTerceiro>("/api/dividendos-terceiros", {
          method: "POST",
          empresaId: empresaAtualId,
          body: JSON.stringify(body),
        });
        toast.success("Controle de dividendos cadastrado");
      }
      setDialogAberto(false);
      limpar();
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar");
      if ((error as Error & { status?: number })?.status === 409) {
        await carregar();
      }
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (item: DividendoTerceiro) => {
    if (!empresaAtualId) return;
    if (!window.confirm(`Excluir o controle de dividendos de "${item.imovel}"?`)) return;
    try {
      await apiJson<void>(`/api/dividendos-terceiros/${item.id}`, {
        method: "DELETE",
        empresaId: empresaAtualId,
      });
      toast.success("Controle removido");
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir");
    }
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Financeiro"
        title="Dividendos de imóveis de terceiros"
        description={
          empresaAtual
            ? `Controle de participações e percentuais da equipe em operações de terceiros de ${empresaAtual.nome}.`
            : "Selecione uma empresa para controlar as participações."
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando}>
              <RefreshCw className={`mr-2 h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button size="sm" onClick={abrirNovo} disabled={!empresaAtualId}>
              <Plus className="mr-2 h-4 w-4" /> Nova operação
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Resumo label="Operações controladas" valor={String(itens.length)} />
        <Resumo label="Valor-base total" valor={brl(totalControlado)} />
        <Resumo
          label="Participantes únicos"
          valor={String(new Set(itens.flatMap((item) => item.participantes.map((p) => p.nome))).size)}
        />
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HandCoins className="h-4 w-4 text-primary" /> Participações cadastradas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {carregando ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : itens.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum imóvel de terceiro cadastrado ainda.
            </p>
          ) : (
            itens.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold">{item.imovel}</h3>
                    <p className="text-sm text-muted-foreground">
                      Valor-base: <strong className="text-foreground">{brl(item.valorBase)}</strong>
                    </p>
                    {item.observacoes && (
                      <p className="mt-1 text-xs text-muted-foreground">{item.observacoes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => abrirEdicao(item)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void excluir(item)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
                    </Button>
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-lg border border-border/60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Participante</TableHead>
                        <TableHead className="text-right">Percentual</TableHead>
                        <TableHead className="text-right">Valor correspondente</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {item.participantes.map((participante, indice) => (
                        <TableRow key={`${participante.nome}-${indice}`}>
                          <TableCell className="font-medium">{participante.nome}</TableCell>
                          <TableCell className="text-right">{pct(Number(participante.percentual))}</TableCell>
                          <TableCell className="text-right">
                            {brl(item.valorBase * (Number(participante.percentual) / 100))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={(open) => {
        setDialogAberto(open);
        if (!open) limpar();
      }}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar participação" : "Nova participação em imóvel de terceiro"}</DialogTitle>
            <DialogDescription>
              Informe a operação e distribua 100% entre os participantes. O valor individual é calculado automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Imóvel / operação</Label>
              <Input value={imovel} onChange={(e) => setImovel(e.target.value)} placeholder="Ex.: Fazenda Santa Clara" />
            </div>
            <div>
              <Label>Valor-base (R$)</Label>
              <CurrencyInput value={valorBase} onValueChange={setValorBase} />
            </div>
            <div>
              <Label>Total distribuído</Label>
              <div className={`mt-1 rounded-md border px-3 py-2 text-sm font-semibold ${
                Math.abs(totalPercentual - 100) <= 0.01
                  ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-700"
                  : "border-amber-500/40 bg-amber-500/5 text-amber-700"
              }`}>
                {pct(totalPercentual)} de 100%
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Observações</Label>
              <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Participantes</h3>
                <p className="text-xs text-muted-foreground">
                  Os percentuais precisam fechar exatamente em 100%.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setParticipantes((atuais) => [...atuais, novoParticipante()])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Participante
              </Button>
            </div>

            {participantes.map((participante, indice) => (
              <div key={indice} className="grid gap-2 sm:grid-cols-[1fr_130px_150px_36px] sm:items-end">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={participante.nome}
                    onChange={(e) => atualizarParticipante(indice, { nome: e.target.value })}
                    placeholder="Nome da pessoa/equipe"
                  />
                </div>
                <div>
                  <Label>Percentual</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={participante.percentual || ""}
                    onChange={(e) => atualizarParticipante(indice, { percentual: Number(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Valor</Label>
                  <div className="mt-1 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm">
                    {brl(valorBase * ((Number(participante.percentual) || 0) / 100))}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={participantes.length === 1}
                  onClick={() => setParticipantes((atuais) => atuais.filter((_, i) => i !== indice))}
                  aria-label="Remover participante"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button
              onClick={() => void salvar()}
              disabled={salvando || Math.abs(totalPercentual - 100) > 0.01}
            >
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar operação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function Resumo({ label, valor }: { label: string; valor: string }) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{valor}</p>
      </CardContent>
    </Card>
  );
}
