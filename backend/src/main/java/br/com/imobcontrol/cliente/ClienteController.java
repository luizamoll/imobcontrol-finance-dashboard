package br.com.imobcontrol.cliente;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    private final ClienteService service;

    public ClienteController(ClienteService service) {
        this.service = service;
    }

    @GetMapping
    public Page<ClienteResponse> listar(
            Authentication usuario,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamanho
    ) {
        return service.listar(usuario, empresaId, pagina, tamanho);
    }

    @GetMapping("/{id}")
    public ClienteResponse detalhar(
            Authentication usuario,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @PathVariable Long id
    ) {
        return service.detalhar(usuario, empresaId, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClienteResponse cadastrar(
            Authentication usuario,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @Valid @RequestBody ClienteRequest dados
    ) {
        return service.cadastrar(usuario, empresaId, dados);
    }

    @PutMapping("/{id}")
    public ClienteResponse atualizar(
            Authentication usuario,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @PathVariable Long id,
            @Valid @RequestBody ClienteRequest dados
    ) {
        return service.atualizar(usuario, empresaId, id, dados);
    }
}
