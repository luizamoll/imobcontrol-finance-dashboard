package br.com.imobcontrol.dividendos;

import br.com.imobcontrol.tenant.PermissaoAcessoService;
import br.com.imobcontrol.tenant.PermissaoUsuario;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dividendos-terceiros")
public class DividendoTerceiroController {

    private final DividendoTerceiroService service;
    private final PermissaoAcessoService acesso;

    public DividendoTerceiroController(
            DividendoTerceiroService service,
            PermissaoAcessoService acesso
    ) {
        this.service = service;
        this.acesso = acesso;
    }

    @GetMapping
    public List<DividendoTerceiroResponse> listar(
            Authentication auth,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId
    ) {
        acesso.exigirQualquer(
                auth,
                PermissaoUsuario.FINANCEIRO_VISUALIZAR,
                PermissaoUsuario.CONFIGURACOES_GERENCIAR
        );
        return service.listar(auth, empresaId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DividendoTerceiroResponse cadastrar(
            Authentication auth,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @Valid @RequestBody DividendoTerceiroRequest dados
    ) {
        acesso.exigirQualquer(
                auth,
                PermissaoUsuario.FINANCEIRO_VISUALIZAR,
                PermissaoUsuario.CONFIGURACOES_GERENCIAR
        );
        return service.cadastrar(auth, empresaId, dados);
    }

    @PutMapping("/{id}")
    public DividendoTerceiroResponse atualizar(
            Authentication auth,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @PathVariable Long id,
            @Valid @RequestBody DividendoTerceiroRequest dados
    ) {
        acesso.exigirQualquer(
                auth,
                PermissaoUsuario.FINANCEIRO_VISUALIZAR,
                PermissaoUsuario.CONFIGURACOES_GERENCIAR
        );
        return service.atualizar(auth, empresaId, id, dados);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(
            Authentication auth,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @PathVariable Long id
    ) {
        acesso.exigirQualquer(
                auth,
                PermissaoUsuario.FINANCEIRO_VISUALIZAR,
                PermissaoUsuario.CONFIGURACOES_GERENCIAR
        );
        service.excluir(auth, empresaId, id);
    }
}
