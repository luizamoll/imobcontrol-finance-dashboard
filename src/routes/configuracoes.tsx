import { createFileRoute } from "@tanstack/react-router";
import { Save, Plus, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/configuracoes")({
  component: ConfigPage,
  head: () => ({ meta: [{ title: "Configurações · ImobControl" }] }),
});

function ConfigPage() {
  const { state, updateConfig, updateEmpreendimento } = useStore();
  const cfg = state.config;
  const [corretorPct, setCorretorPct] = useState(String(cfg.corretorPctPadrao));
  const [entradaPct, setEntradaPct] = useState(String(cfg.entradaPctCorretor));
  const [parcelasPct, setParcelasPct] = useState(String(cfg.parcelasPctCorretor));
  const [aliq, setAliq] = useState(String(cfg.aliquotaPadrao));
  const [correcao, setCorrecao] = useState(String(cfg.correcaoPctMes));
  const [juros, setJuros] = useState(String(cfg.jurosPctMes));
  const [mora, setMora] = useState(String(cfg.moraPct));
  const [tolerancia, setTolerancia] = useState(String(cfg.diasTolerancia));
  const [newRec, setNewRec] = useState("");
  const [newTipo, setNewTipo] = useState<"socio" | "empresa" | "corretor">("corretor");

  const saveComissao = () => {
    updateConfig({
      corretorPctPadrao: Number(corretorPct) || 0,
      entradaPctCorretor: Number(entradaPct) || 0,
      parcelasPctCorretor: Number(parcelasPct) || 0,
      aliquotaPadrao: Number(aliq) || 0,
    });
    toast.success("Regras de comissão salvas");
  };

  const saveInadimplencia = () => {
    updateConfig({
      correcaoPctMes: Number(correcao) || 0,
      jurosPctMes: Number(juros) || 0,
      moraPct: Number(mora) || 0,
      diasTolerancia: Number(tolerancia) || 0,
    });
    toast.success("Regras de inadimplência salvas");
  };

  const addRec = () => {
    if (!newRec.trim()) return;
    updateConfig({ recebedores: [...cfg.recebedores, { nome: newRec.trim(), tipo: newTipo }] });
    setNewRec("");
    toast.success("Recebedor adicionado");
  };
  const rmRec = (nome: string) => {
    updateConfig({ recebedores: cfg.recebedores.filter((r) => r.nome !== nome) });
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Sistema"
        title="Configurações"
        description="Regras de distribuição, alíquotas, inadimplência e cadastro de recebedores. Todos os valores são editáveis."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Regras de comissão e tributação</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>% Comissão padrão do corretor</Label>
              <Input type="number" value={corretorPct} onChange={(e) => setCorretorPct(e.target.value)} />
            </div>
            <div>
              <Label>% do sinal destinado ao corretor</Label>
              <Input type="number" value={entradaPct} onChange={(e) => setEntradaPct(e.target.value)} />
            </div>
            <div>
              <Label>% das parcelas destinadas ao corretor</Label>
              <Input type="number" value={parcelasPct} onChange={(e) => setParcelasPct(e.target.value)} />
            </div>
            <div>
              <Label>Alíquota tributária padrão (%)</Label>
              <Input type="number" value={aliq} onChange={(e) => setAliq(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={saveComissao} size="sm">
                <Save className="mr-2 h-4 w-4" /> Salvar regras
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Regras de inadimplência</CardTitle>
            <p className="text-xs text-muted-foreground">
              Correção, juros e mora aplicados automaticamente sobre parcelas vencidas.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Correção monetária (% ao mês)</Label>
              <Input type="number" step="0.01" value={correcao} onChange={(e) => setCorrecao(e.target.value)} />
            </div>
            <div>
              <Label>Juros (% ao mês)</Label>
              <Input type="number" step="0.01" value={juros} onChange={(e) => setJuros(e.target.value)} />
            </div>
            <div>
              <Label>Mora (% fixo sobre atraso)</Label>
              <Input type="number" step="0.01" value={mora} onChange={(e) => setMora(e.target.value)} />
            </div>
            <div>
              <Label>Dias de tolerância</Label>
              <Input type="number" value={tolerancia} onChange={(e) => setTolerancia(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={saveInadimplencia} size="sm">
                <Save className="mr-2 h-4 w-4" /> Salvar regras
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Alíquotas por SPE</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.empreendimentos.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-md border border-border/70 p-3">
                <div>
                  <div className="text-sm font-medium">{e.nome}</div>
                  <div className="text-xs text-muted-foreground">{e.spe}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    className="h-9 w-24 text-right"
                    type="number"
                    defaultValue={e.aliquotaTributaria}
                    onBlur={(ev) => {
                      const v = Number(ev.target.value) || 0;
                      if (v !== e.aliquotaTributaria) {
                        updateEmpreendimento(e.id, { aliquotaTributaria: v });
                        toast.success(`Alíquota de ${e.nome} atualizada`);
                      }
                    }}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recebedores</CardTitle>
            <p className="text-xs text-muted-foreground">
              Sócios, empresa e corretores usados nas telas de vendas e distribuição.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <Label>Nome</Label>
                <Input value={newRec} onChange={(e) => setNewRec(e.target.value)} placeholder="Ex.: Nome completo" />
              </div>
              <div className="w-40">
                <Label>Tipo</Label>
                <Select value={newTipo} onValueChange={(v) => setNewTipo(v as "socio" | "empresa" | "corretor")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="socio">Sócio</SelectItem>
                    <SelectItem value="empresa">Empresa</SelectItem>
                    <SelectItem value="corretor">Corretor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={addRec}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {cfg.recebedores.map((r) => (
                <Badge key={r.nome} variant="secondary" className="gap-2 rounded-full px-3 py-1.5 text-sm">
                  <span className="text-xs uppercase text-muted-foreground">{r.tipo}</span>
                  {r.nome}
                  <button onClick={() => rmRec(r.nome)} className="text-destructive hover:opacity-80">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
