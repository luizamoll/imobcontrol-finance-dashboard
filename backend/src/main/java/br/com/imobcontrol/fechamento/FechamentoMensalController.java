package br.com.imobcontrol.fechamento;

import br.com.imobcontrol.tenant.PermissaoAcessoService;
import br.com.imobcontrol.tenant.PermissaoUsuario;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fechamento-mensal")
public class FechamentoMensalController {
    private final FechamentoMensalService service;
    private final PermissaoAcessoService acesso;

    public FechamentoMensalController(FechamentoMensalService service, PermissaoAcessoService acesso) {
        this.service = service;
        this.acesso = acesso;
    }

    @GetMapping
    public FechamentoMensalResponse consultar(
        Authentication auth,
        @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
        @RequestParam String mes,
        @RequestParam(required = false) Long empreendimentoId
    ) {
        acesso.exigirQualquer(auth, PermissaoUsuario.RELATORIOS_VISUALIZAR,
            PermissaoUsuario.FINANCEIRO_VISUALIZAR);
        return service.consultar(auth, empresaId, mes, empreendimentoId);
    }

    @PostMapping("/lancamentos")
    @ResponseStatus(HttpStatus.CREATED)
    public FechamentoMensalResponse.Lancamento cadastrar(
        Authentication auth,
        @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
        @Valid @RequestBody FechamentoLancamentoRequest body
    ) {
        acesso.exigirQualquer(auth, PermissaoUsuario.RECEBIMENTOS_REGISTRAR,
            PermissaoUsuario.CONFIGURACOES_GERENCIAR);
        return service.cadastrar(auth, empresaId, body);
    }

    @PostMapping("/lancamentos/{id}/estornar")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void estornar(
        Authentication auth,
        @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
        @PathVariable Long id
    ) {
        acesso.exigirQualquer(auth, PermissaoUsuario.RECEBIMENTOS_ESTORNAR,
            PermissaoUsuario.CONFIGURACOES_GERENCIAR);
        service.estornar(auth, empresaId, id);
    }
}