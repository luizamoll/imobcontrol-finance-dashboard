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
import { Textarea } from "@/components/ui/textarea";
import type { ReajusteContratual, ReajusteModalidade } from "@/lib/store";

export function ReajusteContratualForm({
  value,
  onChange,
}: {
  value: ReajusteContratual;
  onChange: (value: ReajusteContratual) => void;
}) {
  const patch = (parcial: Partial<ReajusteContratual>) =>
    onChange({ ...value, ...parcial });
  const taxaMensalAtiva =
    value.modalidade === "percentual_fixo" && value.taxaMensalReferencia != null;
  const percentualAnual = (taxaMensal: number, meses: number) =>
    Math.round(taxaMensal * meses * 10000) / 10000;

  return (
    <div className="rounded-lg border border-border/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Reajuste das parcelas vincendas</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Esta regra é diferente de multa, juros e correção por atraso. Ela descreve como o valor
            das parcelas futuras deve ser reajustado durante a vigência do contrato.
          </p>
        </div>
        <Switch checked={value.ativo} onCheckedChange={(ativo) => patch({ ativo })} />
      </div>

      {value.ativo && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Modalidade</Label>
            <Select
              value={value.modalidade}
              onValueChange={(modalidade) =>
                patch({
                  modalidade: modalidade as ReajusteModalidade,
                  ...(modalidade !== "percentual_fixo" ? { taxaMensalReferencia: undefined } : {}),
                })
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentual_fixo">Percentual fixo</SelectItem>
                <SelectItem value="indice">Índice econômico</SelectItem>
                <SelectItem value="maior_entre">Maior entre percentual e índice</SelectItem>
                <SelectItem value="regra_personalizada">Regra personalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Periodicidade de aplicação (meses)</Label>
            <Input
              type="number"
              min="1"
              value={value.periodicidadeMeses}
              onChange={(event) =>
                {
                  const periodicidadeMeses = Math.max(1, Number(event.target.value) || 1);
                  patch({
                    periodicidadeMeses,
                    ...(taxaMensalAtiva
                      ? { percentualBase: percentualAnual(value.taxaMensalReferencia!, periodicidadeMeses) }
                      : {}),
                  });
                }
              }
            />
          </div>

          {value.modalidade === "percentual_fixo" && (
            <div>
              <Label className="text-xs">Como o percentual foi contratado?</Label>
              <Select
                value={taxaMensalAtiva ? "mensal" : "ciclo"}
                onValueChange={(tipo) =>
                  tipo === "mensal"
                    ? patch({ taxaMensalReferencia: 0, percentualBase: 0 })
                    : patch({ taxaMensalReferencia: undefined })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ciclo">Percentual por ciclo (ex.: 11,88% ao ano)</SelectItem>
                  <SelectItem value="mensal">Taxa mensal nominal, aplicada por ciclo (ex.: 0,99%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {taxaMensalAtiva ? (
            <div>
              <Label className="text-xs">Taxa mensal nominal (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={value.taxaMensalReferencia ?? 0}
                onChange={(event) => {
                  const taxaMensalReferencia = Number(event.target.value) || 0;
                  patch({
                    taxaMensalReferencia,
                    percentualBase: percentualAnual(taxaMensalReferencia, value.periodicidadeMeses),
                  });
                }}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Percentual aplicado a cada {value.periodicidadeMeses} meses:
                <strong> {value.percentualBase.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%</strong>
                {" "}({(value.taxaMensalReferencia ?? 0).toLocaleString("pt-BR")}% × {value.periodicidadeMeses},
                cálculo simples).
              </p>
            </div>
          ) : (
            <div>
              <Label className="text-xs">Percentual por ciclo (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={value.percentualBase}
                onChange={(event) => patch({ percentualBase: Number(event.target.value) || 0 })}
              />
            </div>
          )}

          <div>
            <Label className="text-xs">Índice de referência</Label>
            <Input
              value={value.indiceReferencia}
              onChange={(event) => patch({ indiceReferencia: event.target.value })}
              placeholder="Ex.: IPCA"
            />
          </div>

          <div>
            <Label className="text-xs">Gatilho do índice (%)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={value.gatilhoPercentual}
              onChange={(event) => patch({ gatilhoPercentual: Number(event.target.value) || 0 })}
            />
          </div>

          <div className="sm:col-span-2">
            <Label className="text-xs">Descrição contratual / regra especial</Label>
            <Textarea
              value={value.descricao}
              onChange={(event) => patch({ descricao: event.target.value })}
              placeholder="Registre aqui a redação operacional da cláusula quando ela não couber em uma fórmula simples."
            />
          </div>

          <div className="sm:col-span-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            Se o contrato prevê 0,99% ao mês, mas corrige somente a cada 12 meses por
            soma simples, selecione Taxa mensal nominal: o sistema calculará 11,88% por ano.
            A primeira correção segue o aniversário da data do contrato, não a numeração
            das parcelas nem a quantidade de sinais. Os pagamentos já realizados são preservados.
            Índices variáveis (IPCA, INCC etc.) dependem do percentual informado e da aplicação
            autorizada na venda; as regras não são aplicadas retroativamente ao editar o empreendimento.
          </div>
        </div>
      )}
    </div>
  );
}
