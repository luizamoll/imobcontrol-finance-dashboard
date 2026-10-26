package br.com.imobcontrol.dividendos;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ParticipanteDividendo(
        @NotBlank @Size(max = 160) String nome,
        @NotNull @DecimalMin("0.01") @DecimalMax("100.00") BigDecimal percentual
) {
}
