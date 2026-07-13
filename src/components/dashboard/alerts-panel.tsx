import {
  AlertTriangle,
  FileX2,
  CheckCircle2,
  Send,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Alert = {
  icon: LucideIcon;
  title: string;
  description: string;
  tone: "destructive" | "warning" | "success" | "primary";
  action: string;
};

const alerts: Alert[] = [
  {
    icon: AlertTriangle,
    title: "5 parcelas vencidas",
    description: "R$ 48.720 pendentes há mais de 5 dias",
    tone: "destructive",
    action: "Ver inadimplência",
  },
  {
    icon: FileX2,
    title: "2 contratos em rescisão",
    description: "Vila Jardins · Unid. 402 e Ed. Vitória · Unid. 1103",
    tone: "warning",
    action: "Analisar distratos",
  },
  {
    icon: CheckCircle2,
    title: "17 pagamentos registrados hoje",
    description: "Total conciliado: R$ 89.410",
    tone: "success",
    action: "Ver conciliação",
  },
  {
    icon: Send,
    title: "3 repasses pendentes",
    description: "Comissões de corretores aguardando aprovação",
    tone: "primary",
    action: "Aprovar repasses",
  },
];

const toneStyles: Record<Alert["tone"], { wrap: string; icon: string }> = {
  destructive: {
    wrap: "border-destructive/20 bg-destructive/5",
    icon: "bg-destructive/10 text-destructive",
  },
  warning: {
    wrap: "border-warning/30 bg-warning/10",
    icon: "bg-warning/20 text-warning-foreground",
  },
  success: {
    wrap: "border-success/25 bg-success/5",
    icon: "bg-success/10 text-success",
  },
  primary: {
    wrap: "border-primary/20 bg-primary/5",
    icon: "bg-primary/10 text-primary",
  },
};

export function AlertsPanel() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Alertas importantes</CardTitle>
        <CardDescription>
          Atenção necessária na sua carteira hoje
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((a) => {
          const t = toneStyles[a.tone];
          return (
            <div
              key={a.title}
              className={cn(
                "rounded-lg border p-3 transition hover:shadow-sm",
                t.wrap,
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                    t.icon,
                  )}
                >
                  <a.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.description}
                  </p>
                  <button className="mt-2 text-xs font-medium text-primary hover:underline">
                    {a.action} →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
