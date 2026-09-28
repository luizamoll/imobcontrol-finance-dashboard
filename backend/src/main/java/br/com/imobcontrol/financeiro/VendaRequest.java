package br.com.imobcontrol.financeiro;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record VendaRequest(
        @NotNull Long empreendimentoId,
        @NotNull Long unidadeId,
        @NotNull Long clienteId,
        @NotNull @Positive BigDecimal valorTotal,
        @NotNull LocalDate dataContrato,
        @Size(max=160) String corretorNome,
        @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal corretorPct,
        @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal repasseComissaoPct,
        boolean comissaoSobreAcrescimos,
        String observacoes,
        @NotNull @Size(min=1) List<@Valid PagamentoRequest> composicao,
        Long versao
) {
    public record PagamentoRequest(
            @NotNull @Size(max=40) String tipo,
            @Size(max=240) String descricao,
            @NotNull @Positive BigDecimal valor,
            @NotNull @Positive Integer parcelas,
            @NotNull LocalDate primeiroVencimento,
            @Size(max=40) String status
    ) {}
}
