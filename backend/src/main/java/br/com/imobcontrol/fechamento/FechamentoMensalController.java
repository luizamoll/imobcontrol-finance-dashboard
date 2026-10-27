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
    private final FechamentoArquivoService arquivos;

    public FechamentoMensalController(
        FechamentoMensalService service, PermissaoAcessoService acesso,
        FechamentoArquivoService arquivos
    ) {
        this.service = service;
        this.acesso = acesso;
        this.arquivos = arquivos;
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

    @GetMapping("/arquivos")
    public java.util.List<FechamentoArquivoResponse> arquivos(
        Authentication auth,
        @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId
    ) {
        acesso.exigirQualquer(auth, PermissaoUsuario.RELATORIOS_VISUALIZAR,
            PermissaoUsuario.FINANCEIRO_VISUALIZAR);
        return arquivos.listar(auth, empresaId);
    }

    @GetMapping("/arquivos/{id}")
    public FechamentoArquivoResponse arquivo(
        Authentication auth,
        @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
        @PathVariable Long id
    ) {
        acesso.exigirQualquer(auth, PermissaoUsuario.RELATORIOS_VISUALIZAR,
            PermissaoUsuario.FINANCEIRO_VISUALIZAR);
        return arquivos.buscar(auth, empresaId, id);
    }

    @PostMapping("/arquivos")
    @ResponseStatus(HttpStatus.CREATED)
    public FechamentoArquivoResponse arquivar(
        Authentication auth,
        @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
        @Valid @RequestBody FechamentoArquivoRequest request
    ) {
        acesso.exigir(auth, PermissaoUsuario.CONFIGURACOES_GERENCIAR);
        return arquivos.arquivar(auth, empresaId, request);
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