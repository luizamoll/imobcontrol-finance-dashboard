import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Plus, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { EmpStatusBadge } from "@/components/status-badges";
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
  DEFAULT_REGRAS_INADIMPLENCIA,
  empTotais,
  useStore,
  type EmpStatus,
  type EmpreendimentoTipo,
  type InicioJuros,
  type JurosTipo,
  type RegrasInadimplencia,
} from "@/lib/store";

export const Route = createFileRoute("/empreendimentos/")({
  component: EmpreendimentosList,
});

function EmpreendimentosList() {
  const { state, addEmpreendimento } = useStore();
  const [open, setOpen] = useState(false);
  const hasEmpreendimentos = state.empreendimentos.length > 0;

  const handleImport = () => {
    toast.info("Importação ainda não disponível", {
      description:
        "Para evitar dados inconsistentes, a importação será liberada quando a validação pelo back-end estiver concluída.",
    });
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Portfólio"
        title="Empreendimentos"
        description="Cadastre os empreendimentos reais da operação e acompanhe suas unidades, vendas e recebimentos."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="mr-2 h-4 w-4" />
              Importar · em breve
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo empreendimento
            </Button>
          </>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <NewEmpreendimentoDialog
          onSave={(e) => {
            addEmpreendimento(e);
            toast.success(`Empreendimento "${e.nome}" cadastrado`);
            setOpen(false);
          }}
        />
      </Dialog>

      {!hasEmpreendimentos ? (
        <Card className="border-dashed border-border/80">
          <CardContent className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Cadastre seu primeiro empreendimento
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Comece pelos dados do projeto e pelas regras financeiras que pertencem especificamente a
              ele. Depois inclua as unidades comercializáveis.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar empreendimento
              </Button>
              <Button variant="outline" onClick={handleImport}>
                <Upload className="mr-2 h-4 w-4" />
                Importar · em breve
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/70">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empreendimento</TableHead>
                  <TableHead>SPE · CNPJ</TableHead>
                  <TableHead className="text-right">Área total</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">VGV</TableHead>
                  <TableHead className="text-right">Vendido</TableHead>
                  <TableHead className="text-right">Recebido</TableHead>
                  <TableHead className="text-right">Saldo a receber</TableHead>
                  <TableHead>% vendido</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.empreendimentos.map((e) => {
                  const t = empTotais(e.id, state.vendas, state.parcelas);
                  const vendidoPct = e.valorTotal
                    ? Math.min(100, (t.vendido / e.valorTotal) * 100)
                    : 0;
                  const cadastradas = state.matriculas.filter(
                    (m) => m.empreendimentoId === e.id,
                  ).length;
                  return (
                    <TableRow key={e.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <Link
                          to="/empreendimentos/$id"
                          params={{ id: e.id }}
                          className="flex items-center gap-2 text-foreground hover:text-primary"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Building2 className="h-4 w-4" />
                          </div>
                          {e.nome}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="text-foreground">{e.spe}</div>
                        <div className="text-xs text-muted-foreground">
                          {e.cnpj || "CNPJ não informado"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{num(e.areaTotal)} m²</TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium">{cadastradas}</span>
                        <span className="text-muted-foreground"> / {e.matriculasCount || 0}</span>
                        <div className="text-[11px] text-muted-foreground">
                          cadastradas / previstas
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{brl0(e.valorTotal)}</TableCell>
                      <TableCell className="text-right">{brl0(t.vendido)}</TableCell>
                      <TableCell className="text-right text-success">{brl0(t.recebido)}</TableCell>
                      <TableCell className="text-right">{brl0(t.saldo)}</TableCell>
                      <TableCell className="w-40">
                        <div className="flex items-center gap-2">
                          <Progress value={vendidoPct} className="h-1.5" />
                          <span className="w-12 text-right text-xs text-muted-foreground">
                            {pct(vendidoPct)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <EmpStatusBadge status={e.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}

type NovoEmpreendimento = {
  nome: string;
  spe: string;
  cnpj: string;
  areaTotal: number;
  tipo: EmpreendimentoTipo;
  matriculasCount: number;
  valorTotal: number;
  socioPct: number;
  empresaPct: number;
  corretorPct: number;
  aliquotaTributaria: number;
  entradaPctCorretor: number;
  parcelasPctCorretor: number;
  inadimplencia: RegrasInadimplencia;
  observacoes?: string;
  status: EmpStatus;
};

function NewEmpreendimentoDialog({ onSave }: { onSave: (e: NovoEmpreendimento) => void }) {
  const [nome, setNome] = useState("");
  const [spe, setSpe] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [areaTotal, setAreaTotal] = useState("");
  const [tipo, setTipo] = useState<EmpreendimentoTipo>("loteamento");
  const [matriculasCount, setMatriculasCount] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [socioPct, setSocioPct] = useState("");
  const [empresaPct, setEmpresaPct] = useState("");
  const [corretorPct, setCorretorPct] = useState("");
  const [aliq, setAliq] = useState("");
  const [entradaPct, setEntradaPct] = useState("");
  const [parcelasPct, setParcelasPct] = useState("");
  const [obs, setObs] = useState("");
  const [status, setStatus] = useState<EmpStatus>("planejamento");

  const [correcaoAtiva, setCorrecaoAtiva] = useState(false);
  const [correcaoIndice, setCorrecaoIndice] = useState("");
  const [correcaoPct, setCorrecaoPct] = useState("");
  const [jurosAtivo, setJurosAtivo] = useState(false);
  const [jurosTipo, setJurosTipo] = useState<JurosTipo>("mensal");
  const [jurosPctMes, setJurosPctMes] = useState("");
  const [jurosPctDia, setJurosPctDia] = useState("");
  const [inicioJuros, setInicioJuros] = useState<InicioJuros>("apos_tolerancia");
  const [moraAtiva, setMoraAtiva] = useState(false);
  const [moraPct, setMoraPct] = useState("");
  const [toleranciaAtiva, setToleranciaAtiva] = useState(false);
  const [diasTolerancia, setDiasTolerancia] = useState("");

  const salvar = () => {
    const socio = Number(socioPct) || 0;
    const empresa = Number(empresaPct) || 0;
    if (!nome.trim() || !spe.trim()) {
      toast.error("Informe o nome do empreendimento e a SPE responsável.");
      return;
    }
    if (Math.abs(socio + empresa - 100) > 0.001) {
      toast.error("A participação do saldo líquido deve totalizar 100%", {
        description: `Sócio (${socio}%) + Empresa (${empresa}%) = ${socio + empresa}%.`,
      });
      return;
    }

    const inadimplencia: RegrasInadimplencia = {
      ...DEFAULT_REGRAS_INADIMPLENCIA,
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
      aliquotaTributaria: Number(aliq) || 0,
      entradaPctCorretor: Number(entradaPct) || 0,
      parcelasPctCorretor: Number(parcelasPct) || 0,
      inadimplencia,
      observacoes: obs.trim(),
      status,
    });
  };

  return (
    <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Novo empreendimento</DialogTitle>
        <DialogDescription>
          Os dados e regras abaixo pertencem especificamente a este empreendimento. Nada desta seção é
          aplicado silenciosamente aos demais projetos.
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
          <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold">Regras financeiras</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Aplicado a: <strong>{nome.trim() || "este novo empreendimento"}</strong>
              </p>
            </div>
            <span className="text-xs text-muted-foreground">Escopo: empreendimento</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Participação do sócio no saldo líquido (%)</Label>
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
              <Label>Participação da empresa no saldo líquido (%)</Label>
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
                value={aliq}
                onChange={(e) => setAliq(e.target.value)}
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
          <p className="text-sm font-semibold">Inadimplência deste empreendimento</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Juros, correção, multa e tolerância serão congelados nos contratos gerados com estas regras.
          </p>

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
                    placeholder="Ex.: índice previsto em contrato"
                  />
                </div>
                <div>
                  <Label className="text-xs">Percentual ao mês (%)</Label>
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
              <div>
                <Label className="text-xs">Percentual fixo (%)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={moraPct}
                  onChange={(e) => setMoraPct(e.target.value)}
                />
              </div>
            </RegraToggle>

            <RegraToggle
              titulo="Dias de tolerância"
              ativa={toleranciaAtiva}
              onAtiva={setToleranciaAtiva}
            >
              <div>
                <Label className="text-xs">Quantidade de dias</Label>
                <Input
                  type="number"
                  min="0"
                  value={diasTolerancia}
                  onChange={(e) => setDiasTolerancia(e.target.value)}
                />
              </div>
            </RegraToggle>
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label>Observações</Label>
          <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
      </div>

      <DialogFooter>
        <Button onClick={salvar} disabled={!nome.trim() || !spe.trim()}>
          Cadastrar empreendimento
        </Button>
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
