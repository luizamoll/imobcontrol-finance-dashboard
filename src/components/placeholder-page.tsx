import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PlaceholderPageProps {
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
}

export function PlaceholderPage({
  title,
  eyebrow,
  description,
  icon: Icon,
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-6 lg:p-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      <Card className="border-dashed border-border/70 bg-muted/20 shadow-none">
        <CardContent className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              Em construção
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Este módulo faz parte do roadmap do ImobControl e ficará disponível
              nas próximas etapas do produto.
            </p>
          </div>
          <Button variant="outline" size="sm">
            Solicitar acesso antecipado
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
