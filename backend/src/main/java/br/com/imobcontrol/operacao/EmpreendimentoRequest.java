package br.com.imobcontrol.operacao;

import com.fasterxml.jackson.databind.JsonNode;
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
        @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal socioPct,
        @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal empresaPct,
        @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal corretorPct,
        @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal aliquotaTributaria,
        @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal repasseComissaoPct,
        boolean comissaoSobreAcrescimos,
        JsonNode inadimplencia,
        String observacoes,
        @NotBlank @Size(max = 30) String status,
        Long versao
) {
}
