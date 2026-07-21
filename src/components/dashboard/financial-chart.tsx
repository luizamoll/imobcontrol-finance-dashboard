import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { brl0 } from "@/lib/format";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function FinancialChart() {
  const { state } = useStore();
  const data = useMemo(() => {
    const now = new Date();
    const months: { key: string; mes: string; recebido: number; previsto: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        mes: MESES[d.getMonth()],
        recebido: 0,
        previsto: 0,
      });
    }
    const idx = new Map(months.map((m, i) => [m.key, i]));
    for (const p of state.parcelas) {
      const k = p.vencimento.slice(0, 7);
      const i = idx.get(k);
      if (i == null) continue;
      months[i].previsto += p.valor;
      if (p.dataPagamento) {
        const kp = p.dataPagamento.slice(0, 7);
        const ip = idx.get(kp);
        if (ip != null) months[ip].recebido += p.valorPago;
      }
    }
    return months;
  }, [state.parcelas]);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Fluxo Financeiro</CardTitle>
        <CardDescription>Recebido vs. previsto nos últimos 12 meses</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRecebido" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPrevisto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="mes" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
                formatter={(v: number, name) => [brl0(v), name === "recebido" ? "Recebido" : "Previsto"]}
              />
              <Area type="monotone" dataKey="previsto" stroke="var(--color-chart-2)" strokeWidth={2} strokeDasharray="4 4" fill="url(#colorPrevisto)" />
              <Area type="monotone" dataKey="recebido" stroke="var(--color-chart-1)" strokeWidth={2.5} fill="url(#colorRecebido)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
