package br.com.imobcontrol.operacao;

import tools.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record UnidadeResponse(
        Long id,
        Long empresaId,
        Long empreendimentoId,
        Long quadraId,
        String numero,
        String unidade,
        String unidadeTipo,
        String descricao,
        BigDecimal area,
        BigDecimal valorVenda,
        String status,
        JsonNode regras,
        Long versao,
        LocalDateTime criadoEm,
        LocalDateTime atualizadoEm
) {
}
