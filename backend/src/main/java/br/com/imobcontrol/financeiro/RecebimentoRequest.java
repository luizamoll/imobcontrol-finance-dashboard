package br.com.imobcontrol.financeiro;

import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

public record RecebimentoRequest(
        @Positive BigDecimal valorRecebido,
        LocalDate data
) {
}
