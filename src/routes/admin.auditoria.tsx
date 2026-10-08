import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  FilterX,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatLocalDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/auditoria")({
  component: AdminAuditoriaPage,
  head: () => ({ meta: [{ title: "Auditoria · Administração · ImobControl" }] }),
});

type Empresa = { id: number; nome: string; slug: string; ativa: boolean };
type UsuarioFiltro = {
  id: number;
  nome: string;
  email: string;
  empresa: { id: number; nome: string } | null;
};
type Registro = {
  id: number;
  empresaId: number;
  empresaNome: string;
  usuarioId: number;
  usuarioNome: string;
  entidade: string;
  entidadeId: number;
  acao: string;
  detalhes?: string | null;
  criadoEm: string;
};
type Pagina<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

const rotulos: Record<string, string> = {
  CRIACAO: "Criação",
  ATUALIZACAO: "Atualização",
  EXCLUSAO: "Exclusão",
  RECEBIMENTO: "Recebimento registrado",
  RECEBIMENTO_ESTORNADO: "Recebimento estornado",
  EMPRESA_CRIADA: "Empresa criada",
  EMPRESA_ATUALIZADA: "Empresa atualizada",
  USUARIO_CRIADO: "Usuário criado",
  USUARIO_ATUALIZADO: "Usuário atualizado",
  USUARIO_DESATIVADO: "Usuário desativado",
  SENHA_REDEFINIDA: "Senha redefinida",
  CONVITE_REENVIADO: "Convite reenviado",
};

const entidades: Record<string, string> = {
  EMPRESA: "Empresa",
  USUARIO: "Usuário",
  CLIENTE: "Cliente",
  EMPREENDIMENTO: "Empreendimento",
  QUADRA: "Quadra / agrupamento",
  UNIDADE: "Unidade",
  VENDA: "Venda",
  PARCELA: "Parcela",
  CONFIGURACAO_EMPRESA: "Configuração da empresa",
};

const acoesFiltro = [
  "CRIACAO",
  "ATUALIZACAO",
  "EXCLUSAO",
  "RECEBIMENTO",
  "RECEBIMENTO_ESTORNADO",
  "EMPRESA_CRIADA",
  "EMPRESA_ATUALIZADA",
  "USUARIO_CRIADO",
  "USUARIO_ATUALIZADO",
  "USUARIO_DESATIVADO",
  "SENHA_REDEFINIDA",
  "CONVITE_REENVIADO",
];

function proximoDia(data: string) {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-").map(Number);
  const utc = new Date(Date.UTC(ano, mes - 1, dia + 1));
  return utc.toISOString().slice(0, 10);
}

function AdminAuditoriaPage() {
  const { usuario } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioFiltro[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [empresaId, setEmpresaId] = useState("todas");
  const [usuarioId, setUsuarioId] = useState("todos");
  const [acao, setAcao] = useState("todas");
  const [entidade, setEntidade] = useState("todas");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (usuario?.perfil !== "SUPER_ADMIN") return;
    let cancelado = false;
    void Promise.all([
      apiJson<Empresa[]>("/api/super-admin/empresas?incluirInativas=true"),
      apiJson<Pagina<UsuarioFiltro>>("/api/super-admin/usuarios?pagina=0&tamanho=200"),
    ])
      .then(([listaEmpresas, paginaUsuarios]) => {
        if (cancelado) return;
        setEmpresas(listaEmpresas);
        setUsuarios(paginaUsuarios.content);
      })
      .catch((error) => {
        if (!cancelado) {
          toast.error(error instanceof Error ? error.message : "Não foi possível carregar os filtros");
        }
      });
    return () => {
      cancelado = true;
    };
  }, [usuario]);

  const carregar = useCallback(async () => {
    if (usuario?.perfil !== "SUPER_ADMIN") return;
    setCarregando(true);
    try {
      const params = new URLSearchParams({
        pagina: String(pagina),
        tamanho: "50",
      });
      if (empresaId !== "todas") params.set("empresaId", empresaId);
      if (usuarioId !== "todos") params.set("usuarioId", usuarioId);
      if (acao !== "todas") params.set("acao", acao);
      if (entidade !== "todas") params.set("entidade", entidade);
      if (dataInicio) params.set("inicio", `${dataInicio}T00:00:00`);
      if (dataFim) params.set("fim", `${proximoDia(dataFim)}T00:00:00`);

      const resultado = await apiJson<Pagina<Registro>>(
        `/api/super-admin/auditoria?${params.toString()}`,
      );
      setRegistros(resultado.content);
      setTotalPaginas(resultado.totalPages);
      setTotalRegistros(resultado.totalElements);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar a auditoria");
    } finally {
      setCarregando(false);
    }
  }, [acao, dataFim, dataInicio, empresaId, entidade, pagina, usuario, usuarioId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const usuariosDisponiveis = useMemo(() => {
    if (empresaId === "todas") return usuarios;
    return usuarios.filter((item) => String(item.empresa?.id ?? "") === empresaId);
  }, [empresaId, usuarios]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return registros;
    return registros.filter((registro) =>
      registro.usuarioNome.toLowerCase().includes(termo) ||
      registro.empresaNome.toLowerCase().includes(termo) ||
      (rotulos[registro.acao] ?? registro.acao).toLowerCase().includes(termo) ||
      (entidades[registro.entidade] ?? registro.entidade).toLowerCase().includes(termo) ||
      (registro.detalhes ?? "").toLowerCase().includes(termo),
    );
  }, [busca, registros]);

  const filtrosAtivos =
    empresaId !== "todas" ||
    usuarioId !== "todos" ||
    acao !== "todas" ||
    entidade !== "todas" ||
    Boolean(dataInicio) ||
    Boolean(dataFim);

  const limparFiltros = () => {
    setEmpresaId("todas");
    setUsuarioId("todos");
    setAcao("todas");
    setEntidade("todas");
    setDataInicio("");
    setDataFim("");
    setBusca("");
    setPagina(0);
  };

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
        title="Auditoria"
        description="Consulte todo o histórico da plataforma, filtre por contexto e volte a registros antigos sem perder informações."
        actions={
          <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando}>
            <RefreshCw className={`mr-2 h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        }
      />

      <Card className="border-border/70">
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Filtros do histórico</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Os filtros são aplicados em todo o histórico, não apenas nos registros visíveis.
              </p>
            </div>
            {filtrosAtivos && (
              <Button variant="ghost" size="sm" onClick={limparFiltros}>
                <FilterX className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <Label>Empresa</Label>
              <Select
                value={empresaId}
                onValueChange={(value) => {
                  setEmpresaId(value);
                  setUsuarioId("todos");
                  setPagina(0);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as empresas</SelectItem>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={String(empresa.id)}>
                      {empresa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Usuário</Label>
              <Select
                value={usuarioId}
                onValueChange={(value) => {
                  setUsuarioId(value);
                  setPagina(0);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os usuários</SelectItem>
                  {usuariosDisponiveis.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Ação</Label>
              <Select
                value={acao}
                onValueChange={(value) => {
                  setAcao(value);
                  setPagina(0);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as ações</SelectItem>
                  {acoesFiltro.map((item) => (
                    <SelectItem key={item} value={item}>
                      {rotulos[item] ?? item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de registro</Label>
              <Select
                value={entidade}
                onValueChange={(value) => {
                  setEntidade(value);
                  setPagina(0);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todos os tipos</SelectItem>
                  {Object.entries(entidades).map(([valor, label]) => (
                    <SelectItem key={valor} value={valor}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>De</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(event) => {
                  setDataInicio(event.target.value);
                  setPagina(0);
                }}
              />
            </div>

            <div>
              <Label>Até</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(event) => {
                  setDataFim(event.target.value);
                  setPagina(0);
                }}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Buscar nesta página</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Nome, ação, empresa ou detalhe..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          <strong className="text-foreground">{totalRegistros}</strong> registro(s) encontrado(s)
          {busca && (
            <span>
              {" "}· {filtrados.length} visível(is) nesta página para “{busca}”
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Horários exibidos no fuso de Brasília
        </div>
      </div>

      <Card className="overflow-hidden border-border/70">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data e hora</TableHead>
              <TableHead>O que aconteceu</TableHead>
              <TableHead>Quem</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Registro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((registro) => (
              <TableRow key={registro.id}>
                <TableCell className="whitespace-nowrap align-top text-xs text-muted-foreground">
                  {formatLocalDateTime(registro.criadoEm)}
                </TableCell>
                <TableCell className="align-top">
                  <Badge variant="outline">{rotulos[registro.acao] ?? registro.acao}</Badge>
                  {registro.detalhes && (
                    <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
                      {registro.detalhes}
                    </p>
                  )}
                </TableCell>
                <TableCell className="align-top text-sm">{registro.usuarioNome}</TableCell>
                <TableCell className="align-top text-sm">{registro.empresaNome}</TableCell>
                <TableCell className="align-top text-sm text-muted-foreground">
                  {entidades[registro.entidade] ?? registro.entidade} #{registro.entidadeId}
                </TableCell>
              </TableRow>
            ))}
            {!carregando && filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">
                  Nenhum registro encontrado para os filtros selecionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          Histórico somente leitura. Senhas e credenciais não são exibidas.
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Página {totalPaginas === 0 ? 0 : pagina + 1} de {totalPaginas}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagina <= 0 || carregando}
            onClick={() => setPagina((atual) => Math.max(0, atual - 1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagina + 1 >= totalPaginas || carregando}
            onClick={() => setPagina((atual) => atual + 1)}
          >
            Próxima
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
