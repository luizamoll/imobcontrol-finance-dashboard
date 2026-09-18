import { createFileRoute, Link } from "@tanstack/react-router";
import { Building, Plus, Trash2, User, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DistribuicaoFinanceira } from "@/components/distribuicao-financeira";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { brl0, formatDate, pct } from "@/lib/format";
import { comissaoDaVenda, distribuicaoPrevista, previsaoQuitacaoComissao, useStore } from "@/lib/store";

export const Route = createFileRoute("/recebedores")({
  component: RecebedoresPage,
  head: () => ({ meta: [{ title: "Recebedores · ImobControl" }] }),
});

function RecebedoresPage() {
  const { state, updateConfig } = useStore();
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<"socio" | "empresa" | "corretor">("corretor");

  const adicionarRecebedor = () => {
    const nome = novoNome.trim();
    if (!nome) {
      toast.error("Informe o nome do recebedor.");
      return;
    }
    const jaExiste = state.config.recebedores.some(
      (r) => r.nome.toLowerCase() === nome.toLowerCase(),
    );
    if (jaExiste) {
      toast.error("Já existe um recebedor com esse nome.");
      return;
    }
    updateConfig({
      recebedores: [...state.config.recebedores, { nome, tipo: novoTipo }],
    });
    setNovoNome("");
    toast.success("Recebedor cadastrado.");
  };

  const removerRecebedor = (nome: string) => {
    const usadoEmVenda = state.vendas.some((v) => v.corretorNome === nome);
    if (usadoEmVenda) {
      toast.error("Este corretor já está vinculado a uma venda e não pode ser removido.");
      return;
    }
    updateConfig({
      recebedores: state.config.recebedores.filter((r) => r.nome !== nome),
    });
    toast.success("Recebedor removido.");
  };

  const distribuicao = useMemo(() => {
    return state.empreendimentos.map((e) => {
      const movimentos = state.movimentos.filter((m) => m.empreendimentoId === e.id);
      const recebido = movimentos.reduce((a, m) => a + m.valorRecebido, 0);
      const corretor = movimentos.reduce((a, m) => a + m.comissaoPaga, 0);
      const empresa = movimentos.reduce((a, m) => a + m.empresaValor, 0);
      const socio = movimentos.reduce((a, m) => a + m.socioValor, 0);
      const imposto = movimentos.reduce((a, m) => a + m.impostoReservado, 0);
      return { emp: e, recebido, socio, empresa, corretor, imposto };
    });
  }, [state.empreendimentos, state.movimentos]);

  const corretores = useMemo(() => {
    const map = new Map<string, { total: number; pago: number; saldo: number; vendas: number }>();
    for (const v of state.vendas) {
      const c = comissaoDaVenda(v, state.parcelas, state.config, state.movimentos);
      const cur = map.get(v.corretorNome) || { total: 0, pago: 0, saldo: 0, vendas: 0 };
      cur.total += c.total;
      cur.pago += c.pago;
      cur.saldo += c.saldo;
      cur.vendas += 1;
      map.set(v.corretorNome, cur);
    }
    return [...map.entries()].map(([nome, v]) => ({ nome, ...v }));
  }, [state]);

  const previstoDist = useMemo(
    () => distribuicaoPrevista(state.empreendimentos, state.vendas, state.parcelas, state.config),
    [state],
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="Distribuição financeira"
        title="Recebedores"
        description="Cadastre quem participa da operação e acompanhe os repasses efetivamente gerados pelos recebimentos."
      />

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Cadastro de recebedores</CardTitle>
          <p className="text-xs text-muted-foreground">
            Sócios, empresa e corretores usados nas vendas e na distribuição financeira.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label>Nome</Label>
              <Input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Nome da pessoa ou empresa"
                onKeyDown={(e) => {
                  if (e.key === "Enter") adicionarRecebedor();
                }}
              />
            </div>
            <div className="sm:w-44">
              <Label>Tipo</Label>
              <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as typeof novoTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="socio">Sócio</SelectItem>
                  <SelectItem value="empresa">Empresa</SelectItem>
                  <SelectItem value="corretor">Corretor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={adicionarRecebedor}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar
            </Button>
          </div>

          {state.config.recebedores.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 p-5 text-center text-sm text-muted-foreground">
              Nenhum recebedor cadastrado ainda.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {state.config.recebedores.map((r) => (
                <Badge key={`${r.tipo}-${r.nome}`} variant="secondary" className="gap-2 rounded-full px-3 py-1.5 text-sm">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.tipo}</span>
                  {r.nome}
                  <button
                    type="button"
                    onClick={() => removerRecebedor(r.nome)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remover ${r.nome}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="financeira" className="space-y-4">
        <TabsList>
          <TabsTrigger value="financeira">Distribuição financeira</TabsTrigger>
          <TabsTrigger value="distribuicao">Por empreendimento</TabsTrigger>
          <TabsTrigger value="corretores">Comissões</TabsTrigger>
        </TabsList>

        <TabsContent value="financeira" className="space-y-4">
          <DistribuicaoFinanceira
            movimentos={state.movimentos}
            empreendimentos={state.empreendimentos}
            previsto={previstoDist}
          />
        </TabsContent>

        <TabsContent value="distribuicao" className="space-y-4">
          {distribuicao.length === 0 ? (
            <Card className="border-dashed border-border/80">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Cadastre um empreendimento para acompanhar a distribuição por projeto.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {distribuicao.map(({ emp, recebido, socio, empresa, corretor, imposto }) => (
                <Card key={emp.id} className="border-border/70">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building className="h-4 w-4 text-primary" />
                      {emp.nome}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Bruto recebido: <span className="font-medium text-foreground">{brl0(recebido)}</span>
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <Row label="Imposto reservado" value={imposto} />
                    <Row label="Comissões pagas" value={corretor} />
                    <Row label={`Empresa (${emp.empresaPct}%)`} value={empresa} />
                    <Row label={`Sócio (${emp.socioPct}%)`} value={socio} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="corretores" className="space-y-4">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                Resumo por corretor
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Corretor</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Comissão total</TableHead>
                    <TableHead className="text-right">Já repassado</TableHead>
                    <TableHead className="text-right">Saldo a repassar</TableHead>
                    <TableHead>% pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {corretores.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        Nenhuma comissão vinculada a vendas ainda.
                      </TableCell>
                    </TableRow>
                  )}
                  {corretores.map((c) => {
                    const p = c.total ? (c.pago / c.total) * 100 : 0;
                    return (
                      <TableRow key={c.nome}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <User className="h-4 w-4" />
                            </div>
                            {c.nome || "Sem corretor"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{c.vendas}</TableCell>
                        <TableCell className="text-right">{brl0(c.total)}</TableCell>
                        <TableCell className="text-right text-success">{brl0(c.pago)}</TableCell>
                        <TableCell className="text-right">{brl0(c.saldo)}</TableCell>
                        <TableCell className="w-40">
                          <div className="flex items-center gap-2">
                            <Progress value={p} className="h-1.5" />
                            <span className="w-12 text-right text-xs text-muted-foreground">{pct(p)}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Repasses por venda</CardTitle>
              <p className="text-xs text-muted-foreground">
                Em cada venda, o percentual de comissão definido no próprio contrato é aplicado a cada
                valor recebido até quitar a comissão total. Depois da quitação, novos recebimentos não
                geram comissão.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venda / contrato</TableHead>
                    <TableHead>Empreendimento / unidade</TableHead>
                    <TableHead>Corretor</TableHead>
                    <TableHead className="text-right">Valor da venda</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    <TableHead className="text-right">Repassado</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Previsão para quitar</TableHead>
                    <TableHead>Último repasse</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.vendas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                        Nenhuma venda registrada.
                      </TableCell>
                    </TableRow>
                  )}
                  {state.vendas.map((v) => {
                    const c = comissaoDaVenda(v, state.parcelas, state.config, state.movimentos);
                    const previsao = previsaoQuitacaoComissao(
                      v,
                      state.parcelas,
                      state.config,
                      state.movimentos,
                    );
                    const last = c.repasses.at(-1);
                    const mat = state.matriculas.find((m) => m.id === v.matriculaId);
                    const emp = state.empreendimentos.find((e) => e.id === v.empreendimentoId);
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="text-sm">
                          <Link
                            to="/vendas/$id"
                            params={{ id: v.id }}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {v.compradorNome}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            Contrato de {formatDate(v.dataContrato)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{emp?.nome || "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            Unidade {mat?.unidade || "—"} · Matrícula {mat?.numero || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{v.corretorNome || "—"}</TableCell>
                        <TableCell className="text-right">{brl0(v.valorTotal)}</TableCell>
                        <TableCell className="text-right">
                          <div>{brl0(c.total)}</div>
                          <div className="text-[11px] text-muted-foreground">{pct(v.corretorPct)} da venda</div>
                        </TableCell>
                        <TableCell className="text-right text-success">{brl0(c.pago)}</TableCell>
                        <TableCell className="text-right">{brl0(c.saldo)}</TableCell>
                        <TableCell className="text-sm">
                          {c.total <= 0 ? (
                            <div className="font-medium text-muted-foreground">Sem comissão</div>
                          ) : previsao.quitada ? (
                            <div className="font-medium text-success">Comissão quitada</div>
                          ) : previsao.coberturaSuficiente ? (
                            <>
                              <div className="font-medium">
                                {previsao.parcelasRestantes > 0
                                  ? previsao.parcelasRestantes === 1
                                    ? "1 parcela"
                                    : `${previsao.parcelasRestantes} parcelas`
                                  : previsao.entradasRestantes === 1
                                    ? "1 recebimento inicial"
                                    : `${previsao.entradasRestantes} recebimentos iniciais`}
                                {previsao.parcelasRestantes > 0 && previsao.entradasRestantes > 0
                                  ? ` + ${previsao.entradasRestantes} recebimento(s) inicial(is)`
                                  : ""}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                previsão até {previsao.dataPrevista ? formatDate(previsao.dataPrevista) : "—"}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-medium text-warning-foreground">Agenda insuficiente</div>
                              <div className="text-xs text-muted-foreground">
                                Os recebimentos cadastrados não quitam todo o saldo da comissão.
                              </div>
                            </>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {last ? `${formatDate(last.data)} · ${brl0(last.valorRepasse)}` : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{brl0(value)}</span>
    </div>
  );
}
