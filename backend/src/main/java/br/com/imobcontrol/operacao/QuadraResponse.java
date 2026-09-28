package br.com.imobcontrol.operacao;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDateTime;

public record QuadraResponse(
        Long id,
        Long empresaId,
        Long empreendimentoId,
        String nome,
        String descricao,
        JsonNode regras,
        Long versao,
        LocalDateTime criadoEm,
        LocalDateTime atualizadoEm
) {
}
