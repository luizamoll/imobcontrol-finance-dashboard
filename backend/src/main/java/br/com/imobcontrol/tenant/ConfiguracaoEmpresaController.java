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
@RequestMapping("/api/configuracao-empresa")
public class ConfiguracaoEmpresaController {

    private final ConfiguracaoEmpresaService service;

    public ConfiguracaoEmpresaController(ConfiguracaoEmpresaService service) {
        this.service = service;
    }

    @GetMapping
    public ConfiguracaoEmpresaResponse obter(
            Authentication autenticacao,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId
    ) {
        return service.obter(autenticacao, empresaId);
    }

    @PutMapping
    public ConfiguracaoEmpresaResponse salvar(
            Authentication autenticacao,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @Valid @RequestBody ConfiguracaoEmpresaRequest body
    ) {
        return service.salvar(autenticacao, empresaId, body);
    }
}
