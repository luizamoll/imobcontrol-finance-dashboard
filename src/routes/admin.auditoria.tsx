import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/admin/auditoria")({
  component: AdminAuditoriaPage,
  head: () => ({ meta: [{ title: "Auditoria · Administração · ImobControl" }] }),
});

type Empresa = { id: number; nome: string; slug: string; ativa: boolean };
type Registro = {
  id: number;
  empresaId: number;
  empresaNome: string;
  usuarioId: number;
  usuarioNome: string;
  entidade: string;
  entidadeId: number;
  acao: string;
  criadoEm: string;
};
type Pagina<T> = { content: T[]; totalElements: number };

const rotulos: Record<string, string> = {
  EMPRESA_CRIADA: "Empresa criada",
  EMPRESA_ATUALIZADA: "Empresa atualizada",
  USUARIO_CRIADO: "Usuário criado",
  USUARIO_ATUALIZADO: "Usuário atualizado",
  USUARIO_DESATIVADO: "Usuário desativado",
  SENHA_REDEFINIDA: "Senha redefinida",
  CLIENTE_CRIADO: "Cliente criado",
  CLIENTE_ATUALIZADO: "Cliente atualizado",
  VENDA_CRIADA: "Venda criada",
  VENDA_ATUALIZADA: "Venda atualizada",
  RECEBIMENTO_REGISTRADO: "Recebimento registrado",
  RECEBIMENTO_ESTORNADO: "Recebimento estornado",
};

function AdminAuditoriaPage() {
  const { usuario } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [empresaId, setEmpresaId] = useState("todas");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({ pagina: "0", tamanho: "100" });
      if (empresaId !== "todas") params.set("empresaId", empresaId);
      const [listaEmpresas, pagina] = await Promise.all([
        apiJson<Empresa[]>("/api/super-admin/empresas?incluirInativas=true"),
        apiJson<Pagina<Registro>>(`/api/super-admin/auditoria?${params.toString()}`),
      ]);
      setEmpresas(listaEmpresas);
      setRegistros(pagina.content);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar a auditoria");
    } finally {
      setCarregando(false);
    }
  }, [empresaId]);

  useEffect(() => { void carregar(); }, [carregar]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return registros;
    return registros.filter((registro) =>
      registro.usuarioNome.toLowerCase().includes(termo) ||
      registro.empresaNome.toLowerCase().includes(termo) ||
      registro.acao.toLowerCase().includes(termo) ||
      registro.entidade.toLowerCase().includes(termo),
    );
  }, [busca, registros]);

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
        title="Auditoria"
        description="Acompanhe alterações importantes realizadas em empresas, usuários, clientes, vendas e recebimentos."
        actions={
          <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando}>
            <RefreshCw className={`mr-2 h-4 w-4 ${carregando ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        }
      />

      <Card className="border-border/70">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_260px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por usuário, empresa, ação ou entidade..." className="pl-9" />
          </div>
          <Select value={empresaId} onValueChange={setEmpresaId}>
            <SelectTrigger><SelectValue placeholder="Empresa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as empresas</SelectItem>
              {empresas.map((empresa) => (
                <SelectItem key={empresa.id} value={String(empresa.id)}>{empresa.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/70">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Objeto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((registro) => (
              <TableRow key={registro.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(registro.criadoEm).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{rotulos[registro.acao] ?? registro.acao}</Badge>
                </TableCell>
                <TableCell className="text-sm">{registro.usuarioNome}</TableCell>
                <TableCell className="text-sm">{registro.empresaNome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {registro.entidade} #{registro.entidadeId}
                </TableCell>
              </TableRow>
            ))}
            {!carregando && filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4" />
        A auditoria é somente leitura e não expõe senhas nem credenciais.
      </div>
    </PageShell>
  );
}
