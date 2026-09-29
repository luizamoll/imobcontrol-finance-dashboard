package br.com.imobcontrol.operacao;

import tools.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record QuadraRequest(
        @NotNull Long empreendimentoId,
        @NotBlank @Size(max = 120) String nome,
        @NotBlank @Size(max = 30) String tipoAgrupamento,
        String descricao,
        JsonNode regras,
        Long versao
) {
}
