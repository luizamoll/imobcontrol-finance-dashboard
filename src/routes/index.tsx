import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  TrendingUp,
  Landmark,
  AlertTriangle,
  Download,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { FinancialChart } from "@/components/dashboard/financial-chart";
import { PortfolioByProject } from "@/components/dashboard/portfolio-by-project";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { UpcomingReceivables } from "@/components/dashboard/upcoming-receivables";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard · ImobControl" },
      {
        name: "description",
        content:
          "Visão geral da carteira imobiliária: empreendimentos ativos, recebíveis, saldo para retirada e alertas operacionais.",
      },
    ],
  }),
});

function Dashboard() {
  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-8 p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Painel da imobiliária
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Bom dia, Maria Luiza <span className="ml-1">☀️</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumo financeiro da carteira imobiliária.
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Última atualização em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nova Venda
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="🏘 Empreendimentos ativos"
          value="12"
          hint="3 em lançamento"
          trend={{ value: "2 novos", direction: "up" }}
          icon={Building2}
          accent="primary"
        />
        <StatCard
          title="💰 Recebimentos do mês"
          value="R$ 1.284.910"
          hint="vs. mês anterior"
          trend={{ value: "8,1%", direction: "up" }}
          icon={TrendingUp}
          accent="success"
        />
        <StatCard
          title="💵 Saldo disponível p/ retirada"
          value="R$ 316.480"
          hint="após repasses e comissões"
          trend={{ value: "3,4%", direction: "up" }}
          icon={Landmark}
          accent="primary"
        />
        <StatCard
          title="⚠ Parcelas em atraso"
          value="12"
          hint="R$ 386.240 pendentes"
          trend={{ value: "2,4%", direction: "up" }}
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
