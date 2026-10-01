package br.com.imobcontrol.financeiro;

import java.time.LocalDateTime;

public record VendaHistoricoResponse(
        Long id,
        Long usuarioId,
        String usuarioNome,
        String acao,
        String detalhes,
        LocalDateTime criadoEm
) {
}
