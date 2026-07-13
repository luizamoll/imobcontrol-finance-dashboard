import {
  CheckCircle2,
  ShoppingCart,
  Percent,
  Receipt,
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

type Activity = {
  icon: LucideIcon;
  title: string;
  description: string;
  time: string;
  tone: "success" | "primary" | "warning" | "destructive";
};

const activities: Activity[] = [
  {
    icon: CheckCircle2,
    title: "Pagamento registrado",
    description: "Marcos Andrade — parcela 12/60 — R$ 4.320,00",
    time: "há 12 min",
    tone: "success",
  },
  {
    icon: ShoppingCart,
    title: "Nova venda",
    description: "Ed. Vitória — Unid. 802 — Juliana Prado — R$ 620.000",
    time: "há 1 h",
    tone: "primary",
  },
  {
    icon: Percent,
    title: "Comissão calculada",
    description: "Corretor Felipe Braga — R$ 12.400,00",
    time: "há 3 h",
    tone: "primary",
  },
  {
    icon: Receipt,
    title: "Despesa adicionada",
    description: "Taxa cartorial — Vila Jardins — R$ 980,00",
    time: "há 5 h",
    tone: "destructive",
  },
  {
    icon: CheckCircle2,
    title: "Pagamento registrado",
    description: "Beatriz Salles — parcela 03/36 — R$ 5.100,00",
    time: "ontem",
    tone: "success",
  },
];

const tones = {
  success: "bg-success/10 text-success",
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/15 text-warning-foreground",
  destructive: "bg-destructive/10 text-destructive",
};

export function ActivityFeed() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Últimas movimentações</CardTitle>
        <CardDescription>Atividades recentes na sua carteira</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-5">
          {activities.map((a, i) => (
            <li key={i} className="flex gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  tones[a.tone],
                )}
              >
                <a.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {a.time}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {a.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
