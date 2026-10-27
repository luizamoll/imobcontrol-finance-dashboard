package br.com.imobcontrol.corretor;

import br.com.imobcontrol.tenant.PermissaoAcessoService;
import br.com.imobcontrol.tenant.PermissaoUsuario;
import br.com.imobcontrol.tenant.TenantContextService;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/corretores")
public class CorretorEmpresaController {
    private final CorretorEmpresaRepository repo;
    private final TenantContextService tenants;
    private final PermissaoAcessoService acesso;

    public CorretorEmpresaController(
        CorretorEmpresaRepository repo, TenantContextService tenants,
        PermissaoAcessoService acesso
    ) {
        this.repo = repo;
        this.tenants = tenants;
        this.acesso = acesso;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<CorretorEmpresaResponse> listar(
        Authentication usuario,
        @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId
    ) {
        acesso.exigirQualquer(
            usuario, PermissaoUsuario.VENDAS_CRIAR, PermissaoUsuario.VENDAS_VISUALIZAR,
            PermissaoUsuario.VENDAS_EDITAR, PermissaoUsuario.VENDAS_GERENCIAR,
            PermissaoUsuario.CONFIGURACOES_GERENCIAR
        );
        var ctx = tenants.resolver(usuario, empresaId);
        return repo.findByEmpresaIdOrderByNomeAsc(ctx.empresaId())
            .stream().map(CorretorEmpresaResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public CorretorEmpresaResponse cadastrar(
        Authentication usuario,
        @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
        @Valid @RequestBody CorretorEmpresaRequest body
    ) {
        acesso.exigirQualquer(
            usuario, PermissaoUsuario.VENDAS_CRIAR,
            PermissaoUsuario.VENDAS_GERENCIAR, PermissaoUsuario.CONFIGURACOES_GERENCIAR
        );
        var ctx = tenants.resolver(usuario, empresaId);
        String nome = body.nome().trim();
        if (repo.existsByEmpresaIdAndNomeIgnoreCase(ctx.empresaId(), nome)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Corretor já cadastrado nesta empresa");
        }
        var c = new CorretorEmpresa();
        c.setEmpresaId(ctx.empresaId());
        c.setNome(nome);
        c.setDocumento(limpar(body.documento()));
        c.setCreci(limpar(body.creci()));
        c.setEmail(limpar(body.email()));
        c.setTelefone(limpar(body.telefone()));
        c.setChavePix(limpar(body.chavePix()));
        try {
            return CorretorEmpresaResponse.from(repo.saveAndFlush(c));
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Corretor já cadastrado nesta empresa", e);
        }
    }

    private static String limpar(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}