import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Building2,
  TrendingUp,
  Landmark,
  AlertTriangle,
  Download,
  Plus,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const hasData = state.empreendimentos.length > 0;

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
              Cadastre manualmente um empreendimento ou prepare a importação de um arquivo. Depois,
              você poderá organizar quadras, lotes ou outras unidades e registrar as vendas a partir
              delas.
            </p>
            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => (window.location.href = "/empreendimentos")}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar empreendimento
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  toast.info("Importação de arquivo em preparação", {
                    description:
                      "O arquivo será validado pelo back-end Java antes de os dados entrarem no sistema.",
                  })
                }
              >
                <Upload className="mr-2 h-4 w-4" />
                Importar arquivo
              </Button>
            </div>
            <div className="mt-8 grid w-full max-w-3xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="text-sm font-medium text-foreground">1. Empreendimento</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Dados gerais, SPE, área e informações financeiras reais.
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="text-sm font-medium text-foreground">2. Quadras e unidades</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Organize lotes, apartamentos, salas ou outras unidades comercializáveis.
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="text-sm font-medium text-foreground">3. Venda</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Escolha a unidade, cadastre o cliente e monte a forma de pagamento.
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
            onClick={() =>
              toast.success("Exportação preparada", {
                description: "A exportação definitiva será ligada aos dados do back-end.",
              })
            }
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button size="sm" onClick={() => (window.location.href = "/vendas")}>
            <Plus className="mr-2 h-4 w-4" />
            Nova venda
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
