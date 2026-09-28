import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { ImobControlBrand } from "@/components/imobcontrol-brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

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
  const { recarregar } = useAuth();
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

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          senha,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("E-mail ou senha inválidos.");
        } else {
          toast.error("Não foi possível entrar agora. Tente novamente.");
        }
        return;
      }

      const usuario = (await response.json()) as {
        nome: string;
        perfil: "SUPER_ADMIN" | "ADMIN" | "USUARIO";
      };
      await recarregar();
      toast.success(`Bem-vinda, ${usuario.nome}.`);
      await navigate({
        to: usuario.perfil === "SUPER_ADMIN" ? "/admin" : "/",
        replace: true,
      });
    } catch {
      toast.error("Não foi possível conectar ao servidor do ImobControl.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(70,184,246,0.16),transparent_31%),radial-gradient(circle_at_86%_76%,rgba(53,164,245,0.12),transparent_28%)]" />
        <div className="absolute inset-y-0 right-0 w-px bg-white/10" />
        <div className="absolute -right-28 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full border border-white/[0.05]" />
        <div className="absolute -right-12 top-1/2 h-44 w-44 -translate-y-1/2 rounded-full border border-white/[0.07]" />

        <div className="relative z-10 flex min-h-screen flex-col px-12 py-10 xl:px-16 xl:py-12">
          <ImobControlBrand inverse />

          <div className="my-auto max-w-2xl py-14">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-white/75 backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-sky-300" />
              Gestão segura e centralizada
            </div>

            <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white xl:text-5xl 2xl:text-[3.45rem]">
              Controle a operação imobiliária sem perder o financeiro de vista.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/62 xl:text-lg xl:leading-8">
              Contratos, parcelas, recebimentos, empreendimentos e acessos reunidos em uma visão clara para a rotina da empresa.
            </p>

            <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
              <Feature icon={Building2} title="Operação" text="Empreendimentos e vendas" />
              <Feature icon={BarChart3} title="Financeiro" text="Parcelas e recebimentos" />
              <Feature icon={ShieldCheck} title="Controle" text="Acessos e auditoria" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 text-xs text-white/40">
            <span>© ImobControl</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Ambiente de acesso restrito
            </span>
          </div>
        </div>
      </section>

      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
        <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-primary/[0.035] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -left-24 h-96 w-96 rounded-full bg-primary/[0.025] blur-3xl" />

        <div className="relative w-full max-w-[430px]">
          <div className="mb-10 lg:hidden">
            <ImobControlBrand />
          </div>

          <div className="mb-7">
            <div className="mb-3 inline-flex rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              Acesso à plataforma
            </div>
            <h2 className="text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-[2rem]">
              Bem-vindo de volta
            </h2>
            <p className="mt-2.5 text-sm leading-6 text-muted-foreground">
              Entre com suas credenciais para acessar o ambiente do ImobControl.
            </p>
          </div>

          <Card className="overflow-hidden border-border/70 bg-card/95 shadow-[0_18px_60px_-28px_rgba(15,39,71,0.28)]">
            <div className="h-1 bg-gradient-to-r from-[#35A4F5] via-[#2F78BC] to-[#0F2747]" />
            <CardContent className="p-6 sm:p-8">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="seuemail@empresa.com.br"
                      className="h-11 pl-10"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="senha" className="text-sm font-medium">Senha</Label>
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary transition-opacity hover:opacity-75"
                      onClick={() =>
                        toast.info("A recuperação de senha será disponibilizada em breve.")
                      }
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="senha"
                      type={mostrarSenha ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Digite sua senha"
                      className="h-11 pl-10 pr-11"
                      value={senha}
                      onChange={(event) => setSenha(event.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
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

                <Button type="submit" className="h-11 w-full font-semibold" disabled={entrando}>
                  {entrando ? "Entrando..." : "Entrar no ImobControl"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-5 flex items-start gap-2.5 px-1 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Sua sessão é validada pelo servidor e o acesso respeita as permissões da sua conta.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.08] text-sky-300">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-sm font-semibold text-white">{title}</div>
      <div className="mt-1 text-xs leading-5 text-white/50">{text}</div>
    </div>
  );
}
