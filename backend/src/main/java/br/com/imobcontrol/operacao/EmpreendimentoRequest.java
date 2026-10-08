package br.com.imobcontrol.operacao;

import tools.jackson.databind.JsonNode;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record EmpreendimentoRequest(
        @NotBlank @Size(max = 160) String nome,
        @Size(max = 160) String spe,
        @Size(max = 18) String cnpj,
        @NotNull @PositiveOrZero BigDecimal areaTotal,
        @NotBlank @Size(max = 30) String tipo,
        @NotNull @PositiveOrZero Integer unidadesPrevistas,
        @NotNull @PositiveOrZero BigDecimal valorTotal,
        @Size(max = 160) String socioNome,
        @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal socioPct,
        @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal empresaPct,
        @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal corretorPct,
        @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal aliquotaTributaria,
        @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal repasseComissaoPct,
        boolean comissaoSobreAcrescimos,
        JsonNode inadimplencia,
        JsonNode reajusteContratual,
        String observacoes,
        @NotBlank @Size(max = 30) String status,
        Long versao
) {
    public EmpreendimentoRequest(
            String nome,
            String spe,
            String cnpj,
            BigDecimal areaTotal,
            String tipo,
            Integer unidadesPrevistas,
            BigDecimal valorTotal,
            BigDecimal socioPct,
            BigDecimal empresaPct,
            BigDecimal corretorPct,
            BigDecimal aliquotaTributaria,
            BigDecimal repasseComissaoPct,
            boolean comissaoSobreAcrescimos,
            JsonNode inadimplencia,
            String observacoes,
            String status,
            Long versao
    ) {
        this(
                nome, spe, cnpj, areaTotal, tipo, unidadesPrevistas, valorTotal,
                null, socioPct, empresaPct, corretorPct, aliquotaTributaria,
                repasseComissaoPct, comissaoSobreAcrescimos, inadimplencia,
                null, observacoes, status, versao
        );
    }
}
