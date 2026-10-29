package br.com.imobcontrol.financeiro;

public record RevisaoFinanceiraElegibilidade(
    boolean possuiHistoricoRecebimentos, boolean permitido, String motivo
) {}
