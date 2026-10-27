package br.com.imobcontrol.fechamento;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record FechamentoMensalResponse(
    String mes,
    Long empreendimentoId,
    int totalGlebas,
    int glebasAdimplentes,
    int glebasInadimplentes,
    BigDecimal recebidoParcelas,
    BigDecimal outrasReceitas,
    BigDecimal valorTotalRecebido,
    BigDecimal custoEmpreendimento,
    BigDecimal valorSocio,
    BigDecimal valorEmpreendedor,
    BigDecimal impostoReservado,
    BigDecimal impostoPago,
    BigDecimal comissaoRegistrada,
    BigDecimal valorDevolvidoDistrato,
    BigDecimal valorRetido,
    BigDecimal saldoDisponivelEstimado,
    List<Lancamento> lancamentos
) {
    public record Lancamento(
        Long id, Long empreendimentoId, LocalDate data,
        String tipo, String descricao, BigDecimal valor,
        boolean estornado, LocalDateTime criadoEm
    ) {}
}