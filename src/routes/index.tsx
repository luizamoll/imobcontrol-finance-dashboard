import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  Landmark,
  Plus,
  Settings2,
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
import { carregarConfiguracaoEmpresa } from "@/lib/empresa-config-api";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";
import { useLiveNow } from "@/lib/use-live-now";
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

function EtapaInicial({
  titulo,
  descricao,
  ativa = false,
}: {
  titulo: string;
  descricao: string;
  ativa?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 p-4">
      <div className="flex items-center gap-2">
        {ativa ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : (
          <div className="h-4 w-4 rounded-full border border-border" />
        )}
        <div className="text-sm font-medium">{titulo}</div>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{descricao}</p>
    </div>
  );
}

function Dashboard() {
  const { state } = useStore();
  const { usuario } = useAuth();
  const { empresaAtualId, empresaAtual } = useTenant();
  const hasData = state.empreendimentos.length > 0;
  const hoje = useLiveNow();
  const [configInicialConcluida, setConfigInicialConcluida] = useState<boolean | null>(null);

  useEffect(() => {
    if (!empresaAtualId || usuario?.perfil !== "ADMIN") {
      setConfigInicialConcluida(null);
      return;
    }

    let cancelado = false;
    void carregarConfiguracaoEmpresa(empresaAtualId)
      .then(({ config }) => {
        if (!cancelado) setConfigInicialConcluida(config.onboardingConcluido);
      })
      .catch(() => {
        if (!cancelado) setConfigInicialConcluida(false);
      });

    return () => {
      cancelado = true;
    };
  }, [empresaAtualId, usuario?.perfil]);

  const stats = useMemo(() => {
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
  }, [state, hoje]);

  const recursoEmBreve = (recurso: string) =>
    toast.info(`${recurso} ainda não disponível`, {
      description: "O recurso será liberado quando estiver ligado ao back-end e validado para dados reais.",
    });

  if (!hasData && usuario?.perfil === "ADMIN" && configInicialConcluida === false) {
    return (
      <div className="mx-auto w-full max-w-[1500px] space-y-8 p-6 lg:p-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Primeiro acesso
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Configure {empresaAtual?.nome ?? "sua empresa"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Antes do primeiro empreendimento, confirme os dados da empresa e os padrões que devem
            aparecer como sugestão nos novos projetos.
          </p>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Settings2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">1. Configuração inicial da empresa</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Salve CNPJ, contato e o modelo inicial de comissão, distribuição, tributação,
                    juros, multa, correção e tolerância. Esses valores não alteram operações antigas.
                  </p>
                </div>
              </div>
              <Button onClick={() => (window.location.href = "/configuracoes")}>
                Configurar empresa
                <Settings2 className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <EtapaInicial
                ativa
                titulo="1. Empresa"
                descricao="Dados e padrões iniciais."
              />
              <EtapaInicial
                titulo="2. Empreendimento"
                descricao="Projeto, SPE, unidades e regras próprias."
              />
              <EtapaInicial
                titulo="3. Operação"
                descricao="Clientes, vendas, parcelas e recebimentos."
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
