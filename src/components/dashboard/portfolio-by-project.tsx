import { Building2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

type Project = {
  nome: string;
  cidade: string;
  vgv: number;
  recebido: number;
  vendido: number;
  status: "Em obras" | "Lançamento" | "Entregue" | "Pré-lançamento";
};

const projects: Project[] = [
  {
    nome: "Residencial Vila Jardins",
    cidade: "São Paulo · SP",
    vgv: 24_500_000,
    recebido: 18_620_000,
    vendido: 82,
    status: "Em obras",
  },
  {
    nome: "Edifício Vitória",
    cidade: "Campinas · SP",
    vgv: 18_900_000,
    recebido: 9_450_000,
    vendido: 61,
    status: "Em obras",
  },
  {
    nome: "Reserva Alphaville",
    cidade: "Barueri · SP",
    vgv: 42_300_000,
    recebido: 12_690_000,
    vendido: 38,
    status: "Lançamento",
  },
  {
    nome: "Condomínio Parque das Águas",
    cidade: "Sorocaba · SP",
    vgv: 15_700_000,
    recebido: 14_915_000,
    vendido: 95,
    status: "Entregue",
  },
  {
    nome: "Ed. Horizonte Anchieta",
    cidade: "Santos · SP",
    vgv: 21_200_000,
    recebido: 3_180_000,
    vendido: 22,
    status: "Pré-lançamento",
  },
];

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

const statusStyles: Record<Project["status"], string> = {
  "Em obras": "border-primary/30 bg-primary/10 text-primary",
  Lançamento: "border-warning/40 bg-warning/15 text-warning-foreground",
  Entregue: "border-success/30 bg-success/10 text-success",
  "Pré-lançamento": "border-border bg-muted text-muted-foreground",
};

export function PortfolioByProject() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Carteira por empreendimento</CardTitle>
        <CardDescription>
          Desempenho comercial e recebíveis por obra
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {projects.map((p) => (
          <div
            key={p.nome}
            className="rounded-lg border border-border/60 bg-card p-4 transition hover:border-border hover:shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {p.nome}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.cidade}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={statusStyles[p.status]}>
                {p.status}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">VGV total</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                  {brl(p.vgv)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Recebido</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-success">
                  {brl(p.recebido)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Vendido</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                  {p.vendido}%
                </p>
              </div>
            </div>

            <div className="mt-3">
              <Progress value={p.vendido} className="h-1.5" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
