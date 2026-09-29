import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Mail, MailCheck, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/conta")({
  component: MinhaContaPage,
  head: () => ({ meta: [{ title: "Minha conta · ImobControl" }] }),
});

type AuthResponse = {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  emailVerificado: boolean;
  senhaDefinida: boolean;
  perfil: "SUPER_ADMIN" | "ADMIN" | "USUARIO";
};

function MinhaContaPage() {
  const { usuario, recarregar } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setNome(usuario?.nome ?? "");
    setEmail(usuario?.email ?? "");
    setTelefone(usuario?.telefone ?? "");
  }, [usuario?.email, usuario?.nome, usuario?.telefone]);

  async function salvar() {
    if (!nome.trim() || !email.trim()) {
      toast.error("Informe nome e e-mail.");
      return;
    }

    const alterandoEmail =
      email.trim().toLowerCase() !== (usuario?.email ?? "").toLowerCase();

    if ((alterandoEmail || novaSenha) && !senhaAtual) {
      toast.error("Confirme sua senha atual para alterar e-mail ou senha.");
      return;
    }
    if (novaSenha && novaSenha.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (novaSenha !== confirmacao) {
      toast.error("A confirmação da nova senha não confere.");
      return;
    }

    setSalvando(true);
    try {
      const resposta = await apiJson<AuthResponse>("/api/auth/minha-conta", {
        method: "PUT",
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim(),
          telefone: telefone.trim() || null,
          senhaAtual: senhaAtual || null,
          novaSenha: novaSenha || null,
        }),
      });
      await recarregar();
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacao("");
      toast.success(
        resposta.emailVerificado
          ? "Sua conta foi atualizada."
          : "Dados atualizados. Confirme o novo e-mail pelo link enviado.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar sua conta.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Conta"
        title="Minha conta"
        description="Atualize seus dados de acesso e sua senha sem depender de outro usuário."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Dados pessoais e acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="conta-nome">Nome</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="conta-nome"
                    value={nome}
                    onChange={(event) => setNome(event.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conta-telefone">Telefone</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="conta-telefone"
                    value={telefone}
                    onChange={(event) => setTelefone(event.target.value)}
                    className="pl-9"
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conta-email">E-mail de acesso</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="conta-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MailCheck className="h-3.5 w-3.5 text-primary" />
                <span>
                  {usuario?.emailVerificado
                    ? "E-mail verificado."
                    : "E-mail aguardando confirmação. Confirme pelo link enviado antes do próximo login."}
                </span>
              </div>
            </div>

            <div className="border-t border-border/70 pt-5">
              <div className="mb-4">
                <div className="text-sm font-semibold">Trocar senha</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Para alterar o e-mail ou a senha, confirme primeiro a senha atual.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conta-senha-atual">Senha atual</Label>
                <Input
                  id="conta-senha-atual"
                  type="password"
                  autoComplete="current-password"
                  value={senhaAtual}
                  onChange={(event) => setSenhaAtual(event.target.value)}
                  placeholder="Confirme apenas quando necessário"
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="conta-nova-senha">Nova senha</Label>
                  <Input
                    id="conta-nova-senha"
                    type="password"
                    autoComplete="new-password"
                    value={novaSenha}
                    onChange={(event) => setNovaSenha(event.target.value)}
                    placeholder="Mínimo de 8 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conta-confirmacao">Confirmar nova senha</Label>
                  <Input
                    id="conta-confirmacao"
                    type="password"
                    autoComplete="new-password"
                    value={confirmacao}
                    onChange={(event) => setConfirmacao(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button onClick={() => void salvar()} disabled={salvando}>
              <KeyRound className="mr-2 h-4 w-4" />
              {salvando ? "Salvando..." : "Salvar minha conta"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Seu acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <div className="flex gap-3 rounded-lg border border-border/70 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <div className="font-medium text-foreground">
                  {usuario?.perfil === "ADMIN" ? "Administrador da empresa" : "Usuário da empresa"}
                </div>
                <p className="mt-1">
                  {usuario?.empresa?.nome
                    ? `Seu acesso está vinculado somente a ${usuario.empresa.nome}.`
                    : "Seu acesso está vinculado ao ambiente autorizado."}
                </p>
              </div>
            </div>
            <p>
              As permissões operacionais são definidas pelo administrador da empresa e não podem ser
              ampliadas pelo próprio usuário.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
