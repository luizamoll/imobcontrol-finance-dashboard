import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, RefreshCw, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
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
import { formatCPF } from "@/lib/format";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/clientes")({
  component: ClientesPage,
  head: () => ({ meta: [{ title: "Clientes · ImobControl" }] }),
});

type Cliente = {
  id: number;
  empresaId: number;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  estadoCivil: string | null;
  profissao: string | null;
  versao: number;
  criadoEm: string;
  atualizadoEm: string;
};

type Pagina<T> = {
  content: T[];
  totalElements: number;
};

type FormCliente = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  estadoCivil: string;
  profissao: string;
  versao: number | null;
};

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const ESTADOS_CIVIS = [
  "Solteiro(a)",
  "Casado(a)",
  "União estável",
  "Divorciado(a)",
  "Separado(a)",
  "Viúvo(a)",
];

function vazio(): FormCliente {
  return {
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    estadoCivil: "",
    profissao: "",
    versao: null,
  };
}

function doCliente(cliente: Cliente): FormCliente {
  return {
    nome: cliente.nome,
    cpf: cliente.cpf ?? "",
    email: cliente.email ?? "",
    telefone: cliente.telefone ?? "",
    cep: cliente.cep ?? "",
    logradouro: cliente.logradouro ?? "",
    numero: cliente.numero ?? "",
    complemento: cliente.complemento ?? "",
    bairro: cliente.bairro ?? "",
    cidade: cliente.cidade ?? "",
    uf: cliente.uf ?? "",
    estadoCivil: cliente.estadoCivil ?? "",
    profissao: cliente.profissao ?? "",
    versao: cliente.versao,
  };
}

function somenteDigitos(valor: string, limite: number) {
  return valor.replace(/\D/g, "").slice(0, limite);
}

function formatCEP(valor: string) {
  const d = somenteDigitos(valor, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

function ClientesPage() {
  const { empresaAtualId, empresaAtual, carregando: carregandoEmpresa } = useTenant();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [form, setForm] = useState<FormCliente>(vazio());
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!empresaAtualId) {
      setClientes([]);
      return;
    }

    setCarregando(true);
    try {
      const pagina = await apiJson<Pagina<Cliente>>("/api/clientes?pagina=0&tamanho=100", {
        empresaId: empresaAtualId,
      });
      setClientes(pagina.content);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar os clientes");
    } finally {
      setCarregando(false);
    }
  }, [empresaAtualId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter((cliente) =>
      [
        cliente.nome,
        cliente.cpf ? formatCPF(cliente.cpf) : "",
        cliente.email ?? "",
        cliente.telefone ?? "",
        cliente.cidade ?? "",
        cliente.profissao ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(termo),
    );
  }, [clientes, busca]);

  const abrirNovo = () => {
    setEditando(null);
    setForm(vazio());
    setDialogAberto(true);
  };

  const abrirEdicao = (cliente: Cliente) => {
    setEditando(cliente);
    setForm(doCliente(cliente));
    setDialogAberto(true);
  };

  const salvar = async () => {
    if (!empresaAtualId) {
      toast.error("Selecione uma empresa antes de cadastrar o cliente");
      return;
    }
    if (!form.nome.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }

    const body = {
      ...form,
      nome: form.nome.trim(),
      cpf: form.cpf || null,
      email: form.email || null,
      telefone: form.telefone || null,
      cep: form.cep || null,
      logradouro: form.logradouro || null,
      numero: form.numero || null,
      complemento: form.complemento || null,
      bairro: form.bairro || null,
      cidade: form.cidade || null,
      uf: form.uf || null,
      estadoCivil: form.estadoCivil || null,
      profissao: form.profissao || null,
    };

    setSalvando(true);
    try {
      if (editando) {
        await apiJson<Cliente>(`/api/clientes/${editando.id}`, {
          method: "PUT",
          empresaId: empresaAtualId,
          body: JSON.stringify(body),
        });
        toast.success("Cliente atualizado");
      } else {
        await apiJson<Cliente>("/api/clientes", {
          method: "POST",
          empresaId: empresaAtualId,
          body: JSON.stringify({ ...body, versao: null }),
        });
        toast.success("Cliente cadastrado");
      }
      setDialogAberto(false);
      await carregar();
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : "Não foi possível salvar o cliente";
      toast.error(mensagem);
      if ((error as Error & { status?: number })?.status === 409) {
        await carregar();
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Comercial"
        title="Clientes"
        description={
          empresaAtual
            ? `Cadastros de compradores de ${empresaAtual.nome}.`
            : "Selecione uma empresa para consultar os compradores."
        }
        actions={
          <Button size="sm" onClick={abrirNovo} disabled={!empresaAtualId || carregandoEmpresa}>
            <Plus className="mr-2 h-4 w-4" /> Novo cliente
          </Button>
        }
      />

      <Card className="border-border/70">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, CPF, e-mail, cidade ou profissão"
            className="sm:max-w-lg"
          />
          <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando}>
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
                <TableHead>Cliente</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Cidade / UF</TableHead>
                <TableHead>Profissão</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!empresaAtualId ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Selecione uma empresa para visualizar os clientes.
                  </TableCell>
                </TableRow>
              ) : carregando ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Carregando clientes...
                  </TableCell>
                </TableRow>
              ) : filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{cliente.nome}</div>
                          <div className="text-xs text-muted-foreground">{cliente.estadoCivil || "—"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{cliente.cpf ? formatCPF(cliente.cpf) : "—"}</TableCell>
                    <TableCell className="text-sm">
                      <div>{cliente.telefone || "—"}</div>
                      <div className="text-xs text-muted-foreground">{cliente.email || "—"}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {cliente.cidade ? `${cliente.cidade}${cliente.uf ? ` / ${cliente.uf}` : ""}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{cliente.profissao || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => abrirEdicao(cliente)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                      </Button>
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
            <DialogTitle>{editando ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription>
              Dados cadastrais do comprador. O cadastro pertence à empresa selecionada e pode ser
              reutilizado em novas vendas.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Nome completo" required>
              <Input value={form.nome} onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))} />
            </Campo>
            <Campo label="CPF">
              <Input
                value={formatCPF(form.cpf)}
                onChange={(e) => setForm((s) => ({ ...s, cpf: somenteDigitos(e.target.value, 11) }))}
                placeholder="000.000.000-00"
              />
            </Campo>
            <Campo label="Estado civil">
              <Select
                value={form.estadoCivil || "nao_informado"}
                onValueChange={(value) =>
                  setForm((s) => ({ ...s, estadoCivil: value === "nao_informado" ? "" : value }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao_informado">Não informado</SelectItem>
                  {ESTADOS_CIVIS.map((estado) => (
                    <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Profissão">
              <Input value={form.profissao} onChange={(e) => setForm((s) => ({ ...s, profissao: e.target.value }))} />
            </Campo>
            <Campo label="E-mail">
              <Input type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            </Campo>
            <Campo label="Telefone">
              <Input value={form.telefone} onChange={(e) => setForm((s) => ({ ...s, telefone: e.target.value }))} />
            </Campo>
          </div>

          <div className="mt-2 border-t border-border/70 pt-4">
            <h3 className="mb-3 text-sm font-semibold">Endereço</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <Campo label="CEP">
                  <Input
                    value={formatCEP(form.cep)}
                    onChange={(e) => setForm((s) => ({ ...s, cep: somenteDigitos(e.target.value, 8) }))}
                    placeholder="00000-000"
                  />
                </Campo>
              </div>
              <div className="sm:col-span-3">
                <Campo label="Logradouro">
                  <Input value={form.logradouro} onChange={(e) => setForm((s) => ({ ...s, logradouro: e.target.value }))} />
                </Campo>
              </div>
              <div>
                <Campo label="Número">
                  <Input value={form.numero} onChange={(e) => setForm((s) => ({ ...s, numero: e.target.value }))} />
                </Campo>
              </div>
              <div className="sm:col-span-2">
                <Campo label="Complemento">
                  <Input value={form.complemento} onChange={(e) => setForm((s) => ({ ...s, complemento: e.target.value }))} />
                </Campo>
              </div>
              <div className="sm:col-span-2">
                <Campo label="Bairro">
                  <Input value={form.bairro} onChange={(e) => setForm((s) => ({ ...s, bairro: e.target.value }))} />
                </Campo>
              </div>
              <div className="sm:col-span-1">
                <Campo label="UF">
                  <Select
                    value={form.uf || "nao_informado"}
                    onValueChange={(value) =>
                      setForm((s) => ({ ...s, uf: value === "nao_informado" ? "" : value }))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao_informado">—</SelectItem>
                      {UFS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Campo>
              </div>
              <div className="sm:col-span-1">
                <Campo label="Cidade">
                  <Input value={form.cidade} onChange={(e) => setForm((s) => ({ ...s, cidade: e.target.value }))} />
                </Campo>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button onClick={() => void salvar()} disabled={salvando}>
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function Campo({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
    </div>
  );
}
