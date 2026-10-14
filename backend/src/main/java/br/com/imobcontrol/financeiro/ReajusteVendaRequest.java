package br.com.imobcontrol.financeiro;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record ReajusteVendaRequest(
        @NotNull LocalDate dataReferencia,
        @NotNull @Positive BigDecimal percentualIndice
) {}
