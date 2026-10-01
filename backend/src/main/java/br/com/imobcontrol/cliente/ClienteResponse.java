package br.com.imobcontrol.cliente;

import java.time.LocalDateTime;

public record ClienteResponse(
        Long id,
        Long empresaId,
        String nome,
        String cpf,
        String email,
        String telefone,
        String cep,
        String logradouro,
        String numero,
        String complemento,
        String bairro,
        String cidade,
        String uf,
        String estadoCivil,
        String profissao,
        Long versao,
        LocalDateTime criadoEm,
        LocalDateTime atualizadoEm
) {
    public static ClienteResponse from(Cliente c) {
        return new ClienteResponse(
                c.getId(),
                c.getEmpresaId(),
                c.getNome(),
                c.getCpf(),
                c.getEmail(),
                c.getTelefone(),
                c.getCep(),
                c.getLogradouro(),
                c.getNumero(),
                c.getComplemento(),
                c.getBairro(),
                c.getCidade(),
                c.getUf(),
                c.getEstadoCivil(),
                c.getProfissao(),
                c.getVersao(),
                c.getCriadoEm(),
                c.getAtualizadoEm()
        );
    }
}
