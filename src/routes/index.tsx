import { createFileRoute } from "@tanstack/react-router";
import {
  Wallet,
  TrendingUp,
  PiggyBank,
  AlertCircle,
  Download,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { FinancialChart } from "@/components/dashboard/financial-chart";
import { UpcomingTable } from "@/components/dashboard/upcoming-table";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard · ImobControl" },
      {
        name: "description",
        content:
          "Visão geral da carteira, recebimentos, saldo disponível e parcelas pendentes dos seus empreendimentos.",
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
            Painel geral
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Olá, Maria Luiza <span className="ml-1">👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aqui está o resumo financeiro dos seus empreendimentos hoje.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Novo lançamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Carteira Total"
          value="R$ 8.685.000"
          hint="vs. mês anterior"
          trend={{ value: "4,2%", direction: "up" }}
          icon={Wallet}
          accent="primary"
        />
        <StatCard
          title="Recebido no mês"
          value="R$ 149.857"
          hint="vs. mês anterior"
          trend={{ value: "8,1%", direction: "up" }}
          icon={TrendingUp}
          accent="success"
        />
        <StatCard
          title="Saldo disponível"
          value="R$ 16.257"
          hint="conta operacional"
          trend={{ value: "1,3%", direction: "down" }}
          icon={PiggyBank}
          accent="primary"
        />
        <StatCard
          title="Parcelas em atraso"
          value="12"
          hint="R$ 386.240 pendentes"
          trend={{ value: "2,4%", direction: "up" }}
          icon={AlertCircle}
          accent="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <FinancialChart />
          <ActivityFeed />
        </div>
        <div className="xl:col-span-1">
          <UpcomingTable />
        </div>
      </div>
    </div>
  );
}
