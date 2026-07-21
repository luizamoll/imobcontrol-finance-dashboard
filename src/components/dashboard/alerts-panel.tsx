import { AlertTriangle, CheckCircle2, Send, Wallet } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useStore, comissaoDaVenda } from "@/lib/store";
import { brl0 } from "@/lib/format";

export function AlertsPanel() {
  const { state } = useStore();
  const today = new Date();
  const vencidas = state.parcelas.filter(
    (p) => p.status === "pendente" && new Date(p.vencimento) < today,
  );
  const vencidasTotal = vencidas.reduce((a, p) => a + p.valor, 0);
  const pagasHoje = state.parcelas.filter(
    (p) => p.status === "paga" && p.dataPagamento && new Date(p.dataPagamento).toDateString() === today.toDateString(),
  );
  const pagasHojeTotal = pagasHoje.reduce((a, p) => a + p.valorPago, 0);
  const repassesPendentes = state.vendas.reduce(
    (a, v) => a + (comissaoDaVenda(v, state.parcelas, state.config).saldo > 0 ? 1 : 0),
    0,
  );

  const alerts = [
    {
      icon: AlertTriangle,
      tone: "destructive" as const,
      title: `${vencidas.length} parcelas vencidas`,
      description: `${brl0(vencidasTotal)} em atraso na carteira`,
      to: "/parcelas",
      action: "Ver inadimplência",
    },
    {
      icon: CheckCircle2,
      tone: "success" as const,
      title: `${pagasHoje.length} pagamentos registrados hoje`,
      description: `Total: ${brl0(pagasHojeTotal)}`,
      to: "/parcelas",
      action: "Ver conciliação",
    },
    {
      icon: Send,
      tone: "primary" as const,
      title: `${repassesPendentes} repasses de comissão pendentes`,
      description: "Corretores aguardando quitação",
      to: "/recebedores",
      action: "Aprovar repasses",
    },
    {
      icon: Wallet,
      tone: "warning" as const,
      title: `${state.trimestres.filter((t) => t.status !== "concluido").length} trimestres em aberto`,
      description: "Acompanhamento fiscal com o contador",
      to: "/financeiro",
      action: "Abrir financeiro",
    },
  ];

  const tones = {
    destructive: { wrap: "border-destructive/20 bg-destructive/5", icon: "bg-destructive/10 text-destructive" },
    warning: { wrap: "border-warning/30 bg-warning/10", icon: "bg-warning/20 text-warning-foreground" },
    success: { wrap: "border-success/25 bg-success/5", icon: "bg-success/10 text-success" },
    primary: { wrap: "border-primary/20 bg-primary/5", icon: "bg-primary/10 text-primary" },
  };

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Alertas importantes</CardTitle>
        <CardDescription>Atenção necessária na sua carteira hoje</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((a) => {
          const t = tones[a.tone];
          return (
            <div key={a.title} className={cn("rounded-lg border p-3 transition hover:shadow-sm", t.wrap)}>
              <div className="flex items-start gap-3">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", t.icon)}>
                  <a.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{a.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
                  <Link to={a.to} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                    {a.action} →
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
