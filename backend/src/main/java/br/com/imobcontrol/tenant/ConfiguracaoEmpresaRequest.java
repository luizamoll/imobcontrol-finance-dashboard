package br.com.imobcontrol.tenant;

import jakarta.validation.constraints.NotNull;
import tools.jackson.databind.JsonNode;

public record ConfiguracaoEmpresaRequest(
        @NotNull JsonNode config,
        Long versao
) {
}
