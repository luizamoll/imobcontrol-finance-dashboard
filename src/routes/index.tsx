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
import { MovementsTable } from "@/components/dashboard/movements-table";

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
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Painel financeiro
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão consolidada da carteira e movimentações dos seus empreendimentos.
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
          value="R$ 12.480.320"
          hint="vs. mês anterior"
          trend={{ value: "4,2%", direction: "up" }}
          icon={Wallet}
          accent="primary"
        />
        <StatCard
          title="Recebido no Mês"
          value="R$ 745.900"
          hint="vs. mês anterior"
          trend={{ value: "8,1%", direction: "up" }}
          icon={TrendingUp}
          accent="success"
        />
        <StatCard
          title="Saldo Disponível"
          value="R$ 2.104.560"
          hint="conta operacional"
          trend={{ value: "1,3%", direction: "down" }}
          icon={PiggyBank}
          accent="primary"
        />
        <StatCard
          title="Parcelas Pendentes"
          value="R$ 386.240"
          hint="27 parcelas em atraso"
          trend={{ value: "2,4%", direction: "up" }}
          icon={AlertCircle}
          accent="warning"
        />
      </div>

      <FinancialChart />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <UpcomingTable />
        <MovementsTable />
      </div>
    </div>
  );
}
