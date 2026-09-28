import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, Pencil, Plus, Power, PowerOff, Search } from "lucide-react";
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
  component: AdminEmpresasPage,
  head: () => ({ meta: [{ title: "Empresas · Administração · ImobControl" }] }),
});

type Empresa = {
  id: number;
  nome: string;
  slug: string;
  ativa: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
};

function AdminEmpresasPage() {
  const navigate = useNavigate();
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

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return empresas;
    return empresas.filter((empresa) =>
      empresa.nome.toLowerCase().includes(termo) || empresa.slug.toLowerCase().includes(termo),
    );
  }, [busca, empresas]);

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
                <Badge variant={empresa.ativa ? "default" : "secondary"}>
                  {empresa.ativa ? "Ativa" : "Inativa"}
                </Badge>
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
                  await apiJson<Empresa>("/api/super-admin/empresas", {
                    method: "POST",
                    body: JSON.stringify({ nome: novoNome.trim() }),
                  });
                  toast.success("Empresa criada");
                  setNovoNome("");
                  setNovoAberto(false);
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
