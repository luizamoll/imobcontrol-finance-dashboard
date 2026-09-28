package br.com.imobcontrol.operacao;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record UnidadeRequest(
        @NotNull Long empreendimentoId,
        Long quadraId,
        @NotBlank @Size(max = 80) String numero,
        @NotBlank @Size(max = 120) String unidade,
        @Size(max = 30) String unidadeTipo,
        String descricao,
        @NotNull @PositiveOrZero BigDecimal area,
        @NotNull @PositiveOrZero BigDecimal valorVenda,
        @NotBlank @Size(max = 30) String status,
        JsonNode regras,
        Long versao
) {
}
