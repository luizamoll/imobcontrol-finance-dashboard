package br.com.imobcontrol.operacao;

import tools.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record EmpreendimentoResponse(
        Long id,
        Long empresaId,
        String nome,
        String spe,
        String cnpj,
        BigDecimal areaTotal,
        String tipo,
        Integer unidadesPrevistas,
        BigDecimal valorTotal,
        String socioNome,
        BigDecimal socioPct,
        BigDecimal empresaPct,
        BigDecimal corretorPct,
        BigDecimal aliquotaTributaria,
        BigDecimal repasseComissaoPct,
        boolean comissaoSobreAcrescimos,
        JsonNode inadimplencia,
        JsonNode reajusteContratual,
        String observacoes,
        String status,
        Long versao,
        LocalDateTime criadoEm,
        LocalDateTime atualizadoEm
) {
}
