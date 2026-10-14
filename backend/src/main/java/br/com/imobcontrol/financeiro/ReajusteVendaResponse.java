package br.com.imobcontrol.financeiro;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ReajusteVendaResponse(
        Long id,
        LocalDate dataReferencia,
        BigDecimal percentualAplicado,
        String indiceReferencia,
        LocalDateTime criadoEm
) {}
