package br.com.imobcontrol.financeiro;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MovimentoResponse(
        Long id,
        Long parcelaId,
        Long vendaId,
        Long empreendimentoId,
        Long unidadeId,
        Long clienteId,
        String compradorNome,
        String corretorNome,
        String origem,
        String origemDescricao,
        LocalDate data,
        String usuario,
        BigDecimal valorRecebido,
        BigDecimal impostoReservado,
        BigDecimal comissaoPaga,
        BigDecimal empresaValor,
        BigDecimal socioValor,
        BigDecimal aliquotaTributariaAplicada,
        BigDecimal empresaPctAplicada,
        BigDecimal socioPctAplicada,
        BigDecimal comissaoBaseCalculo,
        BigDecimal comissaoRepassePctAplicado,
        Boolean comissaoSobreAcrescimosAplicada,
        BigDecimal acrescimosRecebidos,
        BigDecimal comissaoTeorica,
        BigDecimal saldoComissaoApos
) {
}
