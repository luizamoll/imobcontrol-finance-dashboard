import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Building2,
  ScrollText,
  Pencil,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiJson } from "@/lib/api";
import { formatCNPJ } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "Administração · ImobControl" }] }),
});

type EmpresaResumo = {
  id: number;
  nome: string;
  slug: string;
  razaoSocial?: string | null;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  ativa?: boolean;
  administradoresAtivos?: number;
  administradoresPendentes?: number;
  clientesCadastrados?: number;
};
type Resumo = {
  total: number;
  ativos: number;
  inativos: number;
  administradores: number;
  usuariosOperacionais: number;
};

function AdminDashboard() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { entrarModoCliente } = useTenant();
  const [empresas, setEmpresas] = useState<EmpresaResumo[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [saude, setSaude] = useState<"UP" | "DOWN" | "CHECKING">("CHECKING");
  const [carregando, setCarregando] = useState(true);
  const [novaEmpresaNome, setNovaEmpresaNome] = useState("");
  const [novaEmpresaRazao, setNovaEmpresaRazao] = useState("");
  const [novaEmpresaCnpj, setNovaEmpresaCnpj] = useState("");
  const [novaEmpresaEmail, setNovaEmpresaEmail] = useState("");
  const [novaEmpresaTelefone, setNovaEmpresaTelefone] = useState("");
  const [criandoEmpresa, setCriandoEmpresa] = useState(false);

  async function criarPrimeiraEmpresa() {
    const nome = novaEmpresaNome.trim();
    if (!nome) {
      toast.error("Informe o nome da empresa");
      return;
    }

    setCriandoEmpresa(true);
    try {
      const criada = await apiJson<EmpresaResumo>("/api/super-admin/empresas", {
        method: "POST",
        body: JSON.stringify({
          nome,
          razaoSocial: novaEmpresaRazao.trim() || null,
          cnpj: novaEmpresaCnpj.trim() || null,
          email: novaEmpresaEmail.trim() || null,
          telefone: novaEmpresaTelefone.trim() || null,
        }),
      });

      setEmpresas((atuais) => {
        const semDuplicar = atuais.filter((empresa) => empresa.id !== criada.id);
        return [...semDuplicar, criada].sort((a, b) => a.nome.localeCompare(b.nome));
      });
      setNovaEmpresaNome("");
      setNovaEmpresaRazao("");
      setNovaEmpresaCnpj("");
      setNovaEmpresaEmail("");
      setNovaEmpresaTelefone("");
      toast.success(`Empresa ${criada.nome} criada com sucesso`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a empresa");
    } finally {
      setCriandoEmpresa(false);
    }
  }

  const empresasAtivas = empresas.filter((empresa) => empresa.ativa !== false);
  const totalClientes = empresas.reduce(
    (total, empresa) => total + (empresa.clientesCadastrados ?? 0),
    0,
  );

  useEffect(() => {
    if (usuario?.perfil !== "SUPER_ADMIN") {
      setCarregando(false);
      return;
    }

    let cancelado = false;
    void Promise.all([
      apiJson<EmpresaResumo[]>("/api/super-admin/empresas?incluirInativas=true"),
      apiJson<Resumo>("/api/super-admin/usuarios/resumo"),
      fetch("/actuator/health", { credentials: "include" })
        .then(async (response) => response.ok ? await response.json() : { status: "DOWN" })
        .catch(() => ({ status: "DOWN" })),
    ])
      .then(([listaEmpresas, indicadores, health]) => {
        if (cancelado) return;
        setEmpresas(listaEmpresas);
        setResumo(indicadores);
        setSaude(health.status === "UP" ? "UP" : "DOWN");
      })
      .catch((error) => {
        if (!cancelado) {
          toast.error(error instanceof Error ? error.message : "Não foi possível carregar a administração");
          setSaude("DOWN");
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => { cancelado = true; };
  }, [usuario]);

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

  return (
    <PageShell>
      <PageHeader
        eyebrow="Administração da plataforma"
        title="Central de controle"
        description="Acompanhe sua base de clientes, empresas, acessos e saúde do ImobControl sem precisar entrar em cada ambiente."
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          icon={Users}
          label="Clientes cadastrados"
          value={carregando ? "—" : String(totalClientes)}
          detail="Base usada para acompanhar sua cobrança"
        />
        <Stat
          icon={Building2}
          label="Empresas ativas"
          value={carregando ? "—" : String(empresasAtivas.length)}
          detail={`${empresas.length} ambiente(s) no total`}
        />
        <Stat
          icon={ShieldCheck}
          label="Usuários ativos"
          value={carregando ? "—" : String(resumo?.ativos ?? 0)}
          detail={`${resumo?.administradores ?? 0} administrador(es) de empresa`}
        />
        <Stat
          icon={Activity}
          label="Plataforma"
          value={saude === "CHECKING" ? "Verificando" : saude === "UP" ? "Online" : "Atenção"}
          detail="Status geral da API"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Base por empresa</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Veja quantos clientes cada empresa possui e acesse rapidamente o ambiente correspondente.</p>
            </div>
            {empresas.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.assign("/admin/empresas")}
              >
                Gerenciar empresas
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {empresas.slice(0, 5).map((empresa) => (
              <div key={empresa.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-medium">{empresa.nome}</div>
                    {empresa.ativa === false && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        Inativa
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <strong className="text-foreground">{empresa.clientesCadastrados ?? 0}</strong>{" "}
                    cliente(s) cadastrado(s)
                    <span className="mx-1.5">·</span>
                    {empresa.slug}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.location.assign(`/admin/empresas?editar=${empresa.id}`)}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Editar empresa
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      entrarModoCliente(empresa.id);
                      void navigate({ to: "/equipe" });
                    }}
                  >
                    Colaboradores
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      entrarModoCliente(empresa.id);
                      void navigate({ to: "/" });
                    }}
                  >
                    Ver como ADMIN
                  </Button>
                </div>
              </div>
            ))}
            {!carregando && empresas.length === 0 && (
              <form
                className="rounded-xl border border-primary/20 bg-primary/[0.03] p-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void criarPrimeiraEmpresa();
                }}
              >
                <div className="text-left">
                  <div className="text-sm font-semibold text-foreground">
                    Cadastre a primeira empresa
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Crie primeiro o ambiente da empresa. O administrador e os demais acessos vêm na etapa seguinte.
                  </p>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="text-left">
                    <Label htmlFor="primeira-empresa">Nome fantasia</Label>
                    <Input
                      id="primeira-empresa"
                      value={novaEmpresaNome}
                      onChange={(event) => setNovaEmpresaNome(event.target.value)}
                      placeholder="Ex.: Líder"
                      autoComplete="organization"
                    />
                  </div>
                  <div className="text-left">
                    <Label>Razão social</Label>
                    <Input
                      value={novaEmpresaRazao}
                      onChange={(event) => setNovaEmpresaRazao(event.target.value)}
                      placeholder="Razão social da empresa"
                    />
                  </div>
                  <div className="text-left">
                    <Label>CNPJ</Label>
                    <Input
                      value={novaEmpresaCnpj}
                      onChange={(event) => setNovaEmpresaCnpj(formatCNPJ(event.target.value))}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div className="text-left">
                    <Label>Telefone</Label>
                    <Input
                      value={novaEmpresaTelefone}
                      onChange={(event) => setNovaEmpresaTelefone(event.target.value)}
                      placeholder="Contato comercial"
                    />
                  </div>
                  <div className="text-left md:col-span-2">
                    <Label>E-mail da empresa</Label>
                    <Input
                      type="email"
                      value={novaEmpresaEmail}
                      onChange={(event) => setNovaEmpresaEmail(event.target.value)}
                      placeholder="contato@empresa.com.br"
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={criandoEmpresa || !novaEmpresaNome.trim()}
                      className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {criandoEmpresa ? "Criando..." : "Criar empresa"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Atalhos de gestão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickAction
              icon={Building2}
              title="Empresas"
              description="Criar, renomear, ativar e acessar ambientes."
              onClick={() => window.location.assign("/admin/empresas")}
            />
            <QuickAction
              icon={Users}
              title="Usuários e acessos"
              description="Gerenciar contas, papéis e senhas."
              onClick={() => window.location.assign("/admin/usuarios")}
            />
            <QuickAction
              icon={ScrollText}
              title="Auditoria"
              description="Ver quem alterou o quê e quando."
              onClick={() => window.location.assign("/admin/auditoria")}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Saúde da plataforma</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <HealthItem label="API Java" ok={saude === "UP"} detail="Servidor de regras e autenticação" />
          <HealthItem label="PostgreSQL" ok={saude === "UP"} detail="Banco compartilhado de produção" />
          <HealthItem label="Sessões" ok={saude === "UP"} detail="Persistidas no banco para escalar" />
        </CardContent>
      </Card>
    </PageShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <div className="mt-2 text-2xl font-semibold">{value}</div>
        {detail && <div className="mt-1 text-xs text-muted-foreground">{detail}</div>}
      </CardContent>
    </Card>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto w-full justify-start gap-3 p-4 text-left"
      onClick={onClick}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-0.5 text-xs font-normal text-muted-foreground">{description}</div>
      </div>
    </Button>
  );
}

function HealthItem({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="rounded-lg border border-border/70 p-4">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}
