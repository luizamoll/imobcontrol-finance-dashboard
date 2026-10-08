package br.com.imobcontrol.financeiro;

import tools.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record VendaResponse(
        Long id,
        Long empresaId,
        Long empreendimentoId,
        Long unidadeId,
        Long clienteId,
        String compradorNome,
        BigDecimal valorTotal,
        BigDecimal valorImovel,
        BigDecimal corretagemValor,
        Boolean corretagemCompoeValorContrato,
        String corretagemFormaPagamento,
        LocalDate dataContrato,
        String corretorNome,
        BigDecimal corretorPct,
        BigDecimal repasseComissaoPct,
        boolean comissaoSobreAcrescimos,
        String observacoes,
        String status,
        JsonNode regras,
        Long versao,
        List<PagamentoResponse> composicao
) {
    public record PagamentoResponse(
            Long id,
            String tipo,
            String descricao,
            BigDecimal valor,
            Integer parcelas,
            LocalDate primeiroVencimento,
            String status
    ) {}
}
