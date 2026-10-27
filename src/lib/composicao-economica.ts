/** Valores monetários em centavos, para evitar divergências de ponto flutuante. */
export type InclusaoCorretagem = "sim" | "nao" | "nao_informado";

export function composicaoEconomica(
  valorContrato: number,
  percentualComissao: number,
  inclusao: InclusaoCorretagem,
) {
  const centavosContrato = Math.max(0, Math.round(valorContrato * 100));
  const centavosComissao = Math.round(centavosContrato * percentualComissao / 100);
  const centavosImovel = inclusao === "sim"
    ? centavosContrato - centavosComissao
    : centavosContrato;
  return {
    valorImovel: centavosImovel / 100,
    corretagemValor: centavosComissao / 100,
    valorContrato: centavosContrato / 100,
    valorTotalComCorretagemExterna: (centavosContrato + centavosComissao) / 100,
  };
}
