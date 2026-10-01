package br.com.imobcontrol.tenant;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record EmpresaUsuarioUpdateRequest(
        @NotBlank @Size(max = 160) String nome,
        @NotBlank @Email @Size(max = 200) String email,
        @Size(max = 30) String telefone,
        boolean ativo,
        Set<PermissaoUsuario> permissoes,
        @NotNull Long versao
) {
    public EmpresaUsuarioUpdateRequest(
            String nome,
            String email,
            boolean ativo,
            Long versao
    ) {
        this(nome, email, null, ativo, Set.of(), versao);
    }
}
