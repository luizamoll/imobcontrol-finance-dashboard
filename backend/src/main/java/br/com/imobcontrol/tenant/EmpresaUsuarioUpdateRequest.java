package br.com.imobcontrol.tenant;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EmpresaUsuarioUpdateRequest(
        @NotBlank @Size(max = 160) String nome,
        @NotBlank @Email @Size(max = 200) String email,
        boolean ativo,
        @NotNull Long versao
) {
}
