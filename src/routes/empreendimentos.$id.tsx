import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Building2, Layers3, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CurrencyInput } from "@/components/currency-input";
import { PageHeader, PageShell } from "@/components/page-shell";
import { RegrasOperacaoForm } from "@/components/regras-operacao-form";
import { EmpStatusBadge, MatriculaStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  atualizarEmpreendimentoRemoto,
  atualizarQuadraRemota,
  atualizarUnidadeRemota,
  criarQuadraRemota,
  criarUnidadeRemota,
} from "@/lib/catalogo-api";
import { brl, formatCNPJ, num, pct } from "@/lib/format";
import {
  empTotais,
  regrasEfetivasEmpreendimento,
  regrasEfetivasUnidade,
  useStore,
  type AgrupamentoTipo,
  type Empreendimento,
  type EmpreendimentoTipo,
  type EmpStatus,
  type Matricula,
  type MatriculaStatus,
  type UnidadeTipo,
  type Quadra,
  type RegrasOperacao,
} from "@/lib/store";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/empreendimentos/$id")({
  component: EmpreendimentoDetail,
  head: () => ({ meta: [{ title: "Empreendimento · ImobControl" }] }),
  notFoundComponent: () => (
    <PageShell>
      <PageHeader eyebrow="Portfólio" title="Empreendimento não encontrado" />
    </PageShell>
  ),
});

function EmpreendimentoDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { state, setState } = useStore();
  const { empresaAtualId } = useTenant();
  const emp = state.empreendimentos.find((e) => e.id === id);

  const [unitOpen, setUnitOpen] = useState(false);
  const [quadraOpen, setQuadraOpen] = useState(false);
  const [editQuadra, setEditQuadra] = useState<Quadra | null>(null);
  const [editUnidade, setEditUnidade] = useState<Matricula | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!emp) throw notFound();

  const regrasEmp = regrasEfetivasEmpreendimento(emp, state.config);
  const t = empTotais(emp.id, state.vendas, state.parcelas);
  const quadras = state.quadras.filter((q) => q.empreendimentoId === emp.id);
  const matriculas = state.matriculas.filter((m) => m.empreendimentoId === emp.id);
  const vendas = state.vendas.filter((v) => v.empreendimentoId === emp.id);
  const parcelas = state.parcelas.filter((p) => p.empreendimentoId === emp.id);
  const movimentos = state.movimentos.filter((m) => m.empreendimentoId === emp.id);
  const possuiHistoricoFinanceiro =
    vendas.length > 0 || parcelas.length > 0 || movimentos.length > 0;
  const vendidoPct = emp.valorTotal ? Math.min(100, (t.vendido / emp.valorTotal) * 100) : 0;

  const excluirEmpreendimento = () => {
    if (possuiHistoricoFinanceiro) {
      toast.error("Este empreendimento possui histórico financeiro", {
        description:
          "Para preservar vendas e recebimentos já registrados, a exclusão foi bloqueada.",
      });
      return;
    }

    toast.info("Exclusão temporariamente bloqueada nesta atualização", {
      description:
        "Agora o catálogo usa o banco compartilhado. A exclusão será liberada com a regra de auditoria financeira para evitar apagar dados do cliente por engano.",
    });
    setDeleteOpen(false);
  };

  return (
    <PageShell>
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link to="/empreendimentos">
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para empreendimentos
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow={emp.spe}
        title={emp.nome}
        description={emp.observacoes || (emp.cnpj ? `CNPJ ${emp.cnpj}` : "CNPJ não informado")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <EmpStatusBadge status={emp.status} />
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </Button>
          </div>
        }
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <EditEmpreendimentoDialog
          emp={emp}
          regrasAtuais={regrasEmp}
          onSave={async (patch) => {
            if (!empresaAtualId) return;
            try {
              const salvo = await atualizarEmpreendimentoRemoto(
                empresaAtualId,
                emp,
                patch,
              );
              setState((s) => ({
                ...s,
                empreendimentos: s.empreendimentos.map((item) =>
                  item.id === emp.id ? salvo : item,
                ),
              }));
              toast.success("Empreendimento atualizado");
              setEditOpen(false);
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Não foi possível atualizar o empreendimento",
              );
            }
          }}
        />
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir empreendimento?</DialogTitle>
            <DialogDescription>
              Esta ação remove o empreendimento, suas quadras e unidades. Vendas e recebimentos nunca
              são apagados por esta ação.
            </DialogDescription>
          </DialogHeader>
          {possuiHistoricoFinanceiro ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-medium text-destructive">Exclusão bloqueada</p>
              <p className="mt-1 text-muted-foreground">
                Existem {vendas.length} venda(s), {parcelas.length} parcela(s) ou {movimentos.length}{" "}
                recebimento(s) ligados a este empreendimento.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
              {quadras.length} quadra(s) e {matriculas.length} unidade(s) também serão removidas.
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={possuiHistoricoFinanceiro}
              onClick={excluirEmpreendimento}
            >
              Excluir empreendimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatBox label="VGV" value={brl(emp.valorTotal)} />
        <StatBox label="Vendido" value={brl(t.vendido)} sub={pct(vendidoPct)} />
        <StatBox label="Recebido" value={brl(t.recebido)} />
        <StatBox label="Saldo a receber" value={brl(t.saldo)} />
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Progresso comercial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Progress value={vendidoPct} />
            <span className="w-16 text-right text-sm text-muted-foreground">{pct(vendidoPct)}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Info label="Tipo" value={tipoLegivel(emp.tipo)} />
            <Info label="Área total" value={`${num(emp.areaTotal)} m²`} />
            <Info label="Agrupamentos" value={String(quadras.length)} />
            <Info label="Unidades cadastradas" value={String(matriculas.length)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Regras financeiras — {emp.nome}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Aplicado a: <strong>Empreendimento · {emp.nome}</strong>. Agrupamentos e unidades herdam
              estas regras quando não possuem exceção própria.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Editar regras
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <ResumoRegras regras={regrasEmp} />
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers3 className="h-4 w-4 text-primary" /> Quadras, blocos e setores
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Use somente quando o projeto tiver subdivisões. Cada agrupamento herda de {emp.nome}
              ou pode ter uma exceção própria.
            </p>
          </div>
          <Dialog open={quadraOpen} onOpenChange={setQuadraOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Novo agrupamento
              </Button>
            </DialogTrigger>
            <QuadraDialog
              empreendimento={emp}
              regrasBase={regrasEmp}
              onSave={async (q) => {
                if (!empresaAtualId) return;
                try {
                  const criada = await criarQuadraRemota(empresaAtualId, {
                    ...q,
                    empreendimentoId: emp.id,
                  });
                  setState((s) => ({ ...s, quadras: [...s.quadras, criada] }));
                  toast.success("Agrupamento cadastrado");
                  setQuadraOpen(false);
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Não foi possível cadastrar o agrupamento",
                  );
                }
              }}
            />
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agrupamento</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Unidades</TableHead>
                <TableHead>Regra financeira</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quadras.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum agrupamento cadastrado. As unidades também podem ficar diretamente no empreendimento.
                  </TableCell>
                </TableRow>
              )}
              {quadras.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">
                    <div>{q.nome}</div>
                    <div className="text-[11px] capitalize text-muted-foreground">
                      {agrupamentoTipoLegivel(q.tipoAgrupamento)}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {q.descricao || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {matriculas.filter((m) => m.quadraId === q.id).length}
                  </TableCell>
                  <TableCell className="text-sm">
                    {q.regras
                      ? `Regra própria do ${agrupamentoTipoLegivel(q.tipoAgrupamento).toLowerCase()}`
                      : `Herda de ${emp.nome}`}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditQuadra(q)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editQuadra} onOpenChange={(open) => !open && setEditQuadra(null)}>
        {editQuadra && (
          <QuadraDialog
            empreendimento={emp}
            regrasBase={regrasEmp}
            quadra={editQuadra}
            onSave={async (patch) => {
              if (!empresaAtualId) return;
              try {
                const salva = await atualizarQuadraRemota(
                  empresaAtualId,
                  editQuadra,
                  patch,
                );
                setState((s) => ({
                  ...s,
                  quadras: s.quadras.map((q) =>
                    q.id === editQuadra.id ? salva : q,
                  ),
                }));
                toast.success("Agrupamento atualizado");
                setEditQuadra(null);
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Não foi possível atualizar o agrupamento",
                );
              }
            }}
          />
        )}
      </Dialog>

      <Card className="border-border/70">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-primary" /> Unidades / Matrículas
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Cada unidade pode herdar do empreendimento, do agrupamento escolhido ou possuir uma regra própria.
            </p>
          </div>
          <Dialog open={unitOpen} onOpenChange={setUnitOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Nova unidade
              </Button>
            </DialogTrigger>
            <NewUnidadeDialog
              empreendimento={emp}
              quadras={quadras}
              regrasEmpreendimento={regrasEmp}
              onSave={async (m) => {
                if (!empresaAtualId) return;
                try {
                  const criada = await criarUnidadeRemota(empresaAtualId, {
                    ...m,
                    empreendimentoId: emp.id,
                  });
                  setState((s) => ({
                    ...s,
                    matriculas: [...s.matriculas, criada],
                  }));
                  toast.success("Unidade cadastrada");
                  setUnitOpen(false);
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Não foi possível cadastrar a unidade",
                  );
                }
              }}
            />
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matrícula</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Agrupamento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Regra financeira</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matriculas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma unidade cadastrada.
                  </TableCell>
                </TableRow>
              )}
              {matriculas.map((m) => {
                const quadra = m.quadraId ? quadras.find((q) => q.id === m.quadraId) : undefined;
                const efetiva = regrasEfetivasUnidade(emp, m, quadra, state.config);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.numero}</TableCell>
                    <TableCell>
                      <div>{m.unidade}</div>
                      <div className="text-[11px] text-muted-foreground">{num(m.area)} m²</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {quadra
                        ? `${agrupamentoTipoLegivel(quadra.tipoAgrupamento)} · ${quadra.nome}`
                        : "Direto no empreendimento"}
                    </TableCell>
                    <TableCell className="text-right">{brl(m.valorVenda)}</TableCell>
                    <TableCell className="text-sm">{origemRegra(efetiva.origem, quadra, emp)}</TableCell>
                    <TableCell>
                      <MatriculaStatusBadge status={m.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditUnidade(m)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Regra / vínculo
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editUnidade} onOpenChange={(open) => !open && setEditUnidade(null)}>
        {editUnidade && (
          <EditUnidadeDialog
            empreendimento={emp}
            unidade={editUnidade}
            quadras={quadras}
            regrasEmpreendimento={regrasEmp}
            onSave={async (patch) => {
              if (!empresaAtualId) return;
              try {
                const salva = await atualizarUnidadeRemota(
                  empresaAtualId,
                  editUnidade,
                  patch,
                );
                setState((s) => ({
                  ...s,
                  matriculas: s.matriculas.map((m) =>
                    m.id === editUnidade.id ? salva : m,
                  ),
                }));
                toast.success("Unidade atualizada");
                setEditUnidade(null);
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Não foi possível atualizar a unidade",
                );
              }
            }}
          />
        )}
      </Dialog>
    </PageShell>
  );
}

function cloneRegras(regras: RegrasOperacao): RegrasOperacao {
  return { ...regras, inadimplencia: { ...regras.inadimplencia } };
}

function validaRegras(regras: RegrasOperacao) {
  return Math.abs(regras.socioPct + regras.empresaPct - 100) <= 0.001;
}

function ResumoRegras({ regras }: { regras: RegrasOperacao }) {
  const inad = regras.inadimplencia;
  const atraso = [
    inad.correcaoAtiva ? `correção ${inad.correcaoPctMes}% a.m.` : null,
    inad.jurosAtivo
      ? inad.jurosTipo === "diario"
        ? `juros ${inad.jurosPctDia}% a.d.`
        : `juros ${inad.jurosPctMes}% a.m.`
      : null,
    inad.moraAtiva ? `multa ${inad.moraPct}%` : null,
    inad.toleranciaAtiva ? `${inad.diasTolerancia} dia(s) de tolerância` : null,
  ].filter(Boolean);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        <Info label="Tributação" value={`${regras.aliquotaTributaria}%`} />
        <Info label="Corretor" value={`${regras.corretorPct}%`} />
        <Info label="Sócio · saldo líquido" value={`${regras.socioPct}%`} />
        <Info label="Empresa · saldo líquido" value={`${regras.empresaPct}%`} />
        <Info label="Repasse por recebimento" value={`${regras.repasseComissaoPct ?? 50}%`} />
        <Info
          label="Comissão sobre acréscimos"
          value={regras.comissaoSobreAcrescimos ? "Sim" : "Não"}
        />
      </div>
      <div className="rounded-lg border border-border/60 bg-background/70 p-3 text-sm">
        <span className="text-muted-foreground">Inadimplência: </span>
        <span>{atraso.length ? atraso.join(" · ") : "sem acréscimos automáticos"}</span>
      </div>
    </>
  );
}

function QuadraDialog({
  empreendimento,
  regrasBase,
  quadra,
  onSave,
}: {
  empreendimento: Empreendimento;
  regrasBase: RegrasOperacao;
  quadra?: Quadra;
  onSave: (quadra: Omit<Quadra, "id" | "empreendimentoId">) => void;
}) {
  const [nome, setNome] = useState(quadra?.nome || "");
  const [tipoAgrupamento, setTipoAgrupamento] = useState<AgrupamentoTipo>(
    quadra?.tipoAgrupamento ?? "quadra",
  );
  const [descricao, setDescricao] = useState(quadra?.descricao || "");
  const [regraPropria, setRegraPropria] = useState(Boolean(quadra?.regras));
  const [regras, setRegras] = useState<RegrasOperacao>(
    cloneRegras(quadra?.regras ?? regrasBase),
  );

  const salvar = () => {
    if (!nome.trim()) {
      toast.error("Informe o nome do agrupamento");
      return;
    }
    if (regraPropria && !validaRegras(regras)) {
      toast.error("Sócio + Empresa precisam totalizar 100% do saldo líquido");
      return;
    }
    onSave({
      nome: nome.trim(),
      tipoAgrupamento,
      descricao: descricao.trim(),
      regras: regraPropria ? regras : undefined,
    });
  };

  return (
    <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{quadra ? `Editar ${quadra.nome}` : "Novo agrupamento"}</DialogTitle>
        <DialogDescription>
          Crie uma quadra, bloco ou setor dentro de {empreendimento.nome}. Sem exceção financeira,
          este nível acompanha automaticamente as regras atuais do empreendimento.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Tipo</Label>
          <Select
            value={tipoAgrupamento}
            onValueChange={(value) => setTipoAgrupamento(value as AgrupamentoTipo)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="quadra">Quadra</SelectItem>
              <SelectItem value="bloco">Bloco</SelectItem>
              <SelectItem value="setor">Setor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Nome</Label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={
              tipoAgrupamento === "bloco"
                ? "Ex.: Bloco A"
                : tipoAgrupamento === "setor"
                  ? "Ex.: Setor Norte"
                  : "Ex.: Quadra A"
            }
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Descrição</Label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
      </div>
      <div className="rounded-lg border border-border/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">
              Regra financeira própria deste {agrupamentoTipoLegivel(tipoAgrupamento).toLowerCase()}
            </p>
            <p className="text-xs text-muted-foreground">
              Desligado: herda automaticamente de {empreendimento.nome}.
            </p>
          </div>
          <Switch
            checked={regraPropria}
            onCheckedChange={(checked) => {
              setRegraPropria(checked);
              if (checked && !quadra?.regras) setRegras(cloneRegras(regrasBase));
            }}
          />
        </div>
        {regraPropria && (
          <div className="mt-4">
            <RegrasOperacaoForm
              value={regras}
              onChange={setRegras}
              scopeLabel={`${agrupamentoTipoLegivel(tipoAgrupamento)} · ${nome || "novo agrupamento"} · ${empreendimento.nome}`}
            />
          </div>
        )}
      </div>
      <DialogFooter>
        <Button onClick={salvar}>Salvar agrupamento</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function NewUnidadeDialog({
  empreendimento,
  quadras,
  regrasEmpreendimento,
  onSave,
}: {
  empreendimento: Empreendimento;
  quadras: Quadra[];
  regrasEmpreendimento: RegrasOperacao;
  onSave: (m: Omit<Matricula, "id" | "empreendimentoId">) => void;
}) {
  const [numero, setNumero] = useState("");
  const [unidade, setUnidade] = useState("");
  const [unidadeTipo, setUnidadeTipo] = useState<UnidadeTipo>("lote");
  const [descricao, setDescricao] = useState("");
  const [area, setArea] = useState("");
  const [valor, setValor] = useState(0);
  const [status, setStatus] = useState<MatriculaStatus>("disponivel");
  const [quadraId, setQuadraId] = useState("sem_quadra");
  const [regraPropria, setRegraPropria] = useState(false);
  const regraBase = useMemo(() => {
    const quadra = quadras.find((q) => q.id === quadraId);
    return cloneRegras(quadra?.regras ?? regrasEmpreendimento);
  }, [quadras, quadraId, regrasEmpreendimento]);
  const [regras, setRegras] = useState<RegrasOperacao>(cloneRegras(regrasEmpreendimento));

  const salvar = () => {
    if (!numero.trim() || !unidade.trim()) {
      toast.error("Informe matrícula e unidade");
      return;
    }
    if (regraPropria && !validaRegras(regras)) {
      toast.error("Sócio + Empresa precisam totalizar 100% do saldo líquido");
      return;
    }
    onSave({
      numero: numero.trim(),
      unidade: unidade.trim(),
      unidadeTipo,
      descricao: descricao.trim() || undefined,
      area: Number(area) || 0,
      valorVenda: valor,
      status,
      quadraId: quadraId === "sem_quadra" ? undefined : quadraId,
      regras: regraPropria ? regras : undefined,
    });
  };

  return (
    <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Nova unidade</DialogTitle>
        <DialogDescription>
          A unidade pode ficar diretamente em {empreendimento.nome} ou pertencer a uma quadra, bloco ou setor.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Número da matrícula</Label>
          <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
        </div>
        <div>
          <Label>Unidade / Lote</Label>
          <Input value={unidade} onChange={(e) => setUnidade(e.target.value)} />
        </div>
        <div>
          <Label>Tipo de unidade</Label>
          <Select value={unidadeTipo} onValueChange={(value) => setUnidadeTipo(value as UnidadeTipo)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lote">Lote</SelectItem>
              <SelectItem value="apartamento">Apartamento</SelectItem>
              <SelectItem value="sala">Sala</SelectItem>
              <SelectItem value="casa">Casa</SelectItem>
              <SelectItem value="loja">Loja</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Agrupamento</Label>
          <Select
            value={quadraId}
            onValueChange={setQuadraId}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sem_quadra">Direto no empreendimento</SelectItem>
              {quadras.map((q) => (
                <SelectItem key={q.id} value={q.id}>
                  {agrupamentoTipoLegivel(q.tipoAgrupamento)} · {q.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Descrição</Label>
          <Input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as MatriculaStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="disponivel">Disponível</SelectItem>
              <SelectItem value="reservado">Reservado</SelectItem>
              <SelectItem value="vendido">Vendido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Área (m²)</Label>
          <Input type="number" min="0" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <div>
          <Label>Valor de venda (R$)</Label>
          <CurrencyInput value={valor} onValueChange={setValor} placeholder="Ex.: 100.000,00" />
        </div>
      </div>
      <div className="rounded-lg border border-border/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Regra própria desta unidade</p>
            <p className="text-xs text-muted-foreground">
              Desligado: {quadraId === "sem_quadra"
                ? `herda diretamente de ${empreendimento.nome}`
                : (() => {
                    const grupo = quadras.find((item) => item.id === quadraId);
                    return grupo?.regras
                      ? `herda de ${agrupamentoTipoLegivel(grupo.tipoAgrupamento).toLowerCase()} ${grupo.nome}`
                      : `o agrupamento não tem exceção; herda de ${empreendimento.nome}`;
                  })()}.
            </p>
          </div>
          <Switch
            checked={regraPropria}
            onCheckedChange={(checked) => {
              setRegraPropria(checked);
              if (checked) setRegras(cloneRegras(regraBase));
            }}
          />
        </div>
        {regraPropria && (
          <div className="mt-4">
            <RegrasOperacaoForm
              value={regras}
              onChange={setRegras}
              scopeLabel={`Unidade · ${unidade || "nova unidade"} · ${empreendimento.nome}`}
            />
          </div>
        )}
      </div>
      <DialogFooter>
        <Button onClick={salvar}>Cadastrar unidade</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function EditUnidadeDialog({
  empreendimento,
  unidade,
  quadras,
  regrasEmpreendimento,
  onSave,
}: {
  empreendimento: Empreendimento;
  unidade: Matricula;
  quadras: Quadra[];
  regrasEmpreendimento: RegrasOperacao;
  onSave: (patch: Partial<Matricula>) => void;
}) {
  const [quadraId, setQuadraId] = useState(unidade.quadraId || "sem_quadra");
  const [regraPropria, setRegraPropria] = useState(Boolean(unidade.regras));
  const quadraInicial = quadras.find((q) => q.id === unidade.quadraId);
  const [regras, setRegras] = useState<RegrasOperacao>(
    cloneRegras(unidade.regras ?? quadraInicial?.regras ?? regrasEmpreendimento),
  );

  const regraBase = () => {
    const q = quadras.find((item) => item.id === quadraId);
    return cloneRegras(q?.regras ?? regrasEmpreendimento);
  };

  const salvar = () => {
    if (regraPropria && !validaRegras(regras)) {
      toast.error("Sócio + Empresa precisam totalizar 100% do saldo líquido");
      return;
    }
    onSave({
      quadraId: quadraId === "sem_quadra" ? undefined : quadraId,
      regras: regraPropria ? regras : undefined,
    });
  };

  return (
    <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Regra e vínculo — {unidade.unidade}</DialogTitle>
        <DialogDescription>
          Defina o agrupamento e, somente se necessário, uma exceção financeira específica desta unidade.
        </DialogDescription>
      </DialogHeader>
      <div>
        <Label>Quadra</Label>
        <Select
          value={quadraId}
          onValueChange={setQuadraId}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sem_quadra">Sem quadra</SelectItem>
            {quadras.map((q) => <SelectItem key={q.id} value={q.id}>{q.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border border-border/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Regra própria desta unidade</p>
            <p className="text-xs text-muted-foreground">
              Desligue para voltar a herdar automaticamente do agrupamento escolhido ou do empreendimento.
            </p>
          </div>
          <Switch
            checked={regraPropria}
            onCheckedChange={(checked) => {
              setRegraPropria(checked);
              if (checked && !unidade.regras) setRegras(regraBase());
            }}
          />
        </div>
        {regraPropria && (
          <div className="mt-4">
            <RegrasOperacaoForm
              value={regras}
              onChange={setRegras}
              scopeLabel={`Unidade · ${unidade.unidade} · ${empreendimento.nome}`}
            />
          </div>
        )}
      </div>
      <DialogFooter>
        <Button onClick={salvar}>Salvar unidade</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function EditEmpreendimentoDialog({
  emp,
  regrasAtuais,
  onSave,
}: {
  emp: Empreendimento;
  regrasAtuais: RegrasOperacao;
  onSave: (patch: Partial<Empreendimento>) => void;
}) {
  const [nome, setNome] = useState(emp.nome);
  const [spe, setSpe] = useState(emp.spe);
  const [cnpj, setCnpj] = useState(emp.cnpj);
  const [areaTotal, setAreaTotal] = useState(String(emp.areaTotal || ""));
  const [tipo, setTipo] = useState<EmpreendimentoTipo>(emp.tipo);
  const [matriculasCount, setMatriculasCount] = useState(String(emp.matriculasCount || ""));
  const [valorTotal, setValorTotal] = useState(emp.valorTotal || 0);
  const [observacoes, setObservacoes] = useState(emp.observacoes || "");
  const [status, setStatus] = useState<EmpStatus>(emp.status);
  const [regras, setRegras] = useState<RegrasOperacao>(cloneRegras(regrasAtuais));

  const salvar = () => {
    if (!nome.trim() || !spe.trim()) {
      toast.error("Informe o nome do empreendimento e a SPE responsável.");
      return;
    }
    if (!validaRegras(regras)) {
      toast.error("Sócio + Empresa precisam totalizar 100% do saldo líquido");
      return;
    }
    onSave({
      nome: nome.trim(),
      spe: spe.trim(),
      cnpj,
      areaTotal: Number(areaTotal) || 0,
      tipo,
      matriculasCount: Number(matriculasCount) || 0,
      valorTotal,
      socioPct: regras.socioPct,
      empresaPct: regras.empresaPct,
      corretorPct: regras.corretorPct,
      aliquotaTributaria: regras.aliquotaTributaria,
      entradaPctCorretor: regras.corretorPct,
      parcelasPctCorretor: regras.corretorPct,
      repasseComissaoPct: regras.repasseComissaoPct ?? 50,
      comissaoSobreAcrescimos: regras.comissaoSobreAcrescimos ?? false,
      inadimplencia: cloneRegras(regras).inadimplencia,
      observacoes: observacoes.trim(),
      status,
    });
  };

  return (
    <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Editar {emp.nome}</DialogTitle>
        <DialogDescription>
          Estas regras servem como padrão para novas vendas deste empreendimento. Vendas já criadas
          mantêm suas próprias regras até serem editadas individualmente, e recebimentos históricos
          nunca são reescritos.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Nome do empreendimento</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <Label>SPE responsável</Label>
          <Input value={spe} onChange={(e) => setSpe(e.target.value)} />
        </div>
        <div>
          <Label>CNPJ da SPE</Label>
          <Input value={cnpj} onChange={(e) => setCnpj(formatCNPJ(e.target.value))} />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as EmpreendimentoTipo)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="loteamento">Loteamento</SelectItem>
              <SelectItem value="vertical">Vertical</SelectItem>
              <SelectItem value="horizontal">Horizontal</SelectItem>
              <SelectItem value="comercial">Comercial</SelectItem>
              <SelectItem value="misto">Misto</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as EmpStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="planejamento">Planejamento</SelectItem>
              <SelectItem value="lancamento">Lançamento</SelectItem>
              <SelectItem value="em_vendas">Em vendas</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Área total (m²)</Label>
          <Input type="number" min="0" value={areaTotal} onChange={(e) => setAreaTotal(e.target.value)} />
        </div>
        <div>
          <Label>Unidades previstas</Label>
          <Input type="number" min="0" value={matriculasCount} onChange={(e) => setMatriculasCount(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>VGV / valor total estimado (R$)</Label>
          <CurrencyInput value={valorTotal} onValueChange={setValorTotal} placeholder="Ex.: 2.000.000,00" />
        </div>
      </div>
      <RegrasOperacaoForm
        value={regras}
        onChange={setRegras}
        scopeLabel={`Empreendimento · ${nome || emp.nome}`}
      />
      <div>
        <Label>Observações</Label>
        <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
      </div>
      <DialogFooter>
        <Button onClick={salvar}>Salvar alterações</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function origemRegra(
  origem: "empreendimento" | "quadra" | "unidade",
  quadra: Quadra | undefined,
  emp: Empreendimento,
) {
  if (origem === "unidade") return "Regra própria da unidade";
  if (origem === "quadra") {
    return `Herda de ${agrupamentoTipoLegivel(quadra?.tipoAgrupamento).toLowerCase()} ${quadra?.nome || ""}`.trim();
  }
  return `Herda de ${emp.nome}`;
}

function agrupamentoTipoLegivel(tipo?: AgrupamentoTipo) {
  if (tipo === "bloco") return "Bloco";
  if (tipo === "setor") return "Setor";
  return "Quadra";
}

function tipoLegivel(tipo: EmpreendimentoTipo) {
  const labels: Record<EmpreendimentoTipo, string> = {
    loteamento: "Loteamento",
    vertical: "Vertical",
    horizontal: "Horizontal",
    comercial: "Comercial",
    misto: "Misto",
    outro: "Outro",
  };
  return labels[tipo] ?? "Outro";
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}
