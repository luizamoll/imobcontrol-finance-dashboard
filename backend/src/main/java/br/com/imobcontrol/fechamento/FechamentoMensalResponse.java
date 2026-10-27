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
    int glebasComPagamentoMes,
    BigDecimal recebidoParcelas,
    BigDecimal outrasReceitas,
    BigDecimal valorTotalRecebido,
    BigDecimal custoEmpreendimento,
    BigDecimal valorSocio,
    BigDecimal valorEmpreendedor,
    BigDecimal impostoReservado,
    BigDecimal impostoPago,
    BigDecimal comissaoRegistrada,
    BigDecimal comissaoEfetivamentePaga,
    BigDecimal socioEfetivamentePago,
    BigDecimal empreendedorEfetivamentePago,
    BigDecimal valorDevolvidoDistrato,
    BigDecimal valorRetido,
    BigDecimal saldoDisponivelEstimado,
    List<Lancamento> lancamentos,
    List<UnidadeFechamento> unidades
) {
    public record UnidadeFechamento(
        Long unidadeId, String unidade, String comprador, boolean pagouNoMes,
        boolean inadimplenteNoFim, BigDecimal recebidoNoMes, BigDecimal saldoVencido,
        LocalDate ultimoPagamentoMes
    ) {}

    public record Lancamento(
        Long id, Long empreendimentoId, LocalDate data,
        String tipo, String descricao, BigDecimal valor,
        boolean estornado, LocalDateTime criadoEm
    ) {}
}