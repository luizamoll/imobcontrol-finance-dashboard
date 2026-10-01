package br.com.imobcontrol.financeiro;

import tools.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.LocalDate;

public record ParcelaResponse(
        Long id,
        Long vendaId,
        Long empreendimentoId,
        Long unidadeId,
        Long clienteId,
        String compradorNome,
        String origemTipo,
        String origemDescricao,
        Integer numero,
        Integer totalParcelas,
        LocalDate vencimento,
        BigDecimal valor,
        BigDecimal valorPago,
        LocalDate dataPagamento,
        String status,
        JsonNode regrasInadimplencia,
        Long versao
) {
}
