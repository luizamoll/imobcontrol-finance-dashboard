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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const data = [
  { mes: "Jan", recebido: 420000, previsto: 480000 },
  { mes: "Fev", recebido: 465000, previsto: 490000 },
  { mes: "Mar", recebido: 512000, previsto: 520000 },
  { mes: "Abr", recebido: 498000, previsto: 530000 },
  { mes: "Mai", recebido: 561000, previsto: 560000 },
  { mes: "Jun", recebido: 604000, previsto: 590000 },
  { mes: "Jul", recebido: 578000, previsto: 610000 },
  { mes: "Ago", recebido: 632000, previsto: 640000 },
  { mes: "Set", recebido: 671000, previsto: 660000 },
  { mes: "Out", recebido: 702000, previsto: 690000 },
  { mes: "Nov", recebido: 688000, previsto: 710000 },
  { mes: "Dez", recebido: 745000, previsto: 740000 },
];

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

export function FinancialChart() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Fluxo Financeiro</CardTitle>
          <CardDescription>
            Recebido vs. previsto nos últimos 12 meses
          </CardDescription>
        </div>
        <Select defaultValue="12m">
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="6m">Últimos 6 meses</SelectItem>
            <SelectItem value="12m">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
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
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                vertical={false}
              />
              <XAxis
                dataKey="mes"
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
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
                formatter={(v: number, name) => [
                  brl(v),
                  name === "recebido" ? "Recebido" : "Previsto",
                ]}
              />
              <Area
                type="monotone"
                dataKey="previsto"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                strokeDasharray="4 4"
                fill="url(#colorPrevisto)"
              />
              <Area
                type="monotone"
                dataKey="recebido"
                stroke="var(--color-chart-1)"
                strokeWidth={2.5}
                fill="url(#colorRecebido)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
