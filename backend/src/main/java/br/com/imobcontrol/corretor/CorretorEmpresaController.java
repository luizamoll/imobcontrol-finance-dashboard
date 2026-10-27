package br.com.imobcontrol.corretor;

import br.com.imobcontrol.financeiro.VendaRepository;
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
    private final VendaRepository vendas;

    public CorretorEmpresaController(
        CorretorEmpresaRepository repo, TenantContextService tenants,
        PermissaoAcessoService acesso, VendaRepository vendas
    ) {
        this.repo = repo;
        this.tenants = tenants;
        this.acesso = acesso;
        this.vendas = vendas;
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
            PermissaoUsuario.FINANCEIRO_VISUALIZAR, PermissaoUsuario.CONFIGURACOES_GERENCIAR
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
        preencher(c, body);
        try {
            return CorretorEmpresaResponse.from(repo.saveAndFlush(c));
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Corretor já cadastrado nesta empresa", e);
        }
    }

    @PutMapping("/{id}")
    @Transactional
    public CorretorEmpresaResponse atualizar(
        Authentication usuario,
        @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
        @PathVariable Long id,
        @Valid @RequestBody CorretorEmpresaRequest body
    ) {
        acesso.exigirQualquer(usuario, PermissaoUsuario.VENDAS_CRIAR,
            PermissaoUsuario.VENDAS_GERENCIAR, PermissaoUsuario.CONFIGURACOES_GERENCIAR);
        var ctx = tenants.resolver(usuario, empresaId);
        var atual = repo.findByIdAndEmpresaId(id, ctx.empresaId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (body.versao() == null || !body.versao().equals(atual.getVersao())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cadastro alterado. Atualize a tela.");
        }
        String nome = body.nome().trim();
        if (!atual.getNome().equalsIgnoreCase(nome)
                && repo.existsByEmpresaIdAndNomeIgnoreCase(ctx.empresaId(), nome)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe corretor com esse nome");
        }
        if (!atual.getNome().equalsIgnoreCase(nome)
                && vendas.existsByEmpresaIdAndCorretorNomeIgnoreCase(ctx.empresaId(), atual.getNome())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Corretor vinculado a vendas. Preserve o nome ou ajuste as vendas individualmente.");
        }
        preencher(atual, body);
        try {
            return CorretorEmpresaResponse.from(repo.saveAndFlush(atual));
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Corretor já cadastrado nesta empresa", e);
        }
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void excluir(
        Authentication usuario,
        @RequestHeader(value = "X-Empresa-Id", required = false) Long empresaId,
        @PathVariable Long id
    ) {
        acesso.exigirQualquer(usuario, PermissaoUsuario.VENDAS_GERENCIAR,
            PermissaoUsuario.CONFIGURACOES_GERENCIAR);
        var ctx = tenants.resolver(usuario, empresaId);
        var atual = repo.findByIdAndEmpresaId(id, ctx.empresaId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (vendas.existsByEmpresaIdAndCorretorNomeIgnoreCase(ctx.empresaId(), atual.getNome())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Corretor está vinculado a uma venda e não pode ser excluído");
        }
        repo.delete(atual);
    }

    private void preencher(CorretorEmpresa c, CorretorEmpresaRequest body) {
        c.setNome(body.nome().trim());
        c.setDocumento(limpar(body.documento()));
        c.setCreci(limpar(body.creci()));
        c.setEmail(limpar(body.email()));
        c.setTelefone(limpar(body.telefone()));
        c.setChavePix(limpar(body.chavePix()));
    }

    private static String limpar(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}