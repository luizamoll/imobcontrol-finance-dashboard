package br.com.imobcontrol.dividendos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record DividendoTerceiroRequest(
        @NotBlank @Size(max = 200) String imovel,
        @NotNull @DecimalMin("0.00") BigDecimal valorBase,
        @Size(max = 2000) String observacoes,
        @NotEmpty List<@Valid ParticipanteDividendo> participantes,
        Long versao
) {
}
