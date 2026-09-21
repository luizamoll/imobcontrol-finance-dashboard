import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Landmark, TrendingUp, Wallet } from "lucide-react";
import { useMemo } from "react";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { inadimplenciaCalc, useStore } from "@/lib/store";
import { brl0 } from "@/lib/format";

export const Route = createFileRoute("/financeiro")({
  component: FinanceiroPage,
  head: () => ({ meta: [{ title: "Financeiro · ImobControl" }] }),
});

function FinanceiroPage() {
  const { state } = useStore();

  const consolidado = useMemo(() => {
    const hoje = new Date();
    const previsto = state.vendas
      .filter((v) => v.status !== "cancelada")
      .reduce((a, v) => a + v.valorTotal, 0);
    const recebido = state.movimentos.reduce((a, m) => a + m.valorRecebido, 0);
    const totalComissoes = state.movimentos.reduce((a, m) => a + m.comissaoPaga, 0);
    const impostos = state.movimentos.reduce((a, m) => a + m.impostoReservado, 0);
    const distribuido = state.movimentos.reduce(
      (a, m) => a + m.empresaValor + m.socioValor,
      0,
    );
    const emAtraso = state.parcelas
      .filter((p) => p.status !== "paga" && p.status !== "cancelada")
      .map((p) => inadimplenciaCalc(p, state.config, hoje))
      .filter((calc) => calc.diasAtraso > 0)
      .reduce((a, calc) => a + calc.atualizado, 0);

    return {
      previsto,
      recebido,
      totalComissoes,
      impostos,
      distribuido,
      emAtraso,
    };
  }, [state]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Tesouraria"
        title="Financeiro"
        description="Visão consolidada dos valores efetivamente registrados. Tributos, comissões e repasses realizados são lidos do histórico de movimentos, sem recalcular o passado com regras atuais."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BigStat
          title="Recebido total"
          value={brl0(consolidado.recebido)}
          icon={TrendingUp}
          accent="success"
        />
        <BigStat
          title="Valor contratado"
          value={brl0(consolidado.previsto)}
          icon={Wallet}
        />
        <BigStat
          title="Comissões pagas"
          value={brl0(consolidado.totalComissoes)}
          icon={Landmark}
        />
        <BigStat
          title="Tributos reservados"
          value={brl0(consolidado.impostos)}
          icon={Landmark}
          accent="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-border/70 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Realizado por empreendimento</CardTitle>
            <p className="text-xs text-muted-foreground">
              Valores abaixo vêm dos recebimentos registrados com as regras contratuais efetivamente
              aplicadas em cada movimento.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empreendimento / SPE</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead className="text-right">Recebido</TableHead>
                  <TableHead className="text-right">Tributo reservado</TableHead>
                  <TableHead className="text-right">Comissão paga</TableHead>
                  <TableHead className="text-right">Saldo distribuído</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.empreendimentos.map((e) => {
                  const movimentos = state.movimentos.filter(
                    (m) => m.empreendimentoId === e.id,
                  );
                  const recebido = movimentos.reduce((a, m) => a + m.valorRecebido, 0);
                  const tributos = movimentos.reduce((a, m) => a + m.impostoReservado, 0);
                  const comissao = movimentos.reduce((a, m) => a + m.comissaoPaga, 0);
                  const distribuido = movimentos.reduce(
                    (a, m) => a + m.empresaValor + m.socioValor,
                    0,
                  );
                  return (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="font-medium">{e.nome}</div>
                        <div className="text-xs text-muted-foreground">{e.spe}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {e.cnpj || "—"}
                      </TableCell>
                      <TableCell className="text-right">{brl0(recebido)}</TableCell>
                      <TableCell className="text-right">{brl0(tributos)}</TableCell>
                      <TableCell className="text-right">{brl0(comissao)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {brl0(distribuido)}
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
            <CardTitle className="text-base">Memória do realizado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Line label="Recebimentos" value={consolidado.recebido} />
            <Line label="(-) Comissões pagas" value={-consolidado.totalComissoes} />
            <Line label="(-) Tributos reservados" value={-consolidado.impostos} />
            <div className="mt-2 border-t border-border/70 pt-3">
              <div className="flex items-center justify-between text-base">
                <span className="font-semibold">Saldo distribuído</span>
                <span className="font-semibold text-success">
                  {brl0(consolidado.distribuido)}
                </span>
              </div>
            </div>
            <div className="mt-2 flex gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
              <span>
                Em atraso atualizado pelas regras de cada contrato:{" "}
                <strong className="text-destructive">{brl0(consolidado.emAtraso)}</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function BigStat({
  title,
  value,
  icon: Icon,
  accent = "primary",
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "success" | "warning" | "destructive";
}) {
  const acc: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${acc[accent]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${value < 0 ? "text-destructive" : "text-foreground"}`}>
        {brl0(value)}
      </span>
    </div>
  );
}
