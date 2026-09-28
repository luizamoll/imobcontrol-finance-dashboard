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
import type {
  InicioJuros,
  JurosTipo,
  RegrasInadimplencia,
} from "@/lib/store";

export function RegrasInadimplenciaForm({
  value,
  onChange,
}: {
  value: RegrasInadimplencia;
  onChange: (next: RegrasInadimplencia) => void;
}) {
  const patch = (next: Partial<RegrasInadimplencia>) =>
    onChange({ ...value, ...next });

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Correção contratual</p>
            <p className="text-xs text-muted-foreground">
              Pode ser ligada, desligada ou alterada especificamente nesta venda.
            </p>
          </div>
          <Switch
            checked={value.correcaoAtiva}
            onCheckedChange={(checked) => patch({ correcaoAtiva: checked })}
          />
        </div>
        {value.correcaoAtiva && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Referência / descrição</Label>
              <Input
                value={value.correcaoIndice}
                onChange={(e) => patch({ correcaoIndice: e.target.value })}
                placeholder="Ex.: correção prevista para esta venda"
              />
            </div>
            <NumberField
              label="Percentual ao mês (%)"
              value={value.correcaoPctMes}
              onChange={(n) => patch({ correcaoPctMes: n })}
            />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Juros</p>
            <p className="text-xs text-muted-foreground">
              Defina a periodicidade e quando a cobrança começa.
            </p>
          </div>
          <Switch
            checked={value.jurosAtivo}
            onCheckedChange={(checked) => patch({ jurosAtivo: checked })}
          />
        </div>
        {value.jurosAtivo && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Periodicidade</Label>
              <Select
                value={value.jurosTipo}
                onValueChange={(v) => patch({ jurosTipo: v as JurosTipo })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="diario">Diário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <NumberField
              label={value.jurosTipo === "diario" ? "Percentual ao dia (%)" : "Percentual ao mês (%)"}
              value={value.jurosTipo === "diario" ? value.jurosPctDia : value.jurosPctMes}
              step={value.jurosTipo === "diario" ? 0.001 : 0.01}
              onChange={(n) =>
                value.jurosTipo === "diario"
                  ? patch({ jurosPctDia: n })
                  : patch({ jurosPctMes: n })
              }
            />
            <div>
              <Label className="text-xs">Início da incidência</Label>
              <Select
                value={value.inicioJuros}
                onValueChange={(v) => patch({ inicioJuros: v as InicioJuros })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <div>
              <p className="text-sm font-medium">Multa por atraso</p>
              <p className="text-xs text-muted-foreground">Percentual fixo aplicado quando houver atraso.</p>
            </div>
            <Switch
              checked={value.moraAtiva}
              onCheckedChange={(checked) => patch({ moraAtiva: checked })}
            />
          </div>
          {value.moraAtiva && (
            <div className="mt-3">
              <NumberField
                label="Percentual fixo (%)"
                value={value.moraPct}
                onChange={(n) => patch({ moraPct: n })}
              />
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Dias de tolerância</p>
              <p className="text-xs text-muted-foreground">Prazo antes da incidência quando aplicável.</p>
            </div>
            <Switch
              checked={value.toleranciaAtiva}
              onCheckedChange={(checked) => patch({ toleranciaAtiva: checked })}
            />
          </div>
          {value.toleranciaAtiva && (
            <div className="mt-3">
              <NumberField
                label="Quantidade de dias"
                value={value.diasTolerancia}
                step={1}
                onChange={(n) => patch({ diasTolerancia: n })}
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
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min="0"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}
