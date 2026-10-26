package br.com.imobcontrol.dividendos;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record DividendoTerceiroResponse(
        Long id,
        Long empresaId,
        String imovel,
        BigDecimal valorBase,
        String observacoes,
        List<ParticipanteDividendo> participantes,
        Long versao,
        LocalDateTime criadoEm,
        LocalDateTime atualizadoEm
) {
}
