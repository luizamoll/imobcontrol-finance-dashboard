import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, CheckCircle2, Mail, Pencil, Plus, Power, PowerOff, Search, ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/admin/empresas")({
  validateSearch: (search: Record<string, unknown>) => ({
    nova: search.nova === "1" || search.nova === 1 || search.nova === true,
  }),
  component: AdminEmpresasPage,
  head: () => ({ meta: [{ title: "Empresas · Administração · ImobControl" }] }),
});

type Empresa = {
  id: number;
  nome: string;
  slug: string;
  ativa: boolean;
  administradoresAtivos: number;
  administradoresPendentes: number;
  criadoEm?: string;
  atualizadoEm?: string;
};

type AcessoCriado = {
  empresa: Empresa;
  nome: string;
  email: string;
  conviteEnviado: boolean;
};

type UsuarioCriado = {
  conviteEnviadoEm: string | null;
};

function AdminEmpresasPage() {
  const navigate = useNavigate();
  const { nova } = Route.useSearch();
  const { usuario } = useAuth();
  const { selecionarEmpresa } = useTenant();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [novoAberto, setNovoAberto] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [empresaOnboarding, setEmpresaOnboarding] = useState<Empresa | null>(null);
  const [adminNome, setAdminNome] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminTelefone, setAdminTelefone] = useState("");
  const [salvandoAdmin, setSalvandoAdmin] = useState(false);
  const [acessoCriado, setAcessoCriado] = useState<AcessoCriado | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      setEmpresas(await apiJson<Empresa[]>("/api/super-admin/empresas?incluirInativas=true"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar as empresas");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { void carregar(); }, []);

  useEffect(() => {
    if (nova) setNovoAberto(true);
  }, [nova]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return empresas;
    return empresas.filter((empresa) =>
      empresa.nome.toLowerCase().includes(termo) || empresa.slug.toLowerCase().includes(termo),
    );
  }, [busca, empresas]);

  const iniciarAdmin = (empresa: Empresa) => {
    setEmpresaOnboarding(empresa);
    setAdminNome("");
    setAdminEmail("");
    setAdminTelefone("");
  };

  const criarPrimeiroAdmin = async () => {
    if (!empresaOnboarding) return;
    if (!adminNome.trim() || !adminEmail.trim()) {
      toast.error("Preencha nome e e-mail do administrador");
      return;
    }

    setSalvandoAdmin(true);
    try {
      const criado = await apiJson<UsuarioCriado>("/api/super-admin/usuarios", {
        method: "POST",
        body: JSON.stringify({
          nome: adminNome.trim(),
          email: adminEmail.trim(),
          telefone: adminTelefone.trim() || null,
          empresaId: empresaOnboarding.id,
          perfil: "ADMIN",
        }),
      });

      setAcessoCriado({
        empresa: empresaOnboarding,
        nome: adminNome.trim(),
        email: adminEmail.trim(),
        conviteEnviado: Boolean(criado.conviteEnviadoEm),
      });
      setEmpresaOnboarding(null);
      toast.success("Administrador criado e vinculado à empresa");
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o administrador");
    } finally {
      setSalvandoAdmin(false);
    }
  };

  if (usuario?.perfil !== "SUPER_ADMIN") {
    return (
      <PageShell>
        <PageHeader eyebrow="Administração" title="Acesso restrito" description="Este ambiente é exclusivo da administração da plataforma." />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Administração da plataforma"
        title="Empresas"
        description="Cadastre empresas, controle o status e entre no ambiente operacional de cada cliente."
        actions={
          <Button size="sm" onClick={() => setNovoAberto(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova empresa
          </Button>
        }
      />

      <Card className="border-border/70">
        <CardContent className="p-4">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por empresa ou slug..." className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtradas.map((empresa) => (
          <Card key={empresa.id} className="border-border/70">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{empresa.nome}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{empresa.slug}</div>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Badge variant={empresa.ativa ? "default" : "secondary"}>
                    {empresa.ativa ? "Ativa" : "Inativa"}
                  </Badge>
                  {empresa.ativa && (
                    empresa.administradoresAtivos > 0 ? (
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Pronta
                      </Badge>
                    ) : empresa.administradoresPendentes > 0 ? (
                      <Badge variant="secondary" className="bg-warning/15 text-warning-foreground">
                        <Mail className="mr-1 h-3 w-3" /> Aguardando ativação
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-warning/15 text-warning-foreground">
                        Sem administrador
                      </Badge>
                    )
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={!empresa.ativa}
                  onClick={() => {
                    selecionarEmpresa(empresa.id);
                    void navigate({ to: "/" });
                  }}
                >
                  Abrir ambiente
                </Button>
                {empresa.ativa
                  && empresa.administradoresAtivos === 0
                  && empresa.administradoresPendentes === 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => iniciarAdmin(empresa)}
                  >
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                    Criar administrador
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditando(empresa);
                    setNomeEdicao(empresa.nome);
                  }}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Renomear
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await apiJson<Empresa>(`/api/super-admin/empresas/${empresa.id}`, {
                        method: "PUT",
                        body: JSON.stringify({ nome: empresa.nome, ativa: !empresa.ativa }),
                      });
                      toast.success(empresa.ativa ? "Empresa desativada" : "Empresa ativada");
                      await carregar();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Não foi possível alterar o status");
                    }
                  }}
                >
                  {empresa.ativa ? <PowerOff className="mr-1.5 h-3.5 w-3.5" /> : <Power className="mr-1.5 h-3.5 w-3.5" />}
                  {empresa.ativa ? "Desativar" : "Ativar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!carregando && filtradas.length === 0 && (
        <Card className="border-border/70">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhuma empresa encontrada.</CardContent>
        </Card>
      )}

      <Dialog open={novoAberto} onOpenChange={setNovoAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova empresa</DialogTitle>
            <DialogDescription>Cria um novo ambiente de cliente no ImobControl.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Nome da empresa</Label>
            <Input value={novoNome} onChange={(event) => setNovoNome(event.target.value)} placeholder="Ex.: Empresa Líder" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNovoAberto(false)}>Cancelar</Button>
            <Button
              disabled={salvando || !novoNome.trim()}
              onClick={async () => {
                setSalvando(true);
                try {
                  const criada = await apiJson<Empresa>("/api/super-admin/empresas", {
                    method: "POST",
                    body: JSON.stringify({ nome: novoNome.trim() }),
                  });
                  toast.success("Empresa criada. Agora crie o primeiro administrador.");
                  setNovoNome("");
                  setNovoAberto(false);
                  iniciarAdmin(criada);
                  await carregar();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Não foi possível criar a empresa");
                } finally {
                  setSalvando(false);
                }
              }}
            >
              {salvando ? "Criando..." : "Criar empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(empresaOnboarding)}
        onOpenChange={(open) => {
          if (!open) setEmpresaOnboarding(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar primeiro administrador</DialogTitle>
            <DialogDescription>
              A empresa já foi criada. Agora defina quem administrará o ambiente da{" "}
              <strong>{empresaOnboarding?.nome}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-primary/15 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <div className="font-medium">ADMIN da empresa</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Este acesso terá controle total somente dentro desta empresa e poderá criar
                  funcionários com permissões específicas.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <Label>Nome do administrador</Label>
              <Input value={adminNome} onChange={(e) => setAdminNome(e.target.value)} />
            </div>
            <div>
              <Label>E-mail de acesso</Label>
              <Input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={adminTelefone}
                onChange={(e) => setAdminTelefone(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-xs leading-5 text-muted-foreground">
                  O administrador receberá um convite neste e-mail. Ele próprio confirmará o endereço
                  e criará a senha do primeiro acesso.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEmpresaOnboarding(null)}>
              Fazer depois
            </Button>
            <Button onClick={() => void criarPrimeiroAdmin()} disabled={salvandoAdmin}>
              {salvandoAdmin ? "Criando..." : "Criar administrador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(acessoCriado)}
        onOpenChange={(open) => {
          if (!open) setAcessoCriado(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Empresa pronta para operar</DialogTitle>
            <DialogDescription>
              O administrador foi criado e vinculado à {acessoCriado?.empresa.nome}.
            </DialogDescription>
          </DialogHeader>

          <div className={`rounded-lg border p-4 ${
            acessoCriado?.conviteEnviado
              ? "border-success/20 bg-success/5"
              : "border-warning/30 bg-warning/10"
          }`}>
            <div className="flex items-start gap-3">
              {acessoCriado?.conviteEnviado ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              ) : (
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground" />
              )}
              <div className="min-w-0">
                <div className="font-medium">{acessoCriado?.nome}</div>
                <div className="mt-1 text-sm text-muted-foreground">{acessoCriado?.email}</div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {acessoCriado?.conviteEnviado
                    ? "Convite enviado. O administrador criará a própria senha pelo link recebido."
                    : "A conta foi criada, mas o e-mail ainda não pôde ser enviado. O convite ficará pendente e poderá ser reenviado em Usuários e acessos."}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                if (!acessoCriado) return;
                selecionarEmpresa(acessoCriado.empresa.id);
                setAcessoCriado(null);
                void navigate({ to: "/" });
              }}
            >
              <Building2 className="mr-1.5 h-4 w-4" />
              Abrir ambiente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editando)} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear empresa</DialogTitle>
            <DialogDescription>Altera o nome exibido no ambiente operacional do cliente.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Nome da empresa</Label>
            <Input value={nomeEdicao} onChange={(event) => setNomeEdicao(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button
              disabled={salvando || !nomeEdicao.trim()}
              onClick={async () => {
                if (!editando) return;
                setSalvando(true);
                try {
                  await apiJson<Empresa>(`/api/super-admin/empresas/${editando.id}`, {
                    method: "PUT",
                    body: JSON.stringify({ nome: nomeEdicao.trim(), ativa: editando.ativa }),
                  });
                  toast.success("Empresa atualizada");
                  setEditando(null);
                  await carregar();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a empresa");
                } finally {
                  setSalvando(false);
                }
              }}
            >
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
