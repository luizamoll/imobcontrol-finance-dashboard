package br.com.imobcontrol.tenant;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/empresa/perfil")
public class EmpresaPerfilController {

    private final EmpresaPerfilService service;

    public EmpresaPerfilController(EmpresaPerfilService service) {
        this.service = service;
    }

    @GetMapping
    public EmpresaPerfilResponse obter(
            Authentication autenticacao,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId
    ) {
        return service.obter(autenticacao, empresaId);
    }

    @PutMapping
    public EmpresaPerfilResponse atualizar(
            Authentication autenticacao,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @Valid @RequestBody EmpresaPerfilRequest body
    ) {
        return service.atualizar(autenticacao, empresaId, body);
    }
}
