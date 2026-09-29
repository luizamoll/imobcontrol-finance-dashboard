package br.com.imobcontrol.tenant;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/empresa/usuarios")
public class EmpresaUsuarioController {

    private final EmpresaUsuarioService service;

    public EmpresaUsuarioController(EmpresaUsuarioService service) {
        this.service = service;
    }

    @GetMapping
    public Page<UsuarioAdminResponse> listar(
            Authentication autenticacao,
            @RequestParam(required = false) Boolean ativo,
            @RequestParam(required = false) String busca,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "50") int tamanho
    ) {
        return service.listar(autenticacao, ativo, busca, pagina, tamanho);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioAdminResponse criar(
            Authentication autenticacao,
            @Valid @RequestBody EmpresaUsuarioCreateRequest body
    ) {
        return service.criar(autenticacao, body);
    }

    @PutMapping("/{id}")
    public UsuarioAdminResponse atualizar(
            Authentication autenticacao,
            @PathVariable Long id,
            @Valid @RequestBody EmpresaUsuarioUpdateRequest body
    ) {
        return service.atualizar(autenticacao, id, body);
    }

    @PostMapping("/{id}/convite")
    public ConviteResponse reenviarConvite(
            Authentication autenticacao,
            @PathVariable Long id
    ) {
        return new ConviteResponse(service.reenviarConvite(autenticacao, id));
    }

    @PostMapping("/{id}/senha")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void redefinirSenha(
            Authentication autenticacao,
            @PathVariable Long id,
            @Valid @RequestBody UsuarioAdminPasswordRequest body
    ) {
        service.redefinirSenha(autenticacao, id, body);
    }
    public record ConviteResponse(boolean enviado) {
    }
}
