import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  AlertTriangle,
  Building2,
  Download,
  Landmark,
  Plus,
  TrendingUp,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { FinancialChart } from "@/components/dashboard/financial-chart";
import { PortfolioByProject } from "@/components/dashboard/portfolio-by-project";
import { StatCard } from "@/components/dashboard/stat-card";
import { UpcomingReceivables } from "@/components/dashboard/upcoming-receivables";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { brl0 } from "@/lib/format";
import { inadimplenciaCalc, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard · ImobControl" },
      {
        name: "description",
        content:
          "Visão geral da carteira imobiliária: empreendimentos, recebimentos, distribuição financeira e alertas operacionais.",
      },
    ],
  }),
});

function Dashboard() {
  const { state } = useStore();
  const hasData = state.empreendimentos.length > 0;

  const stats = useMemo(() => {
    const hoje = new Date();
    const monthKey = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    const ativos = state.empreendimentos.filter((e) => e.status !== "concluido").length;
    const recebidoMes = state.parcelas
      .filter((p) => p.dataPagamento?.startsWith(monthKey))
      .reduce((a, p) => a + p.valorPago, 0);
    const saldoDistribuido = state.movimentos.reduce(
      (a, m) => a + m.empresaValor + m.socioValor,
      0,
    );
    const vencidas = state.parcelas
      .filter((p) => p.status !== "paga" && p.status !== "cancelada")
      .map((p) => ({ p, calc: inadimplenciaCalc(p, state.config, hoje) }))
      .filter(({ calc }) => calc.diasAtraso > 0);
    const vencidasTotal = vencidas.reduce((a, item) => a + item.calc.atualizado, 0);
    return {
      ativos,
      recebidoMes,
      saldoDistribuido,
      vencidasCount: vencidas.length,
      vencidasTotal,
    };
  }, [state]);

  const recursoEmBreve = (recurso: string) =>
    toast.info(`${recurso} ainda não disponível`, {
      description: "O recurso será liberado quando estiver ligado ao back-end e validado para dados reais.",
    });

  if (!hasData) {
    return (
      <div className="mx-auto w-full max-w-[1500px] space-y-8 p-6 lg:p-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Início da operação
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Bem-vindo ao ImobControl
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            O sistema está limpo e pronto para receber os dados reais dos seus empreendimentos.
          </p>
        </div>

        <Card className="border-dashed border-border/80">
          <CardContent className="flex min-h-[420px] flex-col items-center justify-center px-6 py-14 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">Comece pelo primeiro empreendimento</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Cadastre manualmente um empreendimento. Depois inclua as unidades comercializáveis e
              registre as vendas a partir delas.
            </p>
            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => (window.location.href = "/empreendimentos")}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar empreendimento
              </Button>
              <Button variant="outline" onClick={() => recursoEmBreve("Importação") }>
                <Upload className="mr-2 h-4 w-4" />
                Importar · em breve
              </Button>
            </div>
            <div className="mt-8 grid w-full max-w-3xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="text-sm font-medium text-foreground">1. Empreendimento</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Dados gerais, SPE, área e regras financeiras reais.
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="text-sm font-medium text-foreground">2. Unidades</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Cadastre lotes, apartamentos, salas ou outras unidades comercializáveis.
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="text-sm font-medium text-foreground">3. Venda</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Escolha uma unidade disponível, informe o comprador e monte o pagamento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-8 p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Painel da operação
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Visão geral
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumo financeiro dos dados cadastrados no sistema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => recursoEmBreve("Exportação")}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar · em breve
          </Button>
          <Button size="sm" onClick={() => (window.location.href = "/vendas")}>
            <Plus className="mr-2 h-4 w-4" />
            Nova venda
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Empreendimentos ativos"
          value={String(stats.ativos)}
          hint={`${state.empreendimentos.length} no portfólio`}
          icon={Building2}
          accent="primary"
        />
        <StatCard
          title="Recebimentos do mês"
          value={brl0(stats.recebidoMes)}
          hint="pagamentos registrados no mês vigente"
          icon={TrendingUp}
          accent="success"
        />
        <StatCard
          title="Saldo líquido distribuído"
          value={brl0(stats.saldoDistribuido)}
          hint="empresa + sócio, após imposto e comissão"
          icon={Landmark}
          accent="primary"
        />
        <StatCard
          title="Parcelas em atraso"
          value={String(stats.vencidasCount)}
          hint={`${brl0(stats.vencidasTotal)} atualizado`}
          icon={AlertTriangle}
          accent="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <PortfolioByProject />
        </div>
        <div className="xl:col-span-1">
          <AlertsPanel />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <FinancialChart />
          <UpcomingReceivables />
        </div>
        <div className="xl:col-span-1">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
