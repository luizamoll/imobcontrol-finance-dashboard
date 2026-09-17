import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
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
import { brl0, formatCNPJ, num, pct } from "@/lib/format";
import {
  empTotais,
  regrasEfetivasEmpreendimento,
  useStore,
  type Empreendimento,
  type EmpreendimentoTipo,
  type EmpStatus,
  type InicioJuros,
  type JurosTipo,
  type MatriculaStatus,
  type RegrasContrato,
  type RegrasInadimplencia,
} from "@/lib/store";

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
  const { state, setState, addMatricula, updateEmpreendimento } = useStore();
  const emp = state.empreendimentos.find((e) => e.id === id);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!emp) throw notFound();

  const regras = regrasEfetivasEmpreendimento(emp, state.config);
  const t = empTotais(emp.id, state.vendas, state.parcelas);
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

    setState((s) => ({
      ...s,
      empreendimentos: s.empreendimentos.filter((e) => e.id !== emp.id),
      matriculas: s.matriculas.filter((m) => m.empreendimentoId !== emp.id),
    }));
    toast.success(`Empreendimento "${emp.nome}" excluído`);
    setDeleteOpen(false);
    navigate({ to: "/empreendimentos" });
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
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </div>
        }
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <EditEmpreendimentoDialog
          emp={emp}
          regrasAtuais={regras}
          onSave={(patch) => {
            updateEmpreendimento(emp.id, patch);
            toast.success("Empreendimento atualizado");
            setEditOpen(false);
          }}
        />
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir empreendimento?</DialogTitle>
            <DialogDescription>
              Esta ação remove o empreendimento e as unidades cadastradas nele. Vendas e recebimentos
              nunca são apagados por esta ação.
            </DialogDescription>
          </DialogHeader>

          {possuiHistoricoFinanceiro ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-medium text-destructive">Exclusão bloqueada</p>
              <p className="mt-1 text-muted-foreground">
                Existem {vendas.length} venda(s), {parcelas.length} parcela(s) ou {movimentos.length}{" "}
                recebimento(s) ligados a este empreendimento. O histórico precisa ser preservado.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
              {matriculas.length > 0
                ? `${matriculas.length} unidade(s) cadastrada(s) também serão removidas.`
                : "Nenhuma unidade, venda ou recebimento será afetado."}
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
        <StatBox label="VGV" value={brl0(emp.valorTotal)} />
        <StatBox label="Vendido" value={brl0(t.vendido)} sub={pct(vendidoPct)} />
        <StatBox label="Recebido" value={brl0(t.recebido)} />
        <StatBox label="Saldo a receber" value={brl0(t.saldo)} />
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
            <Info label="Unidades cadastradas" value={String(matriculas.length)} />
            <Info label="Vendas ativas / quitadas" value={String(t.vendas)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Regras financeiras — {emp.nome}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Aplicado a: <strong>Empreendimento · {emp.nome}</strong>. Novas vendas recebem uma cópia
              destas regras; contratos já existentes não são alterados.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Editar regras
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <Info label="Tributação" value={`${regras.aliquotaTributaria}%`} />
            <Info label="Corretor" value={`${emp.corretorPct}%`} />
            <Info label="Sócio · saldo líquido" value={`${regras.socioPct}%`} />
            <Info label="Empresa · saldo líquido" value={`${regras.empresaPct}%`} />
            <Info label="Entrada → comissão" value={`${regras.entradaPctCorretor}%`} />
            <Info label="Parcelas → comissão" value={`${regras.parcelasPctCorretor}%`} />
          </div>
          <div className="rounded-lg border border-border/60 bg-background/70 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Inadimplência
            </p>
            <p className="mt-1 text-sm text-foreground">
              {resumoInadimplencia(regras.inadimplencia)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            Unidades / Matrículas
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Nova unidade
              </Button>
            </DialogTrigger>
            <NewMatriculaDialog
              onSave={(m) => {
                addMatricula({ ...m, empreendimentoId: emp.id });
                toast.success("Unidade cadastrada");
                setOpen(false);
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
                <TableHead className="text-right">Área</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matriculas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma unidade cadastrada.
                  </TableCell>
                </TableRow>
              )}
              {matriculas.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.numero}</TableCell>
                  <TableCell>{m.unidade}</TableCell>
                  <TableCell className="text-right">{num(m.area)} m²</TableCell>
                  <TableCell className="text-right">{brl0(m.valorVenda)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {m.compradorNome || "—"}
                  </TableCell>
                  <TableCell>
                    <MatriculaStatusBadge status={m.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
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

function resumoInadimplencia(regra: RegrasInadimplencia) {
  const itens: string[] = [];
  if (regra.correcaoAtiva) {
    itens.push(
      `correção ${regra.correcaoIndice ? `${regra.correcaoIndice} ` : ""}${regra.correcaoPctMes}% a.m.`,
    );
  }
  if (regra.jurosAtivo) {
    itens.push(
      regra.jurosTipo === "diario"
        ? `juros ${regra.jurosPctDia}% a.d.`
        : `juros ${regra.jurosPctMes}% a.m.`,
    );
  }
  if (regra.moraAtiva) itens.push(`multa ${regra.moraPct}%`);
  if (regra.toleranciaAtiva) itens.push(`${regra.diasTolerancia} dia(s) de tolerância`);
  return itens.length > 0 ? itens.join(" · ") : "Sem acréscimos automáticos configurados.";
}

function EditEmpreendimentoDialog({
  emp,
  regrasAtuais,
  onSave,
}: {
  emp: Empreendimento;
  regrasAtuais: RegrasContrato;
  onSave: (patch: Partial<Empreendimento>) => void;
}) {
  const [nome, setNome] = useState(emp.nome);
  const [spe, setSpe] = useState(emp.spe);
  const [cnpj, setCnpj] = useState(emp.cnpj);
  const [areaTotal, setAreaTotal] = useState(String(emp.areaTotal || ""));
  const [tipo, setTipo] = useState<EmpreendimentoTipo>(emp.tipo);
  const [matriculasCount, setMatriculasCount] = useState(String(emp.matriculasCount || ""));
  const [valorTotal, setValorTotal] = useState(String(emp.valorTotal || ""));
  const [socioPct, setSocioPct] = useState(String(regrasAtuais.socioPct));
  const [empresaPct, setEmpresaPct] = useState(String(regrasAtuais.empresaPct));
  const [corretorPct, setCorretorPct] = useState(String(emp.corretorPct));
  const [aliquotaTributaria, setAliquotaTributaria] = useState(
    String(regrasAtuais.aliquotaTributaria),
  );
  const [entradaPct, setEntradaPct] = useState(String(regrasAtuais.entradaPctCorretor));
  const [parcelasPct, setParcelasPct] = useState(String(regrasAtuais.parcelasPctCorretor));
  const [observacoes, setObservacoes] = useState(emp.observacoes || "");
  const [status, setStatus] = useState<EmpStatus>(emp.status);

  const baseInad = regrasAtuais.inadimplencia;
  const [correcaoAtiva, setCorrecaoAtiva] = useState(baseInad.correcaoAtiva);
  const [correcaoIndice, setCorrecaoIndice] = useState(baseInad.correcaoIndice);
  const [correcaoPct, setCorrecaoPct] = useState(String(baseInad.correcaoPctMes));
  const [jurosAtivo, setJurosAtivo] = useState(baseInad.jurosAtivo);
  const [jurosTipo, setJurosTipo] = useState<JurosTipo>(baseInad.jurosTipo);
  const [jurosPctMes, setJurosPctMes] = useState(String(baseInad.jurosPctMes));
  const [jurosPctDia, setJurosPctDia] = useState(String(baseInad.jurosPctDia));
  const [inicioJuros, setInicioJuros] = useState<InicioJuros>(baseInad.inicioJuros);
  const [moraAtiva, setMoraAtiva] = useState(baseInad.moraAtiva);
  const [moraPct, setMoraPct] = useState(String(baseInad.moraPct));
  const [toleranciaAtiva, setToleranciaAtiva] = useState(baseInad.toleranciaAtiva);
  const [diasTolerancia, setDiasTolerancia] = useState(String(baseInad.diasTolerancia));

  const salvar = () => {
    const socio = Number(socioPct) || 0;
    const empresa = Number(empresaPct) || 0;

    if (!nome.trim() || !spe.trim()) {
      toast.error("Informe o nome do empreendimento e a SPE responsável.");
      return;
    }
    if (Math.abs(socio + empresa - 100) > 0.001) {
      toast.error("Sócio + Empresa precisam totalizar 100% do saldo líquido", {
        description: `Sócio (${socio}%) + Empresa (${empresa}%) = ${socio + empresa}%.`,
      });
      return;
    }

    const inadimplencia: RegrasInadimplencia = {
      correcaoAtiva,
      correcaoIndice: correcaoIndice.trim(),
      correcaoPctMes: Number(correcaoPct) || 0,
      jurosAtivo,
      jurosTipo,
      jurosPctMes: Number(jurosPctMes) || 0,
      jurosPctDia: Number(jurosPctDia) || 0,
      inicioJuros,
      moraAtiva,
      moraPct: Number(moraPct) || 0,
      toleranciaAtiva,
      diasTolerancia: Number(diasTolerancia) || 0,
    };

    onSave({
      nome: nome.trim(),
      spe: spe.trim(),
      cnpj,
      areaTotal: Number(areaTotal) || 0,
      tipo,
      matriculasCount: Number(matriculasCount) || 0,
      valorTotal: Number(valorTotal) || 0,
      socioPct: socio,
      empresaPct: empresa,
      corretorPct: Number(corretorPct) || 0,
      aliquotaTributaria: Number(aliquotaTributaria) || 0,
      entradaPctCorretor: Number(entradaPct) || 0,
      parcelasPctCorretor: Number(parcelasPct) || 0,
      inadimplencia,
      observacoes: observacoes.trim(),
      status,
    });
  };

  return (
    <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Editar {emp.nome}</DialogTitle>
        <DialogDescription>
          As regras editadas aqui pertencem ao empreendimento {emp.nome} e só afetam novas vendas.
          Contratos registrados preservam o snapshot original.
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
          <Input
            value={cnpj}
            onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
            placeholder="00.000.000/0000-00"
          />
        </div>
        <div>
          <Label>Tipo de empreendimento</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as EmpreendimentoTipo)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
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
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
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
          <Input
            type="number"
            min="0"
            value={areaTotal}
            onChange={(e) => setAreaTotal(e.target.value)}
          />
        </div>
        <div>
          <Label>Unidades previstas</Label>
          <Input
            type="number"
            min="0"
            value={matriculasCount}
            onChange={(e) => setMatriculasCount(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>VGV / valor total estimado (R$)</Label>
          <Input
            type="number"
            min="0"
            value={valorTotal}
            onChange={(e) => setValorTotal(e.target.value)}
          />
        </div>

        <div className="sm:col-span-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold">Regras financeiras — {nome || emp.nome}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Aplicado a: Empreendimento · {nome || emp.nome}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Sócio no saldo líquido (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={socioPct}
                onChange={(e) => setSocioPct(e.target.value)}
              />
            </div>
            <div>
              <Label>Empresa no saldo líquido (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={empresaPct}
                onChange={(e) => setEmpresaPct(e.target.value)}
              />
            </div>
            <div>
              <Label>Comissão do corretor (%)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={corretorPct}
                onChange={(e) => setCorretorPct(e.target.value)}
              />
            </div>
            <div>
              <Label>Alíquota tributária (%)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={aliquotaTributaria}
                onChange={(e) => setAliquotaTributaria(e.target.value)}
              />
            </div>
            <div>
              <Label>% da entrada destinado à comissão</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={entradaPct}
                onChange={(e) => setEntradaPct(e.target.value)}
              />
            </div>
            <div>
              <Label>% das parcelas destinado à comissão</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={parcelasPct}
                onChange={(e) => setParcelasPct(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="sm:col-span-2 rounded-lg border border-border/70 p-4">
          <p className="text-sm font-semibold">Inadimplência — {nome || emp.nome}</p>
          <div className="mt-4 space-y-4">
            <RegraToggle
              titulo="Correção contratual"
              ativa={correcaoAtiva}
              onAtiva={setCorrecaoAtiva}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Referência / descrição</Label>
                  <Input
                    value={correcaoIndice}
                    onChange={(e) => setCorrecaoIndice(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">% ao mês</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={correcaoPct}
                    onChange={(e) => setCorrecaoPct(e.target.value)}
                  />
                </div>
              </div>
            </RegraToggle>

            <RegraToggle titulo="Juros" ativa={jurosAtivo} onAtiva={setJurosAtivo}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label className="text-xs">Periodicidade</Label>
                  <Select value={jurosTipo} onValueChange={(v) => setJurosTipo(v as JurosTipo)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="diario">Diário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">
                    {jurosTipo === "diario" ? "% ao dia" : "% ao mês"}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step={jurosTipo === "diario" ? "0.001" : "0.01"}
                    value={jurosTipo === "diario" ? jurosPctDia : jurosPctMes}
                    onChange={(e) =>
                      jurosTipo === "diario"
                        ? setJurosPctDia(e.target.value)
                        : setJurosPctMes(e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Início</Label>
                  <Select
                    value={inicioJuros}
                    onValueChange={(v) => setInicioJuros(v as InicioJuros)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vencimento">No vencimento</SelectItem>
                      <SelectItem value="apos_tolerancia">Após tolerância</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </RegraToggle>

            <RegraToggle titulo="Multa por atraso" ativa={moraAtiva} onAtiva={setMoraAtiva}>
              <Label className="text-xs">Percentual fixo (%)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={moraPct}
                onChange={(e) => setMoraPct(e.target.value)}
              />
            </RegraToggle>

            <RegraToggle
              titulo="Dias de tolerância"
              ativa={toleranciaAtiva}
              onAtiva={setToleranciaAtiva}
            >
              <Label className="text-xs">Quantidade de dias</Label>
              <Input
                type="number"
                min="0"
                value={diasTolerancia}
                onChange={(e) => setDiasTolerancia(e.target.value)}
              />
            </RegraToggle>
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label>Observações</Label>
          <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>
      </div>

      <DialogFooter>
        <Button onClick={salvar}>Salvar alterações</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function RegraToggle({
  titulo,
  ativa,
  onAtiva,
  children,
}: {
  titulo: string;
  ativa: boolean;
  onAtiva: (ativa: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm font-medium">{titulo}</Label>
        <Switch checked={ativa} onCheckedChange={onAtiva} />
      </div>
      {ativa && <div className="mt-3">{children}</div>}
    </div>
  );
}

function NewMatriculaDialog({
  onSave,
}: {
  onSave: (m: {
    numero: string;
    unidade: string;
    area: number;
    valorVenda: number;
    status: MatriculaStatus;
  }) => void;
}) {
  const [numero, setNumero] = useState("");
  const [unidade, setUnidade] = useState("");
  const [area, setArea] = useState("");
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState<MatriculaStatus>("disponivel");

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nova unidade</DialogTitle>
        <DialogDescription>
          Cadastre a unidade comercializável e, quando houver, o número da matrícula correspondente.
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
          <Label>Área (m²)</Label>
          <Input type="number" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <div>
          <Label>Valor de venda (R$)</Label>
          <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as MatriculaStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="disponivel">Disponível</SelectItem>
              <SelectItem value="reservado">Reservado</SelectItem>
              <SelectItem value="vendido">Vendido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() =>
            onSave({
              numero,
              unidade,
              area: Number(area) || 0,
              valorVenda: Number(valor) || 0,
              status,
            })
          }
          disabled={!numero || !unidade}
        >
          Cadastrar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
