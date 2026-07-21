import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle, Landmark, TrendingUp, Wallet } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore, comissaoDaVenda } from "@/lib/store";
import { brl0 } from "@/lib/format";

export const Route = createFileRoute("/financeiro")({
  component: FinanceiroPage,
  head: () => ({ meta: [{ title: "Financeiro · ImobControl" }] }),
});

function FinanceiroPage() {
  const { state, updateTrimestre } = useStore();

  const consolidado = useMemo(() => {
    const previsto = state.parcelas.reduce((a, p) => a + p.valor, 0);
    const recebido = state.parcelas.reduce((a, p) => a + p.valorPago, 0);
    const emAtraso = state.parcelas
      .filter((p) => p.status === "vencida")
      .reduce((a, p) => a + p.valor, 0);
    const totalComissoes = state.vendas.reduce(
      (a, v) => a + comissaoDaVenda(v, state.parcelas, state.config).pago,
      0,
    );
    const impostos = state.empreendimentos.reduce((a, e) => {
      const recEmp = state.parcelas
        .filter((p) => p.empreendimentoId === e.id)
        .reduce((s, p) => s + p.valorPago, 0);
      return a + recEmp * (e.aliquotaTributaria / 100);
    }, 0);
    const liquido = recebido - totalComissoes - impostos;
    return { previsto, recebido, emAtraso, totalComissoes, impostos, liquido };
  }, [state]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Tesouraria"
        title="Financeiro"
        description="Visão consolidada de recebimentos, comissões, tributos e acompanhamento trimestral com o contador."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BigStat title="Recebido total" value={brl0(consolidado.recebido)} icon={TrendingUp} accent="success" />
        <BigStat title="Previsto (contratos ativos)" value={brl0(consolidado.previsto)} icon={Wallet} />
        <BigStat title="Comissões pagas" value={brl0(consolidado.totalComissoes)} icon={Landmark} />
        <BigStat title="Estimativa de tributos" value={brl0(consolidado.impostos)} icon={Landmark} accent="warning" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-border/70 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Estimativa tributária por SPE</CardTitle>
            <p className="text-xs text-muted-foreground">
              Cálculo baseado na alíquota configurada para cada empreendimento.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empreendimento / SPE</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead className="text-right">Recebido</TableHead>
                  <TableHead className="text-right">Alíquota</TableHead>
                  <TableHead className="text-right">Tributo estimado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.empreendimentos.map((e) => {
                  const rec = state.parcelas
                    .filter((p) => p.empreendimentoId === e.id)
                    .reduce((a, p) => a + p.valorPago, 0);
                  const trib = rec * (e.aliquotaTributaria / 100);
                  return (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="font-medium">{e.nome}</div>
                        <div className="text-xs text-muted-foreground">{e.spe}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.cnpj}</TableCell>
                      <TableCell className="text-right">{brl0(rec)}</TableCell>
                      <TableCell className="text-right">{e.aliquotaTributaria}%</TableCell>
                      <TableCell className="text-right font-medium">{brl0(trib)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Resultado líquido estimado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Line label="Recebimentos" value={consolidado.recebido} />
            <Line label="(-) Comissões pagas" value={-consolidado.totalComissoes} />
            <Line label="(-) Tributos estimados" value={-consolidado.impostos} />
            <div className="mt-2 border-t border-border/70 pt-3">
              <div className="flex items-center justify-between text-base">
                <span className="font-semibold">Líquido</span>
                <span className={`font-semibold ${consolidado.liquido >= 0 ? "text-success" : "text-destructive"}`}>
                  {brl0(consolidado.liquido)}
                </span>
              </div>
            </div>
            <div className="mt-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              Em atraso: <span className="font-medium text-destructive">{brl0(consolidado.emAtraso)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Acompanhamento trimestral para o contador</CardTitle>
          <p className="text-xs text-muted-foreground">
            Checklist do fechamento trimestral: da separação dos contratos até o pagamento da guia.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trimestre</TableHead>
                <TableHead>Contratos</TableHead>
                <TableHead>Relatórios</TableHead>
                <TableHead>Boletos</TableHead>
                <TableHead>Enviado ao contador</TableHead>
                <TableHead>Guia recebida</TableHead>
                <TableHead>Guia paga</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.trimestres.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.trimestre}</TableCell>
                  <TableCell><Check on={t.contratosSeparados} onClick={() => updateTrimestre(t.id, { contratosSeparados: !t.contratosSeparados })} /></TableCell>
                  <TableCell><Check on={t.relatoriosPreparados} onClick={() => updateTrimestre(t.id, { relatoriosPreparados: !t.relatoriosPreparados })} /></TableCell>
                  <TableCell><Check on={t.boletosReunidos} onClick={() => updateTrimestre(t.id, { boletosReunidos: !t.boletosReunidos })} /></TableCell>
                  <TableCell><Check on={t.documentosEnviados} onClick={() => updateTrimestre(t.id, { documentosEnviados: !t.documentosEnviados })} /></TableCell>
                  <TableCell><Check on={t.guiaRecebida} onClick={() => updateTrimestre(t.id, { guiaRecebida: !t.guiaRecebida })} /></TableCell>
                  <TableCell><Check on={t.guiaPaga} onClick={() => updateTrimestre(t.id, { guiaPaga: !t.guiaPaga })} /></TableCell>
                  <TableCell className="text-right">
                    <Input
                      className="h-8 w-28 text-right"
                      type="number"
                      value={t.valorContador || ""}
                      onChange={(e) => updateTrimestre(t.id, { valorContador: Number(e.target.value) || 0 })}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        t.status === "concluido"
                          ? "bg-success/10 text-success"
                          : t.status === "andamento"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                      }
                    >
                      {t.status === "concluido" ? "Concluído" : t.status === "andamento" ? "Em andamento" : "Aberto"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function Check({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-muted-foreground hover:text-primary">
      {on ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4" />}
    </button>
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
