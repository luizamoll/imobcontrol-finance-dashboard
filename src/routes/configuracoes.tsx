import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/configuracoes")({
  component: ConfigPage,
  head: () => ({ meta: [{ title: "Configurações · ImobControl" }] }),
});

function ConfigPage() {
  const { state, updateConfig } = useStore();
  const cfg = state.config;
  const [corretorPct, setCorretorPct] = useState(String(cfg.corretorPctPadrao));
  const [entradaPct, setEntradaPct] = useState(String(cfg.entradaPctCorretor));
  const [parcelasPct, setParcelasPct] = useState(String(cfg.parcelasPctCorretor));
  const [aliq, setAliq] = useState(String(cfg.aliquotaPadrao));
  const [correcao, setCorrecao] = useState(String(cfg.correcaoPctMes));
  const [correcaoAtiva, setCorrecaoAtiva] = useState(cfg.correcaoAtiva ?? false);
  const [indice, setIndice] = useState(cfg.correcaoIndice ?? "");
  const [juros, setJuros] = useState(String(cfg.jurosPctMes));
  const [jurosDia, setJurosDia] = useState(String(cfg.jurosPctDia ?? 0));
  const [jurosTipo, setJurosTipo] = useState<"diario" | "mensal">(cfg.jurosTipo ?? "mensal");
  const [jurosAtivo, setJurosAtivo] = useState(cfg.jurosAtivo ?? false);
  const [mora, setMora] = useState(String(cfg.moraPct));
  const [moraAtiva, setMoraAtiva] = useState(cfg.moraAtiva ?? false);
  const [tolerancia, setTolerancia] = useState(String(cfg.diasTolerancia));
  const [toleranciaAtiva, setToleranciaAtiva] = useState(cfg.toleranciaAtiva ?? false);
  const [inicioJuros, setInicioJuros] = useState<"vencimento" | "apos_tolerancia">(
    cfg.inicioJuros ?? "apos_tolerancia",
  );

  const saveComissao = () => {
    updateConfig({
      corretorPctPadrao: Number(corretorPct) || 0,
      entradaPctCorretor: Number(entradaPct) || 0,
      parcelasPctCorretor: Number(parcelasPct) || 0,
      aliquotaPadrao: Number(aliq) || 0,
    });
    toast.success("Padrões comerciais salvos");
  };

  const saveInadimplencia = () => {
    updateConfig({
      correcaoPctMes: Number(correcao) || 0,
      correcaoAtiva,
      correcaoIndice: indice.trim(),
      jurosPctMes: Number(juros) || 0,
      jurosPctDia: Number(jurosDia) || 0,
      jurosTipo,
      jurosAtivo,
      moraPct: Number(mora) || 0,
      moraAtiva,
      diasTolerancia: Number(tolerancia) || 0,
      toleranciaAtiva,
      inicioJuros,
    });
    toast.success("Regras de inadimplência salvas");
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Sistema"
        title="Configurações"
        description="Defina os padrões gerais da operação. Dados específicos ficam no empreendimento, na venda ou na área de recebedores."
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="grid gap-4 p-5 text-sm md:grid-cols-3">
          <div>
            <p className="font-semibold text-foreground">1. Padrão da empresa</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Aqui ficam comissão, tributação padrão e regras gerais de atraso.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">2. Empreendimento</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Comissão e alíquota podem ser ajustadas para um projeto específico.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">3. Venda</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              A comissão pode ser alterada quando um contrato tiver uma exceção comercial.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Padrões comerciais e tributários</CardTitle>
            <p className="text-xs text-muted-foreground">
              Valores sugeridos ao cadastrar a operação. Eles evitam redigitação, mas não substituem as regras específicas de cada empreendimento ou contrato.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Comissão padrão do corretor (%)</Label>
              <Input type="number" min="0" step="0.01" value={corretorPct} onChange={(e) => setCorretorPct(e.target.value)} />
            </div>
            <div>
              <Label>Alíquota tributária padrão (%)</Label>
              <Input type="number" min="0" step="0.01" value={aliq} onChange={(e) => setAliq(e.target.value)} />
            </div>
            <div>
              <Label>Parte da entrada usada para comissão (%)</Label>
              <Input type="number" min="0" step="0.01" value={entradaPct} onChange={(e) => setEntradaPct(e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">Percentual de cada recebimento de entrada destinado a quitar a comissão.</p>
            </div>
            <div>
              <Label>Parte das parcelas usada para comissão (%)</Label>
              <Input type="number" min="0" step="0.01" value={parcelasPct} onChange={(e) => setParcelasPct(e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">Aplicado até atingir o total da comissão contratada.</p>
            </div>
            <div className="sm:col-span-2">
              <Button onClick={saveComissao} size="sm">
                <Save className="mr-2 h-4 w-4" /> Salvar padrões
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Regras de inadimplência</CardTitle>
            <p className="text-xs text-muted-foreground">
              Regras usadas pela Central de Recebimentos e pela tela de Inadimplência para calcular parcelas vencidas.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Correção mensal contratual</Label>
                <Switch checked={correcaoAtiva} onCheckedChange={setCorrecaoAtiva} />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Referência / descrição</Label>
                  <Input value={indice} onChange={(e) => setIndice(e.target.value)} placeholder="Ex.: índice previsto em contrato" />
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                    Campo descritivo. O sistema não consulta automaticamente índices oficiais.
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Percentual ao mês (%)</Label>
                  <Input type="number" min="0" step="0.01" value={correcao} onChange={(e) => setCorrecao(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Juros</Label>
                <Switch checked={jurosAtivo} onCheckedChange={setJurosAtivo} />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Periodicidade</Label>
                  <Select value={jurosTipo} onValueChange={(v) => setJurosTipo(v as "diario" | "mensal")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diario">Diário</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">
                    {jurosTipo === "diario" ? "Percentual ao dia (%)" : "Percentual ao mês (%)"}
                  </Label>
                  {jurosTipo === "diario" ? (
                    <Input type="number" min="0" step="0.001" value={jurosDia} onChange={(e) => setJurosDia(e.target.value)} />
                  ) : (
                    <Input type="number" min="0" step="0.01" value={juros} onChange={(e) => setJuros(e.target.value)} />
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Início da incidência</Label>
                  <Select value={inicioJuros} onValueChange={(v) => setInicioJuros(v as "vencimento" | "apos_tolerancia")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vencimento">A partir do vencimento</SelectItem>
                      <SelectItem value="apos_tolerancia">Após os dias de tolerância</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Multa por atraso</Label>
                <Switch checked={moraAtiva} onCheckedChange={setMoraAtiva} />
              </div>
              <div className="mt-3">
                <Label className="text-xs">Percentual fixo sobre o valor em atraso (%)</Label>
                <Input type="number" min="0" step="0.01" value={mora} onChange={(e) => setMora(e.target.value)} />
              </div>
            </div>

            <div className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Dias de tolerância</Label>
                <Switch checked={toleranciaAtiva} onCheckedChange={setToleranciaAtiva} />
              </div>
              <div className="mt-3">
                <Input type="number" min="0" value={tolerancia} onChange={(e) => setTolerancia(e.target.value)} />
              </div>
            </div>

            <Button onClick={saveInadimplencia} size="sm">
              <Save className="mr-2 h-4 w-4" /> Salvar regras
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70 xl:col-span-2">
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="rounded-lg border border-border/70 p-4">
              <p className="text-sm font-semibold">Regras por empreendimento</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Alíquota tributária, participação de sócio/empresa e comissão específica são cadastradas junto do empreendimento.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to="/empreendimentos">
                  Abrir empreendimentos <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="rounded-lg border border-border/70 p-4">
              <p className="text-sm font-semibold">Sócios, empresas e corretores</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                O cadastro e o acompanhamento de repasses agora ficam juntos na área Recebedores.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to="/recebedores">
                  Abrir recebedores <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
