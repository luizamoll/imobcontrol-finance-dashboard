package br.com.imobcontrol.tenant;

import tools.jackson.databind.JsonNode;

import java.time.LocalDateTime;

public record ConfiguracaoEmpresaResponse(
        Long empresaId,
        JsonNode config,
        Long versao,
        LocalDateTime atualizadoEm
) {
}
