package br.com.imobcontrol.financeiro;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record AcordoResponse(
        Long id,
        Long vendaId,
        LocalDate dataAcordo,
        BigDecimal valorOriginal,
        BigDecimal valorAcordo,
        BigDecimal entradaValor,
        Integer quantidadeParcelas,
        LocalDate primeiroVencimento,
        String observacoes,
        String status,
        List<Long> parcelasOrigemIds,
        List<Long> parcelasCobrancaIds
) {}
