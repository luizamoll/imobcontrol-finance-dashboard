import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Building2,
  ScrollText,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "Administração · ImobControl" }] }),
});

type EmpresaResumo = { id: number; nome: string; slug: string; ativa?: boolean };
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
  const { selecionarEmpresa } = useTenant();
  const [empresas, setEmpresas] = useState<EmpresaResumo[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [saude, setSaude] = useState<"UP" | "DOWN" | "CHECKING">("CHECKING");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (usuario?.perfil !== "SUPER_ADMIN") {
      setCarregando(false);
      return;
    }

    let cancelado = false;
    void Promise.all([
      apiJson<EmpresaResumo[]>("/api/super-admin/empresas"),
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
        title="Visão geral"
        description="Seu console para acompanhar empresas, acessos, segurança e atividade do ImobControl."
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <Stat icon={Building2} label="Empresas ativas" value={carregando ? "—" : String(empresas.length)} />
        <Stat icon={Users} label="Usuários" value={carregando ? "—" : String(resumo?.total ?? 0)} />
        <Stat icon={ShieldCheck} label="Usuários ativos" value={carregando ? "—" : String(resumo?.ativos ?? 0)} />
        <Stat icon={UserCog} label="Admins de empresa" value={carregando ? "—" : String(resumo?.administradores ?? 0)} />
        <Stat icon={Activity} label="Plataforma" value={saude === "CHECKING" ? "Verificando" : saude === "UP" ? "Online" : "Atenção"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-border/70">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Empresas</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Acesso rápido aos ambientes dos clientes.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/empresas">Gerenciar empresas</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {empresas.slice(0, 5).map((empresa) => (
              <div key={empresa.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{empresa.nome}</div>
                  <div className="truncate text-xs text-muted-foreground">{empresa.slug}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    selecionarEmpresa(empresa.id);
                    void navigate({ to: "/" });
                  }}
                >
                  Abrir ambiente
                </Button>
              </div>
            ))}
            {!carregando && empresas.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma empresa ativa cadastrada.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Ações administrativas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickAction icon={Building2} title="Empresas" description="Criar, renomear, ativar e acessar ambientes." to="/admin/empresas" />
            <QuickAction icon={Users} title="Usuários e acessos" description="Gerenciar contas, papéis e senhas." to="/admin/usuarios" />
            <QuickAction icon={ScrollText} title="Auditoria" description="Ver quem alterou o quê e quando." to="/admin/auditoria" />
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

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <div className="mt-2 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function QuickAction({ icon: Icon, title, description, to }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  to: "/admin/empresas" | "/admin/usuarios" | "/admin/auditoria";
}) {
  return (
    <Button asChild variant="outline" className="h-auto w-full justify-start gap-3 p-4 text-left">
      <Link to={to}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-0.5 text-xs font-normal text-muted-foreground">{description}</div>
        </div>
      </Link>
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
