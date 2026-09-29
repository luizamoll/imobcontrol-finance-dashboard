package br.com.imobcontrol.tenant;

import java.time.LocalDateTime;
import java.util.Set;

public record UsuarioAdminResponse(
        Long id,
        String nome,
        String email,
        String telefone,
        PerfilUsuario perfil,
        boolean ativo,
        Set<PermissaoUsuario> permissoes,
        EmpresaResumo empresa,
        Long versao,
        LocalDateTime criadoEm,
        LocalDateTime atualizadoEm
) {
    public static UsuarioAdminResponse from(Usuario usuario) {
        Empresa empresa = usuario.getEmpresa();
        return new UsuarioAdminResponse(
                usuario.getId(),
                usuario.getNome(),
                usuario.getEmail(),
                usuario.getTelefone(),
                usuario.getPerfil(),
                usuario.isAtivo(),
                Set.copyOf(usuario.getPermissoes()),
                empresa == null ? null : new EmpresaResumo(
                        empresa.getId(),
                        empresa.getNome(),
                        empresa.getSlug()
                ),
                usuario.getVersao(),
                usuario.getCriadoEm(),
                usuario.getAtualizadoEm()
        );
    }

    public record EmpresaResumo(Long id, String nome, String slug) {
    }
}
