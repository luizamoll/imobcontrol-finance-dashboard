import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AuthPublicShell } from "@/components/auth-public-shell";
import { Button } from "@/components/ui/button";
import { apiJson } from "@/lib/api";

export const Route = createFileRoute("/verificar-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: VerificarEmailPage,
  head: () => ({ meta: [{ title: "Verificar e-mail · ImobControl" }] }),
});

function VerificarEmailPage() {
  const { token } = Route.useSearch();
  const executou = useRef(false);
  const [estado, setEstado] = useState<"carregando" | "sucesso" | "erro">("carregando");

  useEffect(() => {
    if (executou.current) return;
    executou.current = true;

    if (!token) {
      setEstado("erro");
      return;
    }

    void apiJson<void>("/api/auth/verificar-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(() => setEstado("sucesso"))
      .catch(() => setEstado("erro"));
  }, [token]);

  return (
    <AuthPublicShell
      eyebrow="Segurança da conta"
      title="Confirmação de e-mail"
      description="Estamos validando o endereço que será usado para acessar o ImobControl."
    >
      <div className="space-y-5 text-center">
        {estado === "carregando" && (
          <>
            <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Confirmando seu e-mail...</p>
          </>
        )}
        {estado === "sucesso" && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
            <div>
              <div className="font-semibold">E-mail confirmado</div>
              <p className="mt-1 text-sm text-muted-foreground">
                O novo endereço já está liberado para login.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link to="/login">Ir para o login</Link>
            </Button>
          </>
        )}
        {estado === "erro" && (
          <>
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <div>
              <div className="font-semibold">Não foi possível confirmar</div>
              <p className="mt-1 text-sm text-muted-foreground">
                O link pode ter expirado ou já ter sido utilizado.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">Voltar para o login</Link>
            </Button>
          </>
        )}
      </div>
    </AuthPublicShell>
  );
}
