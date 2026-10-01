package br.com.imobcontrol.cliente;

import br.com.imobcontrol.tenant.TenantContextService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Objects;
import java.util.Set;

@Service
public class ClienteService {

    private static final Set<String> UFS = Set.of(
            "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
            "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
            "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
    );

    private final ClienteRepository clientes;
    private final AuditoriaOperacionalRepository auditoria;
    private final TenantContextService tenants;

    public ClienteService(
            ClienteRepository clientes,
            AuditoriaOperacionalRepository auditoria,
            TenantContextService tenants
    ) {
        this.clientes = clientes;
        this.auditoria = auditoria;
        this.tenants = tenants;
    }

    @Transactional(readOnly = true)
    public Page<ClienteResponse> listar(
            Authentication autenticacao, Long empresaId, int pagina, int tamanho
    ) {
        TenantContextService.Contexto ctx = tenants.resolver(autenticacao, empresaId);
        if (pagina < 0 || tamanho < 1 || tamanho > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paginação inválida");
        }
        return clientes.findByEmpresaId(
                ctx.empresaId(),
                PageRequest.of(pagina, tamanho, Sort.by(Sort.Direction.ASC, "nome"))
        ).map(ClienteResponse::from);
    }

    @Transactional(readOnly = true)
    public ClienteResponse detalhar(Authentication autenticacao, Long empresaId, Long id) {
        TenantContextService.Contexto ctx = tenants.resolver(autenticacao, empresaId);
        return ClienteResponse.from(localizar(ctx.empresaId(), id));
    }

    @Transactional
    public ClienteResponse cadastrar(
            Authentication autenticacao, Long empresaId, ClienteRequest dados
    ) {
        TenantContextService.Contexto ctx = tenants.resolver(autenticacao, empresaId);
        Cliente novo = new Cliente();
        novo.setEmpresaId(ctx.empresaId());
        novo.setCriadoPorUsuarioId(ctx.usuarioId());
        novo.setAtualizadoPorUsuarioId(ctx.usuarioId());
        preencher(novo, dados);
        verificarCpfUnico(ctx.empresaId(), novo.getCpf());
        Cliente salvo = salvar(novo);
        registrar(ctx, salvo.getId(), "CRIACAO");
        return ClienteResponse.from(salvo);
    }

    @Transactional
    public ClienteResponse atualizar(
            Authentication autenticacao, Long empresaId, Long id, ClienteRequest dados
    ) {
        TenantContextService.Contexto ctx = tenants.resolver(autenticacao, empresaId);
        Cliente existente = localizar(ctx.empresaId(), id);
        if (dados.versao() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe a versão atual do cadastro");
        }
        if (!Objects.equals(dados.versao(), existente.getVersao())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Este cliente foi alterado por outro usuário. Atualize a tela antes de salvar."
            );
        }

        String cpfAnterior = existente.getCpf();
        preencher(existente, dados);
        if (!Objects.equals(cpfAnterior, existente.getCpf())) {
            verificarCpfUnico(ctx.empresaId(), existente.getCpf());
        }
        existente.setAtualizadoPorUsuarioId(ctx.usuarioId());
        Cliente salvo = salvar(existente);
        registrar(ctx, salvo.getId(), "ATUALIZACAO");
        return ClienteResponse.from(salvo);
    }

    private Cliente localizar(Long empresaId, Long id) {
        return clientes.findByIdAndEmpresaId(id, empresaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private void verificarCpfUnico(Long empresaId, String cpf) {
        if (cpf != null && clientes.existsByEmpresaIdAndCpf(empresaId, cpf)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CPF já cadastrado nesta empresa");
        }
    }

    private Cliente salvar(Cliente cliente) {
        try {
            return clientes.saveAndFlush(cliente);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Cadastro duplicado ou inconsistente", e
            );
        } catch (OptimisticLockingFailureException e) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Cadastro alterado por outro usuário", e
            );
        }
    }

    private void registrar(TenantContextService.Contexto contexto, Long id, String acao) {
        auditoria.save(new AuditoriaOperacional(
                contexto.empresaId(), contexto.usuarioId(), "CLIENTE", id, acao
        ));
    }

    private void preencher(Cliente cliente, ClienteRequest dados) {
        cliente.setNome(dados.nome().trim());
        cliente.setCpf(normalizarCpf(dados.cpf()));
        cliente.setEmail(texto(dados.email()));
        cliente.setTelefone(texto(dados.telefone()));

        String cep = somenteDigitos(dados.cep());
        if (cep != null && cep.length() != 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CEP inválido");
        }
        cliente.setCep(cep);
        cliente.setLogradouro(texto(dados.logradouro()));
        cliente.setNumero(texto(dados.numero()));
        cliente.setComplemento(texto(dados.complemento()));
        cliente.setBairro(texto(dados.bairro()));
        cliente.setCidade(texto(dados.cidade()));
        String uf = texto(dados.uf());
        if (uf != null) {
            uf = uf.toUpperCase(Locale.ROOT);
            if (!UFS.contains(uf)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "UF inválida");
            }
        }
        cliente.setUf(uf);
        cliente.setEstadoCivil(texto(dados.estadoCivil()));
        cliente.setProfissao(texto(dados.profissao()));
    }

    private static String texto(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return valor.trim();
    }

    private static String somenteDigitos(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return valor.replaceAll("\\D", "");
    }

    public static String normalizarCpf(String cpf) {
        String digitos = somenteDigitos(cpf);
        if (digitos == null) return null;
        if (!cpfValido(digitos)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CPF inválido");
        }
        return digitos;
    }

    public static boolean cpfValido(String cpf) {
        if (cpf == null || !cpf.matches("\\d{11}")) return false;
        if (cpf.chars().distinct().count() == 1) return false;

        for (int indice = 9; indice <= 10; indice++) {
            int soma = 0;
            for (int i = 0; i < indice; i++) {
                soma += Character.digit(cpf.charAt(i), 10) * (indice + 1 - i);
            }
            int verificador = (soma * 10) % 11;
            if (verificador == 10) verificador = 0;
            if (verificador != Character.digit(cpf.charAt(indice), 10)) return false;
        }
        return true;
    }
}
