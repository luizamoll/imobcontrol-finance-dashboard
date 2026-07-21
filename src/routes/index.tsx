import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Building2,
  TrendingUp,
  Landmark,
  AlertTriangle,
  Download,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { FinancialChart } from "@/components/dashboard/financial-chart";
import { PortfolioByProject } from "@/components/dashboard/portfolio-by-project";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { UpcomingReceivables } from "@/components/dashboard/upcoming-receivables";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { useStore, comissaoDaVenda } from "@/lib/store";
import { brl0 } from "@/lib/format";

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
  const { state } = useStore();
  const stats = useMemo(() => {
    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const ativos = state.empreendimentos.filter((e) => e.status !== "concluido").length;
    const recebidoMes = state.parcelas
      .filter((p) => p.dataPagamento?.startsWith(monthKey))
      .reduce((a, p) => a + p.valorPago, 0);
    const recebidoTotal = state.parcelas.reduce((a, p) => a + p.valorPago, 0);
    const comissoesPagas = state.vendas.reduce(
      (a, v) => a + comissaoDaVenda(v, state.parcelas, state.config).pago,
      0,
    );
    const impostos = state.empreendimentos.reduce((a, e) => {
      const rec = state.parcelas
        .filter((p) => p.empreendimentoId === e.id)
        .reduce((s, p) => s + p.valorPago, 0);
      return a + rec * (e.aliquotaTributaria / 100);
    }, 0);
    const saldoRetirada = Math.max(0, recebidoTotal - comissoesPagas - impostos);
    const vencidas = state.parcelas.filter(
      (p) => p.status === "pendente" && new Date(p.vencimento) < today,
    );
    const vencidasTotal = vencidas.reduce((a, p) => a + p.valor, 0);
    return { ativos, recebidoMes, saldoRetirada, vencidasCount: vencidas.length, vencidasTotal };
  }, [state]);

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
          <Button variant="outline" size="sm" onClick={() => toast.success("Exportação preparada", { description: "Demonstração visual." })}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button size="sm" onClick={() => (window.location.href = "/vendas")}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Venda
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="🏘 Empreendimentos ativos"
          value={String(stats.ativos)}
          hint={`${state.empreendimentos.length} no portfólio`}
          icon={Building2}
          accent="primary"
        />
        <StatCard
          title="💰 Recebimentos do mês"
          value={brl0(stats.recebidoMes)}
          hint="parcelas quitadas no mês vigente"
          icon={TrendingUp}
          accent="success"
        />
        <StatCard
          title="💵 Saldo disponível p/ retirada"
          value={brl0(stats.saldoRetirada)}
          hint="após comissões e tributos"
          icon={Landmark}
          accent="primary"
        />
        <StatCard
          title="⚠ Parcelas em atraso"
          value={String(stats.vencidasCount)}
          hint={`${brl0(stats.vencidasTotal)} pendentes`}
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
