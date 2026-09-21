import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  InicioJuros,
  JurosTipo,
  RegrasInadimplencia,
  RegrasOperacao,
} from "@/lib/store";

export function RegrasOperacaoForm({
  value,
  onChange,
  scopeLabel,
}: {
  value: RegrasOperacao;
  onChange: (next: RegrasOperacao) => void;
  scopeLabel?: string;
}) {
  const patch = (next: Partial<RegrasOperacao>) => onChange({ ...value, ...next });
  const patchInadimplencia = (next: Partial<RegrasInadimplencia>) =>
    patch({ inadimplencia: { ...value.inadimplencia, ...next } });

  return (
    <div className="space-y-4">
      {scopeLabel && (
        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          Aplicado a: <strong className="text-foreground">{scopeLabel}</strong>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumberField
          label="Participação do sócio no saldo líquido (%)"
          value={value.socioPct}
          max={100}
          onChange={(n) => patch({ socioPct: n })}
        />
        <NumberField
          label="Participação da empresa no saldo líquido (%)"
          value={value.empresaPct}
          max={100}
          onChange={(n) => patch({ empresaPct: n })}
        />
        <NumberField
          label="Comissão do corretor (% sobre a venda)"
          value={value.corretorPct}
          onChange={(n) =>
            patch({
              corretorPct: n,
              entradaPctCorretor: n,
              parcelasPctCorretor: n,
            })
          }
        />
        <NumberField
          label="Alíquota tributária (%)"
          value={value.aliquotaTributaria}
          onChange={(n) => patch({ aliquotaTributaria: n })}
        />
        <div className="sm:col-span-2 rounded-md border border-border/60 bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
          O mesmo percentual da comissão é aplicado a cada valor recebido da venda — entrada, pagamento
          à vista ou parcela — até atingir o total devido ao corretor. Depois da quitação, os próximos
          recebimentos não geram nova comissão.
        </div>
      </div>

      <div className="rounded-lg border border-border/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Correção contratual</p>
            <p className="text-xs text-muted-foreground">Correção aplicada somente quando prevista.</p>
          </div>
          <Switch
            checked={value.inadimplencia.correcaoAtiva}
            onCheckedChange={(checked) => patchInadimplencia({ correcaoAtiva: checked })}
          />
        </div>
        {value.inadimplencia.correcaoAtiva && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Referência / descrição</Label>
              <Input
                value={value.inadimplencia.correcaoIndice}
                onChange={(e) => patchInadimplencia({ correcaoIndice: e.target.value })}
                placeholder="Ex.: índice previsto em contrato"
              />
            </div>
            <NumberField
              label="Percentual ao mês (%)"
              value={value.inadimplencia.correcaoPctMes}
              onChange={(n) => patchInadimplencia({ correcaoPctMes: n })}
            />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Juros</p>
            <p className="text-xs text-muted-foreground">Periodicidade e início da incidência.</p>
          </div>
          <Switch
            checked={value.inadimplencia.jurosAtivo}
            onCheckedChange={(checked) => patchInadimplencia({ jurosAtivo: checked })}
          />
        </div>
        {value.inadimplencia.jurosAtivo && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Periodicidade</Label>
              <Select
                value={value.inadimplencia.jurosTipo}
                onValueChange={(v) =>
                  patchInadimplencia({ jurosTipo: v as JurosTipo })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="diario">Diário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <NumberField
              label={
                value.inadimplencia.jurosTipo === "diario"
                  ? "Percentual ao dia (%)"
                  : "Percentual ao mês (%)"
              }
              value={
                value.inadimplencia.jurosTipo === "diario"
                  ? value.inadimplencia.jurosPctDia
                  : value.inadimplencia.jurosPctMes
              }
              step={value.inadimplencia.jurosTipo === "diario" ? 0.001 : 0.01}
              onChange={(n) =>
                value.inadimplencia.jurosTipo === "diario"
                  ? patchInadimplencia({ jurosPctDia: n })
                  : patchInadimplencia({ jurosPctMes: n })
              }
            />
            <div>
              <Label className="text-xs">Início da incidência</Label>
              <Select
                value={value.inadimplencia.inicioJuros}
                onValueChange={(v) =>
                  patchInadimplencia({ inicioJuros: v as InicioJuros })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vencimento">A partir do vencimento</SelectItem>
                  <SelectItem value="apos_tolerancia">Após a tolerância</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Multa por atraso</p>
            <Switch
              checked={value.inadimplencia.moraAtiva}
              onCheckedChange={(checked) => patchInadimplencia({ moraAtiva: checked })}
            />
          </div>
          {value.inadimplencia.moraAtiva && (
            <div className="mt-3">
              <NumberField
                label="Percentual fixo (%)"
                value={value.inadimplencia.moraPct}
                onChange={(n) => patchInadimplencia({ moraPct: n })}
              />
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Dias de tolerância</p>
            <Switch
              checked={value.inadimplencia.toleranciaAtiva}
              onCheckedChange={(checked) =>
                patchInadimplencia({ toleranciaAtiva: checked })
              }
            />
          </div>
          {value.inadimplencia.toleranciaAtiva && (
            <div className="mt-3">
              <NumberField
                label="Quantidade de dias"
                value={value.inadimplencia.diasTolerancia}
                step={1}
                onChange={(n) => patchInadimplencia({ diasTolerancia: n })}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 0.01,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  max?: number;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min="0"
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}
