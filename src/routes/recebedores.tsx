import { createFileRoute } from "@tanstack/react-router";
import { Building, User, Users } from "lucide-react";
import { useMemo } from "react";

import { PageHeader, PageShell } from "@/components/page-shell";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DistribuicaoFinanceira } from "@/components/distribuicao-financeira";
import { useStore, comissaoDaVenda, distribuicaoPrevista } from "@/lib/store";
import { brl0, formatDate, pct } from "@/lib/format";

export const Route = createFileRoute("/recebedores")({
  component: RecebedoresPage,
  head: () => ({ meta: [{ title: "Recebedores · ImobControl" }] }),
});

function RecebedoresPage() {
  const { state } = useStore();

  // Distribution per empreendimento
  const distribuicao = useMemo(() => {
    return state.empreendimentos.map((e) => {
      const recebido = state.parcelas
        .filter((p) => p.empreendimentoId === e.id)
        .reduce((a, p) => a + p.valorPago, 0);
      const corretor = state.vendas
        .filter((v) => v.empreendimentoId === e.id)
        .reduce((acc, v) => {
          const c = comissaoDaVenda(v, state.parcelas, state.config);
          return acc + c.pago;
        }, 0);
      const empresa = recebido * (e.empresaPct / 100);
      const socio = recebido * (e.socioPct / 100);
      return { emp: e, recebido, socio, empresa, corretor };
    });
  }, [state]);

  // Broker commission totals
  const corretores = useMemo(() => {
    const map = new Map<string, { total: number; pago: number; saldo: number; vendas: number }>();
    for (const v of state.vendas) {
      const c = comissaoDaVenda(v, state.parcelas, state.config);
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
        description="Acompanhe a distribuição dos valores recebidos entre sócios, empresa e corretores."
      />

      <Tabs defaultValue="financeira" className="space-y-4">
        <TabsList>
          <TabsTrigger value="financeira">Distribuição Financeira</TabsTrigger>
          <TabsTrigger value="distribuicao">Distribuição por empreendimento</TabsTrigger>
          <TabsTrigger value="corretores">Comissão dos corretores</TabsTrigger>
        </TabsList>

        <TabsContent value="financeira" className="space-y-4">
          <DistribuicaoFinanceira
            movimentos={state.movimentos}
            empreendimentos={state.empreendimentos}
            previsto={previstoDist}
          />
        </TabsContent>


        <TabsContent value="distribuicao" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {distribuicao.map(({ emp, recebido, socio, empresa, corretor }) => (
              <Card key={emp.id} className="border-border/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building className="h-4 w-4 text-primary" />
                    {emp.nome}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Recebido: <span className="font-medium text-foreground">{brl0(recebido)}</span>
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label={`Sócio (${emp.socioPct}%)`} value={socio} />
                  <Row label={`Empresa (${emp.empresaPct}%)`} value={empresa} />
                  <Row label={`Corretor (comissões pagas)`} value={corretor} />
                </CardContent>
              </Card>
            ))}
          </div>
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
                  {corretores.map((c) => {
                    const p = c.total ? (c.pago / c.total) * 100 : 0;
                    return (
                      <TableRow key={c.nome}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <User className="h-4 w-4" />
                            </div>
                            {c.nome}
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
                Regra atual: {state.config.entradaPctCorretor}% da entrada + {state.config.parcelasPctCorretor}% das parcelas até quitar a comissão contratual.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venda</TableHead>
                    <TableHead>Corretor</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    <TableHead className="text-right">Repassado</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Último repasse</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.vendas.map((v) => {
                    const c = comissaoDaVenda(v, state.parcelas, state.config);
                    const last = c.repasses.at(-1);
                    const mat = state.matriculas.find((m) => m.id === v.matriculaId);
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="text-sm">
                          <div className="font-medium">{mat?.numero}</div>
                          <div className="text-xs text-muted-foreground">{v.compradorNome}</div>
                        </TableCell>
                        <TableCell className="text-sm">{v.corretorNome}</TableCell>
                        <TableCell className="text-right">{brl0(c.total)}</TableCell>
                        <TableCell className="text-right text-success">{brl0(c.pago)}</TableCell>
                        <TableCell className="text-right">{brl0(c.saldo)}</TableCell>
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
