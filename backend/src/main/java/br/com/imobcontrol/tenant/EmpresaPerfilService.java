package br.com.imobcontrol.tenant;

import br.com.imobcontrol.cliente.AuditoriaOperacional;
import br.com.imobcontrol.cliente.AuditoriaOperacionalRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
public class EmpresaPerfilService {

    private final EmpresaRepository empresas;
    private final TenantContextService tenants;
    private final PermissaoAcessoService acesso;
    private final AuditoriaOperacionalRepository auditoria;

    public EmpresaPerfilService(
            EmpresaRepository empresas,
            TenantContextService tenants,
            PermissaoAcessoService acesso,
            AuditoriaOperacionalRepository auditoria
    ) {
        this.empresas = empresas;
        this.tenants = tenants;
        this.acesso = acesso;
        this.auditoria = auditoria;
    }

    @Transactional(readOnly = true)
    public EmpresaPerfilResponse obter(Authentication autenticacao, Long empresaSolicitada) {
        acesso.exigir(autenticacao, PermissaoUsuario.CONFIGURACOES_GERENCIAR);
        TenantContextService.Contexto contexto = tenants.resolver(autenticacao, empresaSolicitada);
        Empresa empresa = empresas.findById(contexto.empresaId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Empresa não encontrada"));
        return EmpresaPerfilResponse.from(empresa);
    }

    @Transactional
    public EmpresaPerfilResponse atualizar(
            Authentication autenticacao,
            Long empresaSolicitada,
            EmpresaPerfilRequest body
    ) {
        acesso.exigir(autenticacao, PermissaoUsuario.CONFIGURACOES_GERENCIAR);
        TenantContextService.Contexto contexto = tenants.resolver(autenticacao, empresaSolicitada);
        Empresa empresa = empresas.findById(contexto.empresaId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Empresa não encontrada"));

        String cnpj = normalizarCnpj(body.cnpj());
        if (cnpj != null) {
            empresas.findByCnpj(cnpj)
                    .filter(outra -> !outra.getId().equals(empresa.getId()))
                    .ifPresent(outra -> {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "CNPJ já cadastrado");
                    });
        }

        empresa.setNome(body.nome().trim());
        empresa.setRazaoSocial(texto(body.razaoSocial()));
        empresa.setCnpj(cnpj);
        empresa.setEmail(email(body.email()));
        empresa.setTelefone(texto(body.telefone()));

        try {
            Empresa salva = empresas.saveAndFlush(empresa);
            auditoria.save(new AuditoriaOperacional(
                    contexto.empresaId(),
                    contexto.usuarioId(),
                    "EMPRESA",
                    salva.getId(),
                    "DADOS_CADASTRAIS_ATUALIZADOS"
            ));
            return EmpresaPerfilResponse.from(salva);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Dados cadastrais duplicados", ex);
        }
    }

    private String texto(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return valor.trim();
    }

    private String email(String valor) {
        String email = texto(valor);
        return email == null ? null : email.toLowerCase(Locale.ROOT);
    }

    private String normalizarCnpj(String valor) {
        String cnpj = texto(valor);
        if (cnpj == null) return null;
        cnpj = cnpj.replaceAll("[^0-9]", "");
        if (cnpj.length() != 14) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CNPJ deve conter 14 dígitos");
        }
        return cnpj;
    }
}
