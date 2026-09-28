package br.com.imobcontrol.operacao;

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

import java.util.List;

@RestController
@RequestMapping("/api")
public class OperacaoCatalogoController {

    private final OperacaoCatalogoService service;

    public OperacaoCatalogoController(OperacaoCatalogoService service) {
        this.service = service;
    }

    @GetMapping("/empreendimentos")
    public Page<EmpreendimentoResponse> listarEmpreendimentos(
            Authentication usuario,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "100") int tamanho
    ) {
        return service.listarEmpreendimentos(usuario, empresaId, pagina, tamanho);
    }

    @GetMapping("/empreendimentos/{id}")
    public EmpreendimentoResponse detalharEmpreendimento(
            Authentication usuario,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @PathVariable Long id
    ) {
        return service.detalharEmpreendimento(usuario, empresaId, id);
    }

    @PostMapping("/empreendimentos")
    @ResponseStatus(HttpStatus.CREATED)
    public EmpreendimentoResponse criarEmpreendimento(
            Authentication usuario,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @Valid @RequestBody EmpreendimentoRequest body
    ) {
        return service.criarEmpreendimento(usuario, empresaId, body);
    }

    @PutMapping("/empreendimentos/{id}")
    public EmpreendimentoResponse atualizarEmpreendimento(
            Authentication usuario,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @PathVariable Long id,
            @Valid @RequestBody EmpreendimentoRequest body
    ) {
        return service.atualizarEmpreendimento(usuario, empresaId, id, body);
    }

    @GetMapping("/empreendimentos/{id}/quadras")
    public List<QuadraResponse> listarQuadras(
            Authentication usuario,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @PathVariable Long id
    ) {
        return service.listarQuadras(usuario, empresaId, id);
    }

    @PostMapping("/quadras")
    @ResponseStatus(HttpStatus.CREATED)
    public QuadraResponse criarQuadra(
            Authentication usuario,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @Valid @RequestBody QuadraRequest body
    ) {
        return service.criarQuadra(usuario, empresaId, body);
    }

    @PutMapping("/quadras/{id}")
    public QuadraResponse atualizarQuadra(
            Authentication usuario,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @PathVariable Long id,
            @Valid @RequestBody QuadraRequest body
    ) {
        return service.atualizarQuadra(usuario, empresaId, id, body);
    }

    @GetMapping("/empreendimentos/{id}/unidades")
    public List<UnidadeResponse> listarUnidades(
            Authentication usuario,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @PathVariable Long id
    ) {
        return service.listarUnidades(usuario, empresaId, id);
    }

    @PostMapping("/unidades")
    @ResponseStatus(HttpStatus.CREATED)
    public UnidadeResponse criarUnidade(
            Authentication usuario,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @Valid @RequestBody UnidadeRequest body
    ) {
        return service.criarUnidade(usuario, empresaId, body);
    }

    @PutMapping("/unidades/{id}")
    public UnidadeResponse atualizarUnidade(
            Authentication usuario,
            @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
            @PathVariable Long id,
            @Valid @RequestBody UnidadeRequest body
    ) {
        return service.atualizarUnidade(usuario, empresaId, id, body);
    }
}
