package br.com.imobcontrol.tenant;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record EmpresaUsuarioCreateRequest(
        @NotBlank @Size(max = 160) String nome,
        @NotBlank @Email @Size(max = 200) String email,
        @Size(max = 30) String telefone,
        @NotBlank @Size(min = 8, max = 72) String senha,
        Set<PermissaoUsuario> permissoes
) {
}
