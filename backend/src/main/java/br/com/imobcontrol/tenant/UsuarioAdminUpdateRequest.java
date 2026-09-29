package br.com.imobcontrol.tenant;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UsuarioAdminUpdateRequest(
        @NotBlank @Size(max = 160) String nome,
        @NotBlank @Email @Size(max = 200) String email,
        @Size(max = 30) String telefone,
        @NotNull Long empresaId,
        @NotNull PerfilUsuario perfil,
        boolean ativo,
        @NotNull Long versao
) {
    public UsuarioAdminUpdateRequest(
            String nome,
            String email,
            Long empresaId,
            PerfilUsuario perfil,
            boolean ativo,
            Long versao
    ) {
        this(nome, email, null, empresaId, perfil, ativo, versao);
    }
}
