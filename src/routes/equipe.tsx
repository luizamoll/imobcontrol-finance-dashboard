import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Pencil, Plus, RefreshCw, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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

export const Route = createFileRoute("/equipe")({
  component: EquipePage,
  head: () => ({ meta: [{ title: "Equipe e acessos · ImobControl" }] }),
});

type UsuarioEquipe = {
  id: number;
  nome: string;
  email: string;
  perfil: "USUARIO";
  ativo: boolean;
  versao: number;
};

type Pagina<T> = {
  content: T[];
  totalElements: number;
};

type FormEquipe = {
  nome: string;
  email: string;
  senha: string;
  ativo: boolean;
  versao: number | null;
};

function vazio(): FormEquipe {
  return { nome: "", email: "", senha: "", ativo: true, versao: null };
}

function EquipePage() {
  const { usuario } = useAuth();

  if (usuario?.perfil !== "ADMIN") {
    return (
      <PageShell>
        <PageHeader
          eyebrow="Gestão da empresa"
          title="Acesso restrito"
          description="A gestão da equipe é exclusiva do administrador da empresa."
        />
      </PageShell>
    );
  }

  return <PainelEquipe />;
}

function PainelEquipe() {
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
      const pagina = await apiJson<Pagina<UsuarioEquipe>>(`/api/empresa/usuarios?${query}`);
      setUsuarios(pagina.content);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar a equipe");
    } finally {
      setCarregando(false);
    }
  }, [query]);

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
      senha: "",
      ativo: alvo.ativo,
      versao: alvo.versao,
    });
    setDialogAberto(true);
  };

  const salvar = async () => {
    if (!form.nome.trim() || !form.email.trim()) {
      toast.error("Preencha nome e e-mail");
      return;
    }
    if (!editando && form.senha.length < 8) {
      toast.error("A senha inicial deve ter pelo menos 8 caracteres");
      return;
    }

    setSalvando(true);
    try {
      if (editando) {
        await apiJson<UsuarioEquipe>(`/api/empresa/usuarios/${editando.id}`, {
          method: "PUT",
          body: JSON.stringify({
            nome: form.nome.trim(),
            email: form.email.trim(),
            ativo: form.ativo,
            versao: form.versao,
          }),
        });
        toast.success("Funcionário atualizado");
      } else {
        await apiJson<UsuarioEquipe>("/api/empresa/usuarios", {
          method: "POST",
          body: JSON.stringify({
            nome: form.nome.trim(),
            email: form.email.trim(),
            senha: form.senha,
          }),
        });
        toast.success("Funcionário criado");
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
        description={`Cadastre e administre os funcionários de ${usuario?.empresa?.nome ?? "sua empresa"}.`}
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                    Carregando equipe...
                  </TableCell>
                </TableRow>
              ) : usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
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
                      <Badge variant={alvo.ativo ? "secondary" : "outline"}>
                        {alvo.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-lg">
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
            {!editando ? (
              <div>
                <Label>Senha inicial</Label>
                <Input
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm((s) => ({ ...s, senha: e.target.value }))}
                  placeholder="Mínimo de 8 caracteres"
                />
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
