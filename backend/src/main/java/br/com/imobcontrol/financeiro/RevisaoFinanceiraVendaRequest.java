package br.com.imobcontrol.financeiro;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RevisaoFinanceiraVendaRequest(
    @NotNull @Valid VendaRequest venda,
    @NotBlank @Size(min = 15, max = 1000) String justificativa,
    @AssertTrue(message = "Confirme a substituição das parcelas em histórico") boolean confirmarRevisao
) {}