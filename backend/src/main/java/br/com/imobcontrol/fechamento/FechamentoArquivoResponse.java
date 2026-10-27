package br.com.imobcontrol.fechamento;

import java.time.LocalDateTime;

public record FechamentoArquivoResponse(
    Long id, String mes, Long empreendimentoId,
    LocalDateTime criadoEm, Long criadoPorUsuarioId,
    FechamentoMensalResponse relatorio
) {}