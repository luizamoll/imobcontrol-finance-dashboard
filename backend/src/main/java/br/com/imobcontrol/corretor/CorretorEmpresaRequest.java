package br.com.imobcontrol.corretor;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CorretorEmpresaRequest(
    @NotBlank @Size(max=160) String nome,
    @Size(max=30) String documento,
    @Size(max=80) String creci,
    @Email @Size(max=200) String email,
    @Size(max=30) String telefone,
    @Size(max=200) String chavePix
) {}