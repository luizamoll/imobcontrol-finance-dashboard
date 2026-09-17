import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Settings2, ShieldCheck, Users } from "lucide-react";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/configuracoes")({
  component: ConfigPage,
  head: () => ({ meta: [{ title: "Configurações · ImobControl" }] }),
});

function ConfigPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Sistema"
        title="Configurações"
        description="Preferências administrativas do sistema. Regras financeiras pertencem ao contexto da operação e são configuradas no empreendimento, quadra, unidade ou contrato."
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Settings2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Regras financeiras não são configurações globais</p>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
                Comissão, tributação, participação de sócio e empresa, juros, multa, correção e tolerância devem ficar vinculados à operação a que realmente pertencem. O ImobControl deve sempre deixar claro onde a regra está sendo aplicada e contratos já registrados preservam a regra utilizada no momento da venda.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader>
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">Regras da operação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Abra o empreendimento para consultar ou alterar as regras financeiras daquele projeto. Exceções de quadra, unidade e contrato devem aparecer dentro do próprio contexto.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/empreendimentos">
                Abrir empreendimentos <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">Recebedores</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Sócios, empresas e corretores são cadastrados na área de Recebedores. O vínculo financeiro deve ser feito no empreendimento ou contrato correspondente.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/recebedores">
                Abrir recebedores <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">Administração</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Conta, empresa, usuários e permissões pertencem à administração do sistema. Esses dados não devem interferir silenciosamente nas regras financeiras dos empreendimentos.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
