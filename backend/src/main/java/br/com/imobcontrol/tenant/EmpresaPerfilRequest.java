package br.com.imobcontrol.tenant;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EmpresaPerfilRequest(
        @NotBlank @Size(max = 160) String nome,
        @Size(max = 200) String razaoSocial,
        @Size(max = 18) String cnpj,
        @Email @Size(max = 200) String email,
        @Size(max = 30) String telefone
) {
}
