package br.com.imobcontrol.corretor;

public record CorretorEmpresaResponse(
    Long id, String nome, String documento, String creci,
    String email, String telefone, String chavePix, Long versao
) {
    static CorretorEmpresaResponse from(CorretorEmpresa c) {
        return new CorretorEmpresaResponse(
            c.getId(), c.getNome(), c.getDocumento(), c.getCreci(),
            c.getEmail(), c.getTelefone(), c.getChavePix(), c.getVersao()
        );
    }
}