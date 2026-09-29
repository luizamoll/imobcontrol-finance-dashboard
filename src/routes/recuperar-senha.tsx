import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { FormEvent, useState } from "react";

import { AuthPublicShell } from "@/components/auth-public-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiJson } from "@/lib/api";

export const Route = createFileRoute("/recuperar-senha")({
  component: RecuperarSenhaPage,
  head: () => ({ meta: [{ title: "Recuperar senha · ImobControl" }] }),
});

function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;

    setEnviando(true);
    try {
      await apiJson<void>("/api/auth/recuperar-senha", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setConcluido(true);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthPublicShell
      eyebrow="Recuperação de acesso"
      title="Esqueceu sua senha?"
      description="Informe o e-mail usado no ImobControl. Se houver uma conta vinculada, enviaremos um link temporário."
    >
      {concluido ? (
        <div className="space-y-5">
          <div className="rounded-lg border border-primary/15 bg-primary/5 p-4 text-sm leading-6">
            Se houver uma conta vinculada a <strong>{email}</strong>, as instruções de recuperação
            serão enviadas para esse endereço. O link expira em 30 minutos.
          </div>
          <Button asChild className="w-full">
            <Link to="/login">Voltar para o login</Link>
          </Button>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={enviar}>
          <div className="space-y-2">
            <Label htmlFor="email-recuperacao">E-mail</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email-recuperacao"
                type="email"
                autoComplete="email"
                className="h-11 pl-10"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seuemail@empresa.com.br"
                required
              />
            </div>
          </div>
          <Button type="submit" className="h-11 w-full" disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar instruções"}
          </Button>
          <div className="text-center">
            <Link to="/login" className="text-sm font-medium text-primary hover:underline">
              Voltar para o login
            </Link>
          </div>
        </form>
      )}
    </AuthPublicShell>
  );
}
