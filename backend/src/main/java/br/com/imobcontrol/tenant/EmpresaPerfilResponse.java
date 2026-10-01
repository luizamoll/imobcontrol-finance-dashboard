package br.com.imobcontrol.tenant;

import java.time.LocalDateTime;

public record EmpresaPerfilResponse(
        Long id,
        String nome,
        String razaoSocial,
        String cnpj,
        String email,
        String telefone,
        boolean ativa,
        LocalDateTime atualizadoEm
) {
    public static EmpresaPerfilResponse from(Empresa empresa) {
        return new EmpresaPerfilResponse(
                empresa.getId(),
                empresa.getNome(),
                empresa.getRazaoSocial(),
                empresa.getCnpj(),
                empresa.getEmail(),
                empresa.getTelefone(),
                empresa.isAtiva(),
                empresa.getAtualizadoEm()
        );
    }
}
