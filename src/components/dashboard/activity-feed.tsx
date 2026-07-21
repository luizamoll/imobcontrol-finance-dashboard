import { useMemo } from "react";
import { CheckCircle2, ShoppingCart, type LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { brl0, formatDate } from "@/lib/format";

type Activity = {
  icon: LucideIcon;
  title: string;
  description: string;
  when: string;
  tone: "success" | "primary" | "warning" | "destructive";
};

const tones = {
  success: "bg-success/10 text-success",
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/15 text-warning-foreground",
  destructive: "bg-destructive/10 text-destructive",
};

export function ActivityFeed() {
  const { state } = useStore();
  const acts = useMemo<Activity[]>(() => {
    const list: (Activity & { ts: string })[] = [];
    for (const p of state.parcelas) {
      if (p.status === "paga" && p.dataPagamento) {
        list.push({
          icon: CheckCircle2,
          title: "Pagamento registrado",
          description: `${p.compradorNome} — ${p.origemDescricao} — ${brl0(p.valorPago)}`,
          when: formatDate(p.dataPagamento),
          tone: "success",
          ts: p.dataPagamento,
        });
      }
    }
    for (const v of state.vendas) {
      list.push({
        icon: ShoppingCart,
        title: "Nova venda",
        description: `${v.compradorNome} — ${brl0(v.valorTotal)}`,
        when: formatDate(v.dataContrato),
        tone: "primary",
        ts: v.dataContrato,
      });
    }
    return list.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 8);
  }, [state]);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Últimas movimentações</CardTitle>
        <CardDescription>Atividades recentes na sua carteira</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-5">
          {acts.map((a, i) => (
            <li key={i} className="flex gap-3">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", tones[a.tone])}>
                <a.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{a.when}</span>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{a.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
