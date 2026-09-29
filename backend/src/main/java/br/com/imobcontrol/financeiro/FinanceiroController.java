package br.com.imobcontrol.financeiro;

import br.com.imobcontrol.tenant.PermissaoAcessoService;
import br.com.imobcontrol.tenant.PermissaoUsuario;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class FinanceiroController {

    private final FinanceiroService service;
    private final PermissaoAcessoService acesso;

    public FinanceiroController(FinanceiroService service, PermissaoAcessoService acesso) {
        this.service = service;
        this.acesso = acesso;
    }

    @GetMapping("/vendas")
    public Page<VendaResponse> listarVendas(
            Authentication auth,
            @RequestHeader(value="X-Empresa-Id", required=false) Long empresaId,
            @RequestParam(defaultValue="0") int pagina,
            @RequestParam(defaultValue="100") int tamanho
    ) {
        acesso.exigirQualquer(
                auth,
                PermissaoUsuario.VENDAS_VISUALIZAR,
                PermissaoUsuario.VENDAS_GERENCIAR,
                PermissaoUsuario.RECEBIMENTOS_VISUALIZAR,
                PermissaoUsuario.RECEBIMENTOS_REGISTRAR,
                PermissaoUsuario.RECEBIMENTOS_ESTORNAR,
                PermissaoUsuario.FINANCEIRO_VISUALIZAR,
                PermissaoUsuario.RELATORIOS_VISUALIZAR
        );
        return service.listarVendas(auth, empresaId, pagina, tamanho);
    }

    @GetMapping("/vendas/{id}")
    public VendaResponse detalharVenda(
            Authentication auth,
            @RequestHeader(value="X-Empresa-Id", required=false) Long empresaId,
            @PathVariable Long id
    ) {
        acesso.exigirQualquer(
                auth,
                PermissaoUsuario.VENDAS_VISUALIZAR,
                PermissaoUsuario.VENDAS_GERENCIAR,
                PermissaoUsuario.RECEBIMENTOS_VISUALIZAR,
                PermissaoUsuario.RECEBIMENTOS_REGISTRAR,
                PermissaoUsuario.RECEBIMENTOS_ESTORNAR,
                PermissaoUsuario.FINANCEIRO_VISUALIZAR,
                PermissaoUsuario.RELATORIOS_VISUALIZAR
        );
        return service.detalharVenda(auth, empresaId, id);
    }

    @PostMapping("/vendas")
    @ResponseStatus(HttpStatus.CREATED)
    public VendaResponse criarVenda(
            Authentication auth,
            @RequestHeader(value="X-Empresa-Id", required=false) Long empresaId,
            @Valid @RequestBody VendaRequest body
    ) {
        acesso.exigir(auth, PermissaoUsuario.VENDAS_GERENCIAR);
        return service.criarVenda(auth, empresaId, body);
    }

    @PutMapping("/vendas/{id}")
    public VendaResponse atualizarVenda(
            Authentication auth,
            @RequestHeader(value="X-Empresa-Id", required=false) Long empresaId,
            @PathVariable Long id,
            @Valid @RequestBody VendaRequest body
    ) {
        acesso.exigir(auth, PermissaoUsuario.VENDAS_GERENCIAR);
        return service.atualizarVenda(auth, empresaId, id, body);
    }

    @GetMapping("/parcelas")
    public List<ParcelaResponse> listarParcelas(
            Authentication auth,
            @RequestHeader(value="X-Empresa-Id", required=false) Long empresaId
    ) {
        acesso.exigirQualquer(
                auth,
                PermissaoUsuario.VENDAS_VISUALIZAR,
                PermissaoUsuario.VENDAS_GERENCIAR,
                PermissaoUsuario.RECEBIMENTOS_VISUALIZAR,
                PermissaoUsuario.RECEBIMENTOS_REGISTRAR,
                PermissaoUsuario.RECEBIMENTOS_ESTORNAR,
                PermissaoUsuario.FINANCEIRO_VISUALIZAR,
                PermissaoUsuario.RELATORIOS_VISUALIZAR
        );
        return service.listarParcelas(auth, empresaId);
    }

    @GetMapping("/movimentos")
    public List<MovimentoResponse> listarMovimentos(
            Authentication auth,
            @RequestHeader(value="X-Empresa-Id", required=false) Long empresaId
    ) {
        acesso.exigirQualquer(
                auth,
                PermissaoUsuario.VENDAS_VISUALIZAR,
                PermissaoUsuario.VENDAS_GERENCIAR,
                PermissaoUsuario.RECEBIMENTOS_VISUALIZAR,
                PermissaoUsuario.RECEBIMENTOS_REGISTRAR,
                PermissaoUsuario.RECEBIMENTOS_ESTORNAR,
                PermissaoUsuario.FINANCEIRO_VISUALIZAR,
                PermissaoUsuario.RELATORIOS_VISUALIZAR
        );
        return service.listarMovimentos(auth, empresaId);
    }

    @PostMapping("/parcelas/{id}/receber")
    @ResponseStatus(HttpStatus.CREATED)
    public MovimentoResponse receber(
            Authentication auth,
            @RequestHeader(value="X-Empresa-Id", required=false) Long empresaId,
            @PathVariable Long id,
            @Valid @RequestBody RecebimentoRequest body
    ) {
        acesso.exigir(auth, PermissaoUsuario.RECEBIMENTOS_REGISTRAR);
        return service.receber(auth, empresaId, id, body);
    }

    @PostMapping("/parcelas/{id}/reverter")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reverter(
            Authentication auth,
            @RequestHeader(value="X-Empresa-Id", required=false) Long empresaId,
            @PathVariable Long id
    ) {
        acesso.exigir(auth, PermissaoUsuario.RECEBIMENTOS_ESTORNAR);
        service.reverterRecebimento(auth, empresaId, id);
    }
}
