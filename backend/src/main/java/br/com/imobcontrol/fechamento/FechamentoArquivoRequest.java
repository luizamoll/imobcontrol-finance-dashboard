package br.com.imobcontrol.fechamento;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record FechamentoArquivoRequest(
    @NotBlank String mes,
    @NotNull Long empreendimentoId
) {}