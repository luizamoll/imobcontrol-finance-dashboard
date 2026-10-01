import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { AuthPublicShell } from "@/components/auth-public-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiJson } from "@/lib/api";

export const Route = createFileRoute("/ativar-conta")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: AtivarContaPage,
  head: () => ({ meta: [{ title: "Ativar conta · ImobControl" }] }),
});

function AtivarContaPage() {
  const { token } = Route.useSearch();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  async function ativar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      toast.error("Este convite não possui um token válido.");
      return;
    }
    if (senha.length < 8 || senha.length > 72) {
      toast.error("A senha deve ter entre 8 e 72 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      toast.error("A confirmação da senha não confere.");
      return;
    }

    setSalvando(true);
    try {
      await apiJson<void>("/api/auth/ativar-conta", {
        method: "POST",
        body: JSON.stringify({ token, novaSenha: senha }),
      });
      setConcluido(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ativar a conta.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AuthPublicShell
      eyebrow="Primeiro acesso"
      title="Crie sua senha"
      description="Este convite confirma seu e-mail e libera o acesso ao ambiente da sua empresa."
    >
      {concluido ? (
        <div className="space-y-5 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <div>
            <div className="font-semibold">Conta ativada</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Seu e-mail foi confirmado e a senha foi criada.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to="/login">Entrar no ImobControl</Link>
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={ativar}>
          <div className="space-y-2">
            <Label htmlFor="senha-nova">Nova senha</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="senha-nova"
                type="password"
                autoComplete="new-password"
                className="h-11 pl-10"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo de 8 caracteres"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha-confirmacao">Confirmar senha</Label>
            <Input
              id="senha-confirmacao"
              type="password"
              autoComplete="new-password"
              className="h-11"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={salvando || !token}>
            {salvando ? "Ativando..." : "Ativar minha conta"}
          </Button>
          {!token && (
            <p className="text-center text-xs text-destructive">
              Link de convite inválido. Peça ao administrador para reenviar o convite.
            </p>
          )}
        </form>
      )}
    </AuthPublicShell>
  );
}
