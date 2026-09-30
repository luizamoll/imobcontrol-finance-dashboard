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
import { formatCNPJ } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/admin/empresas")({
  validateSearch: (search: Record<string, unknown>) => {
    const editarRaw = Number(search.editar);
    return {
      nova: search.nova === "1" || search.nova === 1 || search.nova === true,
      editar: Number.isFinite(editarRaw) && editarRaw > 0 ? editarRaw : null,
    };
  },
  component: AdminEmpresasPage,
  head: () => ({ meta: [{ title: "Empresas · Administração · ImobControl" }] }),
});

type Empresa = {
  id: number;
  nome: string;
  slug: string;
  razaoSocial: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
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
  const { nova, editar } = Route.useSearch();
  const { usuario } = useAuth();
  const { entrarModoCliente } = useTenant();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [novoNome, setNovoNome] = useState("");
  const [novaRazaoSocial, setNovaRazaoSocial] = useState("");
  const [novoCnpj, setNovoCnpj] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [razaoEdicao, setRazaoEdicao] = useState("");
  const [cnpjEdicao, setCnpjEdicao] = useState("");
  const [emailEdicao, setEmailEdicao] = useState("");
  const [telefoneEdicao, setTelefoneEdicao] = useState("");
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
    if (!nova) return;
    window.setTimeout(() => {
      document.getElementById("cadastro-empresa")?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("nova-empresa-inline")?.focus();
    }, 50);
  }, [nova]);

  useEffect(() => {
    if (editar == null || empresas.length === 0 || editando) return;
    const empresa = empresas.find((item) => item.id === editar);
    if (empresa) abrirEdicao(empresa);
  }, [editar, empresas, editando]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return empresas;
    return empresas.filter((empresa) =>
      empresa.nome.toLowerCase().includes(termo) || empresa.slug.toLowerCase().includes(termo),
    );
  }, [busca, empresas]);

  const criarEmpresa = async () => {
    const nome = novoNome.trim();
    if (!nome) {
      toast.error("Informe o nome da empresa");
      return;
    }

    setSalvando(true);
    try {
      const criada = await apiJson<Empresa>("/api/super-admin/empresas", {
        method: "POST",
        body: JSON.stringify({
          nome,
          razaoSocial: novaRazaoSocial.trim() || null,
          cnpj: novoCnpj.trim() || null,
          email: novoEmail.trim() || null,
          telefone: novoTelefone.trim() || null,
        }),
      });
      setEmpresas((atuais) => {
        const semDuplicar = atuais.filter((empresa) => empresa.id !== criada.id);
        return [...semDuplicar, criada].sort((a, b) => a.nome.localeCompare(b.nome));
      });
      toast.success("Empresa criada. Agora crie o primeiro administrador.");
      setNovoNome("");
      setNovaRazaoSocial("");
      setNovoCnpj("");
      setNovoEmail("");
      setNovoTelefone("");
      iniciarAdmin(criada);
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a empresa");
    } finally {
      setSalvando(false);
    }
  };

  const abrirEdicao = (empresa: Empresa) => {
    setEditando(empresa);
    setNomeEdicao(empresa.nome);
    setRazaoEdicao(empresa.razaoSocial ?? "");
    setCnpjEdicao(empresa.cnpj ? formatCNPJ(empresa.cnpj) : "");
    setEmailEdicao(empresa.email ?? "");
    setTelefoneEdicao(empresa.telefone ?? "");
  };

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
          <Button asChild size="sm">
            <a href="#cadastro-empresa">
              <Plus className="mr-2 h-4 w-4" /> Nova empresa
            </a>
          </Button>
        }
      />

      <Card id="cadastro-empresa" className="scroll-mt-24 border-primary/20 bg-primary/[0.03]">
        <CardContent className="p-5">
          <div className="mb-4">
            <div className="text-sm font-semibold">Dados da empresa</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Estes dados pertencem à empresa cliente. O administrador responsável é cadastrado separadamente na etapa seguinte.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="nova-empresa-inline">Nome fantasia</Label>
              <Input
                id="nova-empresa-inline"
                value={novoNome}
                onChange={(event) => setNovoNome(event.target.value)}
                placeholder="Ex.: Líder"
                autoComplete="organization"
              />
            </div>
            <div>
              <Label>Razão social</Label>
              <Input
                value={novaRazaoSocial}
                onChange={(event) => setNovaRazaoSocial(event.target.value)}
                placeholder="Razão social da empresa"
              />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input
                value={novoCnpj}
                onChange={(event) => setNovoCnpj(formatCNPJ(event.target.value))}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div>
              <Label>Telefone da empresa</Label>
              <Input
                value={novoTelefone}
                onChange={(event) => setNovoTelefone(event.target.value)}
                placeholder="Contato comercial"
              />
            </div>
            <div className="md:col-span-2">
              <Label>E-mail da empresa</Label>
              <Input
                type="email"
                value={novoEmail}
                onChange={(event) => setNovoEmail(event.target.value)}
                placeholder="contato@empresa.com.br"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              disabled={salvando || !novoNome.trim()}
              onClick={() => void criarEmpresa()}
            >
              <Plus className="mr-2 h-4 w-4" />
              {salvando ? "Criando..." : "Criar empresa e continuar"}
            </Button>
          </div>
        </CardContent>
      </Card>

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
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {empresa.razaoSocial || empresa.slug}
                    </div>
                    {empresa.cnpj && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        CNPJ {formatCNPJ(empresa.cnpj)}
                      </div>
                    )}
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
                    entrarModoCliente(empresa.id);
                    void navigate({ to: "/" });
                  }}
                >
                  Ver como ADMIN
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
                  onClick={() => abrirEdicao(empresa)}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar cadastro
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
          <CardContent className="py-10 text-center">
            <div className="text-sm font-medium text-foreground">Nenhuma empresa cadastrada ainda.</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Use o campo “Cadastrar empresa” acima para criar a primeira.
            </p>
          </CardContent>
        </Card>
      )}

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
                entrarModoCliente(acessoCriado.empresa.id);
                setAcessoCriado(null);
                void navigate({ to: "/" });
              }}
            >
              <Building2 className="mr-1.5 h-4 w-4" />
              Ver como ADMIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editando)} onOpenChange={(open) => !open && setEditando(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar cadastro da empresa</DialogTitle>
            <DialogDescription>
              Altere os dados da empresa cliente. Estes campos são independentes dos dados pessoais do administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Nome fantasia</Label>
              <Input value={nomeEdicao} onChange={(event) => setNomeEdicao(event.target.value)} />
            </div>
            <div>
              <Label>Razão social</Label>
              <Input value={razaoEdicao} onChange={(event) => setRazaoEdicao(event.target.value)} />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input
                value={cnpjEdicao}
                onChange={(event) => setCnpjEdicao(formatCNPJ(event.target.value))}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div>
              <Label>Telefone da empresa</Label>
              <Input value={telefoneEdicao} onChange={(event) => setTelefoneEdicao(event.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>E-mail da empresa</Label>
              <Input
                type="email"
                value={emailEdicao}
                onChange={(event) => setEmailEdicao(event.target.value)}
              />
            </div>
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
                    body: JSON.stringify({
                      nome: nomeEdicao.trim(),
                      razaoSocial: razaoEdicao.trim() || null,
                      cnpj: cnpjEdicao.trim() || null,
                      email: emailEdicao.trim() || null,
                      telefone: telefoneEdicao.trim() || null,
                      ativa: editando.ativa,
                    }),
                  });
                  toast.success("Cadastro da empresa atualizado");
                  setEditando(null);
                  await carregar();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a empresa");
                } finally {
                  setSalvando(false);
                }
              }}
            >
              {salvando ? "Salvando..." : "Salvar cadastro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
