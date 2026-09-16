import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, CircleDollarSign } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Entrar · ImobControl" },
      {
        name: "description",
        content: "Acesso ao ImobControl.",
      },
    ],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [entrando, setEntrando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !senha.trim()) {
      toast.error("Preencha e-mail e senha para continuar.");
      return;
    }

    setEntrando(true);

    // Etapa visual: a validação real será conectada ao Spring Security.
    await new Promise((resolve) => setTimeout(resolve, 350));

    toast.info("Acesso de desenvolvimento", {
      description: "A autenticação real será validada pelo back-end Java/Spring Security.",
    });

    setEntrando(false);
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-sidebar-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 right-0 h-80 w-80 rounded-full bg-sidebar-accent/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <CircleDollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-semibold">ImobControl</p>
            <p className="text-sm text-sidebar-foreground/60">Gestão imobiliária</p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent/40 px-3 py-1.5 text-xs font-medium">
            <ShieldCheck className="h-4 w-4" />
            Ambiente de gestão
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Seus empreendimentos e o financeiro em um só lugar.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-sidebar-foreground/65">
            Acompanhe empreendimentos, unidades, vendas, parcelas e recebimentos com uma visão organizada da operação.
          </p>
        </div>

        <p className="relative text-xs text-sidebar-foreground/45">
          © ImobControl · Acesso restrito
        </p>
      </section>

      <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CircleDollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">ImobControl</p>
              <p className="text-xs text-muted-foreground">Gestão imobiliária</p>
            </div>
          </div>

          <div className="mb-7">
            <p className="text-sm font-medium text-primary">Bem-vindo</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              Acesse sua conta
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Entre com as credenciais fornecidas para acessar o ImobControl.
            </p>
          </div>

          <Card className="border-border/70 shadow-sm">
            <CardContent className="p-6 sm:p-7">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="seuemail@empresa.com.br"
                      className="pl-9"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="senha">Senha</Label>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() =>
                        toast.info("Recuperação de senha será ativada junto com a autenticação.")
                      }
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="senha"
                      type={mostrarSenha ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Digite sua senha"
                      className="pl-9 pr-10"
                      value={senha}
                      onChange={(event) => setSenha(event.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => setMostrarSenha((valor) => !valor)}
                    >
                      {mostrarSenha ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={entrando}>
                  {entrando ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-5 flex items-start gap-2 rounded-lg border border-border/70 bg-muted/30 px-3.5 py-3 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Nesta etapa, a tela de acesso está pronta para desenvolvimento. A validação segura de usuário, senha e perfil será feita no servidor Java.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
