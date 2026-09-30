import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Mail, Pencil, Plus, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  GRUPOS_PERMISSOES,
  PRESETS_PERMISSOES,
  temPermissao,
  type PermissaoUsuario,
} from "@/lib/permissoes";

export const Route = createFileRoute("/equipe")({
  component: EquipePage,
  head: () => ({ meta: [{ title: "Equipe e acessos · ImobControl" }] }),
});

type UsuarioEquipe = {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  perfil: "USUARIO";
  ativo: boolean;
  emailVerificado: boolean;
  senhaDefinida: boolean;
  conviteEnviadoEm: string | null;
  permissoes: PermissaoUsuario[];
  versao: number;
};

type Pagina<T> = {
  content: T[];
  totalElements: number;
};

type FormEquipe = {
  nome: string;
  email: string;
  telefone: string;
  ativo: boolean;
  permissoes: PermissaoUsuario[];
  versao: number | null;
};

function vazio(): FormEquipe {
  return {
    nome: "",
    email: "",
    telefone: "",
    ativo: true,
    permissoes: [],
    versao: null,
  };
}

function EquipePage() {
  const { usuario } = useAuth();
  const { empresaAtualId, empresaAtual, modoCliente } = useTenant();

  const podeGerenciar =
    usuario?.perfil === "SUPER_ADMIN"
      ? modoCliente && empresaAtualId != null
      : temPermissao(usuario, "EQUIPE_GERENCIAR");

  if (!podeGerenciar || empresaAtualId == null) {
    return (
      <PageShell>
        <PageHeader
          eyebrow="Gestão da empresa"
          title="Acesso restrito"
          description="Seu perfil não possui permissão para gerenciar equipe e acessos."
        />
      </PageShell>
    );
  }

  return (
    <PainelEquipe
      empresaId={empresaAtualId}
      empresaNome={empresaAtual?.nome ?? usuario?.empresa?.nome ?? "Empresa"}
    />
  );
}

function PainelEquipe({
  empresaId,
  empresaNome,
}: {
  empresaId: number;
  empresaNome: string;
}) {
  const { usuario } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioEquipe[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<UsuarioEquipe | null>(null);
  const [form, setForm] = useState<FormEquipe>(vazio());
  const [salvando, setSalvando] = useState(false);
  const [senhaUsuario, setSenhaUsuario] = useState<UsuarioEquipe | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("pagina", "0");
    params.set("tamanho", "200");
    if (busca.trim()) params.set("busca", busca.trim());
    if (status !== "todos") params.set("ativo", status === "ativos" ? "true" : "false");
    return params.toString();
  }, [busca, status]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const pagina = await apiJson<Pagina<UsuarioEquipe>>(
        `/api/empresa/usuarios?${query}`,
        { empresaId },
      );
      setUsuarios(pagina.content);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar a equipe");
    } finally {
      setCarregando(false);
    }
  }, [empresaId, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void carregar(), 200);
    return () => window.clearTimeout(timer);
  }, [carregar]);

  const abrirNovo = () => {
    setEditando(null);
    setForm(vazio());
    setDialogAberto(true);
  };

  const abrirEdicao = (alvo: UsuarioEquipe) => {
    setEditando(alvo);
    setForm({
      nome: alvo.nome,
      email: alvo.email,
      telefone: alvo.telefone ?? "",
      ativo: alvo.ativo,
      permissoes: [...(alvo.permissoes ?? [])],
      versao: alvo.versao,
    });
    setDialogAberto(true);
  };

  const salvar = async () => {
    if (!form.nome.trim() || !form.email.trim()) {
      toast.error("Preencha nome e e-mail");
      return;
    }
    setSalvando(true);
    try {
      if (editando) {
        await apiJson<UsuarioEquipe>(`/api/empresa/usuarios/${editando.id}`, {
          method: "PUT",
          empresaId,
          body: JSON.stringify({
            nome: form.nome.trim(),
            email: form.email.trim(),
            telefone: form.telefone.trim() || null,
            ativo: form.ativo,
            permissoes: form.permissoes,
            versao: form.versao,
          }),
        });
        toast.success("Funcionário atualizado");
      } else {
        await apiJson<UsuarioEquipe>("/api/empresa/usuarios", {
          method: "POST",
          empresaId,
          body: JSON.stringify({
            nome: form.nome.trim(),
            email: form.email.trim(),
            telefone: form.telefone.trim() || null,
            permissoes: form.permissoes,
          }),
        });
        toast.success("Funcionário criado. O convite de primeiro acesso foi preparado.");
      }

      setDialogAberto(false);
      await carregar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o funcionário");
      if ((error as Error & { status?: number })?.status === 409) await carregar();
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
      await apiJson<void>(`/api/empresa/usuarios/${senhaUsuario.id}/senha`, {
        method: "POST",
        empresaId,
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

  const ativos = usuarios.filter((item) => item.ativo).length;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Gestão da empresa"
        title="Equipe e acessos"
        description={`Cadastre funcionários por convite e administre permissões e acessos de ${empresaNome}.`}
        actions={
          <Button size="sm" onClick={abrirNovo}>
            <Plus className="mr-2 h-4 w-4" /> Novo funcionário
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Funcionários</p>
            <p className="mt-1 text-2xl font-semibold">{usuarios.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ativos</p>
            <p className="mt-1 text-2xl font-semibold">{ativos}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Acessos bloqueados</p>
            <p className="mt-1 text-2xl font-semibold">{usuarios.length - ativos}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1fr_190px_auto] sm:items-end">
          <div>
            <Label>Buscar funcionário</Label>
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou e-mail" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => void carregar()} disabled={carregando}>
            <RefreshCw className={`mr-2 h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Carregando equipe...
                  </TableCell>
                </TableRow>
              ) : usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum funcionário cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                usuarios.map((alvo) => (
                  <TableRow key={alvo.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <UsersRound className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{alvo.nome}</div>
                          <div className="text-xs text-muted-foreground">{alvo.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                          <span>
                            {alvo.permissoes?.length ?? 0} de {GRUPOS_PERMISSOES.flatMap((grupo) => grupo.itens).length}
                          </span>
                        </div>
                        {alvo.permissoes?.includes("EQUIPE_GERENCIAR") && (
                          <Badge variant="outline">Administrador delegado</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant={alvo.ativo ? "secondary" : "outline"}>
                          {alvo.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                        {alvo.ativo && (!alvo.senhaDefinida || !alvo.emailVerificado) && (
                          <Badge variant="outline">
                            {!alvo.conviteEnviadoEm ? "Convite pendente" : "Aguardando ativação"}
                          </Badge>
                        )}
                        {alvo.emailVerificado && alvo.senhaDefinida && (
                          <Badge variant="outline">E-mail verificado</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => abrirEdicao(alvo)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                        </Button>
                        {alvo.senhaDefinida && alvo.emailVerificado ? (
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
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                const resposta = await apiJson<{ enviado: boolean }>(
                                  `/api/empresa/usuarios/${alvo.id}/convite`,
                                  { method: "POST" },
                                );
                                toast[resposta.enviado ? "success" : "warning"](
                                  resposta.enviado
                                    ? "Convite reenviado"
                                    : "Convite pendente: o envio de e-mail ainda não está configurado",
                                );
                                await carregar();
                              } catch (error) {
                                toast.error(error instanceof Error ? error.message : "Não foi possível reenviar o convite");
                              }
                            }}
                          >
                            <Mail className="mr-1 h-3.5 w-3.5" /> Convite
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar funcionário" : "Novo funcionário"}</DialogTitle>
            <DialogDescription>
              O acesso criado ficará vinculado somente à sua empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))} />
            </div>
            <div>
              <Label>E-mail de acesso</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={form.telefone}
                onChange={(e) => setForm((s) => ({ ...s, telefone: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            {!editando ? (
              <div className="rounded-lg border border-primary/15 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs leading-5 text-muted-foreground">
                    O funcionário receberá um convite no e-mail informado para confirmar o endereço e criar a própria senha.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <Label>Status do acesso</Label>
                <Select
                  value={form.ativo ? "ativo" : "inativo"}
                  onValueChange={(value) => setForm((s) => ({ ...s, ativo: value === "ativo" }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo · pode acessar</SelectItem>
                    <SelectItem value="inativo">Inativo · acesso bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="border-t border-border/70 pt-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <Label className="text-sm font-semibold">Permissões do usuário</Label>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Defina o que este funcionário poderá fazer dentro de{" "}
                    <strong>{empresaNome}</strong>. “Acesso total operacional” libera todos os módulos,
                    mas não permite administrar outros usuários. “Administrador delegado” também libera
                    equipe e permissões e só pode ser concedido pelo ADMIN principal.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries({
                    comercial: "Comercial",
                    financeiro: "Financeiro",
                    consulta: "Somente consulta",
                    gestor: "Acesso total operacional",
                    ...(usuario?.perfil === "ADMIN" || usuario?.perfil === "SUPER_ADMIN"
                      ? { administradorDelegado: "Administrador delegado" }
                      : {}),
                  }).map(([id, label]) => (
                    <Button
                      key={id}
                      type="button"
                      size="sm"
                      variant={id === "administradorDelegado" ? "default" : "outline"}
                      onClick={() =>
                        setForm((s) => ({
                          ...s,
                          permissoes: [...PRESETS_PERMISSOES[id]],
                        }))
                      }
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {GRUPOS_PERMISSOES.map((grupo) => (
                  <div key={grupo.titulo} className="rounded-lg border border-border/70 p-4">
                    <div className="font-medium">{grupo.titulo}</div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {grupo.descricao}
                    </p>
                    <div className="mt-3 space-y-3">
                      {grupo.itens.map((item) => {
                        const checked = form.permissoes.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className="flex cursor-pointer items-start gap-3 text-sm"
                          >
                            <Checkbox
                              checked={checked}
                              disabled={
                                item.id === "EQUIPE_GERENCIAR"
                                && usuario?.perfil === "USUARIO"
                              }
                              onCheckedChange={(valor) =>
                                setForm((s) => ({
                                  ...s,
                                  permissoes: valor
                                    ? Array.from(new Set([...s.permissoes, item.id]))
                                    : s.permissoes.filter((p) => p !== item.id),
                                }))
                              }
                            />
                            <span>
                              {item.label}
                              {item.id === "EQUIPE_GERENCIAR" && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  · permissão administrativa
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button onClick={() => void salvar()} disabled={salvando}>
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar funcionário"}
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
              Defina uma nova senha para {senhaUsuario?.nome}.
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
