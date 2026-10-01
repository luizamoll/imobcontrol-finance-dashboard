import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { AuthPublicShell } from "@/components/auth-public-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiJson } from "@/lib/api";

export const Route = createFileRoute("/redefinir-senha")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: RedefinirSenhaPage,
  head: () => ({ meta: [{ title: "Redefinir senha · ImobControl" }] }),
});

function RedefinirSenhaPage() {
  const { token } = Route.useSearch();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      toast.error("Link de recuperação inválido.");
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
      await apiJson<void>("/api/auth/redefinir-senha", {
        method: "POST",
        body: JSON.stringify({ token, novaSenha: senha }),
      });
      setConcluido(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível redefinir a senha.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AuthPublicShell
      eyebrow="Recuperação de acesso"
      title="Defina uma nova senha"
      description="Ao concluir, as sessões antigas da sua conta serão encerradas."
    >
      {concluido ? (
        <div className="space-y-5 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <div>
            <div className="font-semibold">Senha atualizada</div>
            <p className="mt-1 text-sm text-muted-foreground">
              A nova senha já pode ser usada no login.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to="/login">Entrar no ImobControl</Link>
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={salvar}>
          <div className="space-y-2">
            <Label htmlFor="nova-senha">Nova senha</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="nova-senha"
                type="password"
                autoComplete="new-password"
                className="h-11 pl-10"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
            <Input
              id="confirmar-senha"
              type="password"
              autoComplete="new-password"
              className="h-11"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={salvando || !token}>
            {salvando ? "Salvando..." : "Redefinir senha"}
          </Button>
          {!token && (
            <p className="text-center text-xs text-destructive">
              Link inválido. Solicite uma nova recuperação de senha.
            </p>
          )}
        </form>
      )}
    </AuthPublicShell>
  );
}
