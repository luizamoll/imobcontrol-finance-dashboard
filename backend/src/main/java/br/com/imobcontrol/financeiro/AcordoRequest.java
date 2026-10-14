package br.com.imobcontrol.financeiro;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record AcordoRequest(
        @NotEmpty List<@NotNull Long> parcelaIds,
        @NotNull LocalDate dataAcordo,
        @NotNull @Positive BigDecimal valorAcordo,
        @NotNull @PositiveOrZero BigDecimal entradaValor,
        @NotNull @Positive Integer quantidadeParcelas,
        @NotNull LocalDate primeiroVencimento,
        String observacoes
) {}
