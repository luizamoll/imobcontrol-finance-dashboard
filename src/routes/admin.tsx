import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Pencil,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "Administração · ImobControl" }] }),
});

type EmpresaResumo = {
  id: number;
  nome: string;
  slug: string;
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
  const { selecionarEmpresa } = useTenant();
  const [empresas, setEmpresas] = useState<EmpresaResumo[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [empresaEditando, setEmpresaEditando] = useState<EmpresaResumo | null>(null);
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);

  useEffect(() => {
    if (usuario?.perfil !== "SUPER_ADMIN") {
      setCarregando(false);
      return;
    }

    let cancelado = false;
    void Promise.all([
      apiJson<EmpresaResumo[]>("/api/super-admin/empresas"),
      apiJson<Resumo>("/api/super-admin/usuarios/resumo"),
    ])
      .then(([listaEmpresas, indicadores]) => {
        if (cancelado) return;
        setEmpresas(listaEmpresas);
        setResumo(indicadores);
      })
      .catch((error) => {
        if (!cancelado) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar a administração",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [usuario]);

  if (usuario?.perfil !== "SUPER_ADMIN") {
    return (
      <PageShell>
        <PageHeader
          eyebrow="Administração"
          title="Acesso restrito"
          description="Este painel é exclusivo da administração geral do ImobControl."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Administração geral"
        title="Painel de controle"
        description="Visão geral das empresas e da hierarquia de usuários do ImobControl."
        actions={
          <Button asChild size="sm">
            <Link to="/admin/usuarios">
              <Users className="mr-2 h-4 w-4" /> Gerenciar usuários
            </Link>
          </Button>
        }
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">Área exclusiva da SUPER_ADMIN</div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Esta área não aparece para administradores de empresas nem para usuários operacionais.
                O acesso também é bloqueado no servidor.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat icon={Building2} label="Empresas ativas" value={carregando ? "—" : String(empresas.length)} />
        <Stat icon={Users} label="Usuários" value={carregando ? "—" : String(resumo?.total ?? 0)} />
        <Stat icon={UserRound} label="Ativos" value={carregando ? "—" : String(resumo?.ativos ?? 0)} />
        <Stat icon={UserCog} label="Admins de empresa" value={carregando ? "—" : String(resumo?.administradores ?? 0)} />
        <Stat icon={Users} label="Operacionais" value={carregando ? "—" : String(resumo?.usuariosOperacionais ?? 0)} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-border/70 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Empresas com acesso ao ImobControl</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {carregando ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Carregando empresas...
              </p>
            ) : empresas.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma empresa ativa cadastrada.
              </p>
            ) : (
              empresas.map((empresa) => (
                <div
                  key={empresa.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{empresa.nome}</div>
                      <div className="text-xs text-muted-foreground">{empresa.slug}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEmpresaEditando(empresa);
                        setNomeEmpresa(empresa.nome);
                      }}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Renomear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        selecionarEmpresa(empresa.id);
                        void navigate({ to: "/" });
                      }}
                    >
                      Abrir ambiente
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Hierarquia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <HierarchyRow
              level="1"
              title="SUPER_ADMIN"
              description="Você controla empresas e usuários."
            />
            <HierarchyRow
              level="2"
              title="ADMIN"
              description="Administra somente a própria empresa."
            />
            <HierarchyRow
              level="3"
              title="USUARIO"
              description="Acesso operacional dentro da empresa."
            />
          </CardContent>
        </Card>
      </div>
      <Dialog
        open={Boolean(empresaEditando)}
        onOpenChange={(open) => {
          if (!open) {
            setEmpresaEditando(null);
            setNomeEmpresa("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear empresa</DialogTitle>
            <DialogDescription>
              Este é o nome exibido no ambiente operacional do cliente.
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label>Nome da empresa</Label>
            <Input
              value={nomeEmpresa}
              onChange={(event) => setNomeEmpresa(event.target.value)}
              placeholder="Ex.: Empresa Líder"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEmpresaEditando(null)}>
              Cancelar
            </Button>
            <Button
              disabled={salvandoEmpresa || !nomeEmpresa.trim()}
              onClick={async () => {
                if (!empresaEditando) return;
                setSalvandoEmpresa(true);
                try {
                  await apiJson<EmpresaResumo>(
                    `/api/super-admin/empresas/${empresaEditando.id}`,
                    {
                      method: "PUT",
                      body: JSON.stringify({ nome: nomeEmpresa.trim() }),
                    },
                  );
                  toast.success("Nome da empresa atualizado");
                  window.location.reload();
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Não foi possível atualizar a empresa",
                  );
                } finally {
                  setSalvandoEmpresa(false);
                }
              }}
            >
              {salvandoEmpresa ? "Salvando..." : "Salvar nome"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </PageShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
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

function HierarchyRow({
  level,
  title,
  description,
}: {
  level: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-border/70 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {level}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
