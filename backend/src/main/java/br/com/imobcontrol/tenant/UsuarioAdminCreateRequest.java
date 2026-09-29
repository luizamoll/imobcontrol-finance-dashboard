package br.com.imobcontrol.tenant;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UsuarioAdminCreateRequest(
        @NotBlank @Size(max = 160) String nome,
        @NotBlank @Email @Size(max = 200) String email,
        @Size(max = 30) String telefone,
        @NotNull Long empresaId,
        @NotNull PerfilUsuario perfil,
        @NotBlank @Size(min = 8, max = 72) String senha
) {
    public UsuarioAdminCreateRequest(
            String nome,
            String email,
            Long empresaId,
            PerfilUsuario perfil,
            String senha
    ) {
        this(nome, email, null, empresaId, perfil, senha);
    }
}
