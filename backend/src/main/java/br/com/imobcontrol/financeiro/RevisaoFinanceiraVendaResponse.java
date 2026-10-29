package br.com.imobcontrol.financeiro;

import java.time.LocalDateTime;

public record RevisaoFinanceiraVendaResponse(
    Long id, Long usuarioId, String usuarioNome, String justificativa,
    Long versaoAnterior, Long versaoNova, String resumoAnterior,
    String resumoNovo, LocalDateTime criadoEm
) {}