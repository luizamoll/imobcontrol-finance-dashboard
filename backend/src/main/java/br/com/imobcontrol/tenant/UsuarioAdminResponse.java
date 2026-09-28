package br.com.imobcontrol.tenant;

import java.time.LocalDateTime;

public record UsuarioAdminResponse(
        Long id,
        String nome,
        String email,
        PerfilUsuario perfil,
        boolean ativo,
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
                usuario.getPerfil(),
                usuario.isAtivo(),
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
