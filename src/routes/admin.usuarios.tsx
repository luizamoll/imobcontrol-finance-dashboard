import { createFileRoute } from "@tanstack/react-router";
import {
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/admin/usuarios")({
  component: AdminUsuariosPage,
  head: () => ({ meta: [{ title: "Usuários e acessos · Administração · ImobControl" }] }),
});

type Perfil = "SUPER_ADMIN" | "ADMIN" | "USUARIO";

type EmpresaResumo = {
  id: number;
  nome: string;
  slug: string;
};

type UsuarioAdmin = {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  perfil: Perfil;
  ativo: boolean;
  empresa: EmpresaResumo | null;
  versao: number;
  criadoEm: string;
  atualizadoEm: string;
};

type Pagina<T> = {
  content: T[];
  totalElements: number;
};

type Resumo = {
  total: number;
  ativos: number;
  inativos: number;
  administradores: number;
  usuariosOperacionais: number;
};

type FormUsuario = {
  nome: string;
  email: string;
  telefone: string;
  empresaId: string;
  perfil: "ADMIN" | "USUARIO";
  ativo: boolean;
  senha: string;
  versao: number | null;
};

function vazio(empresaId?: number): FormUsuario {
  return {
    nome: "",
    email: "",
    telefone: "",
    empresaId: empresaId ? String(empresaId) : "",
    perfil: "USUARIO",
    ativo: true,
    senha: "",
    versao: null,
  };
}

function AdminUsuariosPage() {
  const { usuario } = useAuth();
  const { empresas } = useTenant();

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

  return <PainelUsuarios empresas={empresas} />;
}

function PainelUsuarios({ empresas }: { empresas: EmpresaResumo[] }) {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [resumo, setResumo] = useState<Resumo>({
    total: 0,
    ativos: 0,
    inativos: 0,
    administradores: 0,
    usuariosOperacionais: 0,
  });
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState("todas");
  const [perfilFiltro, setPerfilFiltro] = useState("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");

  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null);
  const [form, setForm] = useState<FormUsuario>(() => vazio(empresas[0]?.id));
  const [salvando, setSalvando] = useState(false);

  const [senhaUsuario, setSenhaUsuario] = useState<UsuarioAdmin | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("pagina", "0");
    params.set("tamanho", "200");
    if (empresaFiltro !== "todas") params.set("empresaId", empresaFiltro);
    if (perfilFiltro !== "todos") params.set("perfil", perfilFiltro);
    if (statusFiltro !== "todos") params.set("ativo", statusFiltro === "ativos" ? "true" : "false");
    if (busca.trim()) params.set("busca", busca.trim());
    return params.toString();
  }, [busca, empresaFiltro, perfilFiltro, statusFiltro]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [pagina, indicadores] = await Promise.all([
        apiJson<Pagina<UsuarioAdmin>>(`/api/super-admin/usuarios?${query}`),
        apiJson<Resumo>("/api/super-admin/usuarios/resumo"),
      ]);
      setUsuarios(pagina.content);
      setResumo(indicadores);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar os usuários");
    } finally {
      setCarregando(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void carregar(), 250);
    return () => window.clearTimeout(timer);
  }, [carregar]);

  const abrirNovo = () => {
    setEditando(null);
    setForm(vazio(empresas[0]?.id));
    setDialogAberto(true);
  };

  const abrirEdicao = (alvo: UsuarioAdmin) => {
    if (alvo.perfil === "SUPER_ADMIN") return;
    setEditando(alvo);
    setForm({
      nome: alvo.nome,
      email: alvo.email,
      telefone: alvo.telefone ?? "",
      empresaId: alvo.empresa ? String(alvo.empresa.id) : "",
      perfil: alvo.perfil as "ADMIN" | "USUARIO",
      ativo: alvo.ativo,
      senha: "",
      versao: alvo.versao,
    });
    setDialogAberto(true);
  };

  const salvar = async () => {
    if (!form.nome.trim() || !form.email.trim() || !form.empresaId) {
      toast.error("Preencha nome, e-mail e empresa");
      return;
    }

    if (!editando && form.senha.length < 8) {
      toast.error("A senha inicial deve ter pelo menos 8 caracteres");
      return;
    }

    setSalvando(true);
    try {
      if (editando) {
        await apiJson<UsuarioAdmin>(`/api/super-admin/usuarios/${editando.id}`, {
          method: "PUT",
          body: JSON.stringify({
            nome: form.nome.trim(),
            email: form.email.trim(),
            telefone: form.telefone.trim() || null,
            empresaId: Number(form.empresaId),
            perfil: form.perfil,
            ativo: form.ativo,
            versao: form.versao,
          }),
        });
        toast.success("Usuário atualizado");
      } else {
        await apiJson<UsuarioAdmin>("/api/super-admin/usuarios", {
          method: "POST",
          body: JSON.stringify({
            nome: form.nome.trim(),
            email: form.email.trim(),
            telefone: form.telefone.trim() || null,
            empresaId: Number(form.empresaId),
            perfil: form.perfil,
            senha: form.senha,
          }),
        });
        toast.success("Usuário criado");
      }

      setDialogAberto(false);
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o usuário");
      if ((error as Error & { status?: number })?.status === 409) {
        await carregar();
      }
    } finally {
      setSalvando(false);
    }
  };

  const redefinirSenha = async () => {
    if (!senhaUsuario) return;
    if (novaSenha.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres");
      return;
    }

    setSalvandoSenha(true);
    try {
      await apiJson<void>(`/api/super-admin/usuarios/${senhaUsuario.id}/senha`, {
        method: "POST",
        body: JSON.stringify({ senha: novaSenha }),
      });
      toast.success("Senha redefinida");
      setSenhaUsuario(null);
      setNovaSenha("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível redefinir a senha");
    } finally {
      setSalvandoSenha(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Administração geral"
        title="Usuários e acessos"
        description="Crie contas, vincule usuários às empresas, defina papéis, status e redefina senhas."
        actions={
          <Button size="sm" onClick={abrirNovo} disabled={empresas.length === 0}>
            <Plus className="mr-2 h-4 w-4" /> Novo usuário
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <ResumoCard label="Total de usuários" value={resumo.total} />
        <ResumoCard label="Ativos" value={resumo.ativos} />
        <ResumoCard label="Inativos" value={resumo.inativos} />
        <ResumoCard label="Admins de empresa" value={resumo.administradores} />
        <ResumoCard label="Usuários operacionais" value={resumo.usuariosOperacionais} />
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Hierarquia de acesso</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Nivel
            icon={ShieldCheck}
            titulo="SUPER_ADMIN"
            descricao="Administração geral do ImobControl. Enxerga empresas e controla os demais usuários."
          />
          <Nivel
            icon={UserCog}
            titulo="ADMIN"
            descricao="Administrador de uma empresa. Atua somente dentro da própria empresa."
          />
          <Nivel
            icon={Users}
            titulo="USUARIO"
            descricao="Usuário operacional da empresa, sem acesso ao painel administrativo geral."
          />
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Label>Buscar</Label>
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome ou e-mail"
            />
          </div>
          <div>
            <Label>Empresa</Label>
            <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {empresas.map((empresa) => (
                  <SelectItem key={empresa.id} value={String(empresa.id)}>
                    {empresa.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Perfil</Label>
            <Select value={perfilFiltro} onValueChange={setPerfilFiltro}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="USUARIO">USUARIO</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Hierarquia</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Carregando usuários...
                  </TableCell>
                </TableRow>
              ) : usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                usuarios.map((alvo) => (
                  <TableRow key={alvo.id}>
                    <TableCell>
                      <div className="font-medium">{alvo.nome}</div>
                      <div className="text-xs text-muted-foreground">{alvo.email}</div>
                    </TableCell>
                    <TableCell className="text-sm">{alvo.empresa?.nome ?? "Sistema"}</TableCell>
                    <TableCell><PerfilBadge perfil={alvo.perfil} /></TableCell>
                    <TableCell>
                      <Badge variant={alvo.ativo ? "secondary" : "outline"}>
                        {alvo.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {alvo.perfil === "SUPER_ADMIN" ? (
                        <span className="text-xs text-muted-foreground">Conta protegida</span>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => abrirEdicao(alvo)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSenhaUsuario(alvo);
                              setNovaSenha("");
                            }}
                          >
                            <KeyRound className="mr-1 h-3.5 w-3.5" /> Senha
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando}>
          <RefreshCw className={`mr-2 h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar usuário" : "Novo usuário"}</DialogTitle>
            <DialogDescription>
              A hierarquia SUPER_ADMIN é protegida e não pode ser atribuída por este painel.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label>E-mail de acesso</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Telefone</Label>
              <Input
                value={form.telefone}
                onChange={(e) => setForm((s) => ({ ...s, telefone: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            <div>
              <Label>Empresa</Label>
              <Select
                value={form.empresaId}
                onValueChange={(value) => setForm((s) => ({ ...s, empresaId: value }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={String(empresa.id)}>
                      {empresa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hierarquia</Label>
              <Select
                value={form.perfil}
                onValueChange={(value) =>
                  setForm((s) => ({ ...s, perfil: value as "ADMIN" | "USUARIO" }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">ADMIN · administrador da empresa</SelectItem>
                  <SelectItem value="USUARIO">USUARIO · operacional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!editando && (
              <div className="sm:col-span-2">
                <Label>Senha inicial</Label>
                <Input
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm((s) => ({ ...s, senha: e.target.value }))}
                  placeholder="Mínimo de 8 caracteres"
                />
              </div>
            )}

            {editando && (
              <div className="sm:col-span-2">
                <Label>Status de acesso</Label>
                <Select
                  value={form.ativo ? "ativo" : "inativo"}
                  onValueChange={(value) =>
                    setForm((s) => ({ ...s, ativo: value === "ativo" }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo · pode acessar</SelectItem>
                    <SelectItem value="inativo">Inativo · acesso bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button onClick={() => void salvar()} disabled={salvando}>
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(senhaUsuario)}
        onOpenChange={(open) => {
          if (!open) {
            setSenhaUsuario(null);
            setNovaSenha("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para {senhaUsuario?.nome}. A senha atual não é exibida.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Nova senha</Label>
            <Input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Mínimo de 8 caracteres"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSenhaUsuario(null)}>Cancelar</Button>
            <Button onClick={() => void redefinirSenha()} disabled={salvandoSenha}>
              {salvandoSenha ? "Salvando..." : "Redefinir senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function ResumoCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Nivel({
  icon: Icon,
  titulo,
  descricao,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="font-semibold">{titulo}</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{descricao}</p>
    </div>
  );
}

function PerfilBadge({ perfil }: { perfil: Perfil }) {
  if (perfil === "SUPER_ADMIN") return <Badge>SUPER_ADMIN</Badge>;
  if (perfil === "ADMIN") return <Badge variant="secondary">ADMIN</Badge>;
  return <Badge variant="outline">USUARIO</Badge>;
}
