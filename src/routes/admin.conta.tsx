import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin/conta")({
  component: AdminContaPage,
  head: () => ({ meta: [{ title: "Minha conta · Administração · ImobControl" }] }),
});

type AuthResponse = {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  perfil: "SUPER_ADMIN" | "ADMIN" | "USUARIO";
};

function AdminContaPage() {
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

  if (usuario?.perfil !== "SUPER_ADMIN") {
    return (
      <PageShell>
        <PageHeader
          eyebrow="Administração"
          title="Acesso restrito"
          description="Este ambiente é exclusivo da administração da plataforma."
        />
      </PageShell>
    );
  }

  async function salvar() {
    if (!nome.trim() || !email.trim()) {
      toast.error("Informe nome e e-mail.");
      return;
    }
    const alterandoEmail = email.trim().toLowerCase() !== (usuario?.email ?? "").toLowerCase();
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
      await apiJson<AuthResponse>("/api/auth/minha-conta", {
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
      toast.success("Conta administrativa atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar sua conta.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Administração da plataforma"
        title="Minha conta"
        description="Gerencie com segurança as credenciais usadas para administrar o ImobControl."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Credenciais administrativas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="admin-nome">Nome</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="admin-nome"
                    value={nome}
                    onChange={(event) => setNome(event.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-telefone">Telefone</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="admin-telefone"
                    value={telefone}
                    onChange={(event) => setTelefone(event.target.value)}
                    className="pl-9"
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-email">E-mail de acesso</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha-atual">Senha atual</Label>
              <p className="text-xs text-muted-foreground">
                Necessária somente para alterar o e-mail ou definir uma nova senha.
              </p>
              <Input
                id="senha-atual"
                type="password"
                autoComplete="current-password"
                value={senhaAtual}
                onChange={(event) => setSenhaAtual(event.target.value)}
                placeholder="Confirme sua senha atual"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nova-senha">Nova senha</Label>
                <Input
                  id="nova-senha"
                  type="password"
                  autoComplete="new-password"
                  value={novaSenha}
                  onChange={(event) => setNovaSenha(event.target.value)}
                  placeholder="Deixe vazio para manter"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
                <Input
                  id="confirmar-senha"
                  type="password"
                  autoComplete="new-password"
                  value={confirmacao}
                  onChange={(event) => setConfirmacao(event.target.value)}
                />
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
            <CardTitle className="text-base">Segurança da conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <div className="flex gap-3 rounded-lg border border-border/70 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <div className="font-medium text-foreground">Proteção do acesso</div>
                <p className="mt-1">
                  Use uma credencial exclusiva para as tarefas administrativas e mantenha a senha atualizada.
                </p>
              </div>
            </div>
            <p>
              Evite reutilizar senhas e mantenha este acesso restrito a quem realmente administra a plataforma.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
