package br.com.imobcontrol.cliente;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClienteRequest(
        @NotBlank @Size(max = 160) String nome,
        @Size(max = 14) String cpf,
        @Email @Size(max = 200) String email,
        @Size(max = 30) String telefone,
        @Size(max = 9) String cep,
        @Size(max = 200) String logradouro,
        @Size(max = 30) String numero,
        @Size(max = 120) String complemento,
        @Size(max = 120) String bairro,
        @Size(max = 120) String cidade,
        @Size(max = 2) String uf,
        @Size(max = 40) String estadoCivil,
        @Size(max = 120) String profissao,
        Long versao
) {
}
