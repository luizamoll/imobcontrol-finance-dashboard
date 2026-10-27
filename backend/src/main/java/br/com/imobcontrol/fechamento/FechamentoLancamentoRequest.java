package br.com.imobcontrol.fechamento;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record FechamentoLancamentoRequest(
    @NotNull Long empreendimentoId,
    @NotNull LocalDate data,
    @NotBlank String tipo,
    @NotBlank @Size(max = 240) String descricao,
    @NotNull @DecimalMin("0.01") BigDecimal valor
) {}