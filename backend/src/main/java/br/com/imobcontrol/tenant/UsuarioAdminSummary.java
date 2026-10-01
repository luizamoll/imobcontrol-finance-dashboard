package br.com.imobcontrol.tenant;

public record UsuarioAdminSummary(
        long total,
        long ativos,
        long inativos,
        long administradores,
        long usuariosOperacionais
) {
}
