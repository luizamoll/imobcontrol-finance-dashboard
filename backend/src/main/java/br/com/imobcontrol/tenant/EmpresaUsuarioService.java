package br.com.imobcontrol.tenant;

import br.com.imobcontrol.auth.AcessoContaService;
import br.com.imobcontrol.cliente.AuditoriaOperacional;
import br.com.imobcontrol.cliente.AuditoriaOperacionalRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

@Service
public class EmpresaUsuarioService {

    private final UsuarioRepository usuarios;
    private final EmpresaRepository empresas;
    private final PasswordEncoder passwordEncoder;
    private final AcessoContaService acessoConta;
    private final AuditoriaOperacionalRepository auditoria;
    private final TenantContextService tenants;
    private final PermissaoAcessoService acesso;

    public EmpresaUsuarioService(
            UsuarioRepository usuarios,
            EmpresaRepository empresas,
            PasswordEncoder passwordEncoder,
            AcessoContaService acessoConta,
            AuditoriaOperacionalRepository auditoria,
            TenantContextService tenants,
            PermissaoAcessoService acesso
    ) {
        this.usuarios = usuarios;
        this.empresas = empresas;
        this.passwordEncoder = passwordEncoder;
        this.acessoConta = acessoConta;
        this.auditoria = auditoria;
        this.tenants = tenants;
        this.acesso = acesso;
    }

    @Transactional(readOnly = true)
    public Page<UsuarioAdminResponse> listar(
            Authentication autenticacao,
            Boolean ativo,
            String busca,
            int pagina,
            int tamanho
    ) {
        return listar(autenticacao, null, ativo, busca, pagina, tamanho);
    }

    @Transactional
    public UsuarioAdminResponse criar(
            Authentication autenticacao,
            EmpresaUsuarioCreateRequest body
    ) {
        return criar(autenticacao, null, body);
    }

    @Transactional
    public UsuarioAdminResponse atualizar(
            Authentication autenticacao,
            Long id,
            EmpresaUsuarioUpdateRequest body
    ) {
        return atualizar(autenticacao, null, id, body);
    }

    @Transactional
    public void redefinirSenha(
            Authentication autenticacao,
            Long id,
            UsuarioAdminPasswordRequest body
    ) {
        redefinirSenha(autenticacao, null, id, body);
    }

    @Transactional
    public boolean reenviarConvite(
            Authentication autenticacao,
            Long id
    ) {
        return reenviarConvite(autenticacao, null, id);
    }

    @Transactional(readOnly = true)
    public Page<UsuarioAdminResponse> listar(
            Authentication autenticacao,
            Long empresaSolicitada,
            Boolean ativo,
            String busca,
            int pagina,
            int tamanho
    ) {
        AcessoEquipe contexto = contexto(autenticacao, empresaSolicitada);
        if (pagina < 0 || tamanho < 1 || tamanho > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paginação inválida");
        }

        String termo = busca == null || busca.isBlank() ? null : busca.trim();
        return usuarios.buscar(
                contexto.empresa().getId(),
                PerfilUsuario.USUARIO,
                ativo,
                termo,
                PageRequest.of(pagina, tamanho, Sort.by(Sort.Direction.ASC, "nome"))
        ).map(UsuarioAdminResponse::from);
    }

    @Transactional
    public UsuarioAdminResponse criar(
            Authentication autenticacao,
            Long empresaSolicitada,
            EmpresaUsuarioCreateRequest body
    ) {
        AcessoEquipe contexto = contexto(autenticacao, empresaSolicitada);
        validarPermissoesDelegadas(contexto.ator(), body.permissoes());

        String email = normalizarEmail(body.email());
        if (usuarios.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já cadastrado");
        }

        Usuario usuario = new Usuario();
        usuario.setNome(body.nome().trim());
        usuario.setEmail(email);
        usuario.setTelefone(textoOpcional(body.telefone()));
        usuario.setSenhaHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
        usuario.setSenhaDefinida(false);
        usuario.setEmailVerificado(false);
        usuario.setPerfil(PerfilUsuario.USUARIO);
        usuario.setPermissoes(permissoes(body.permissoes()));
        usuario.setEmpresa(contexto.empresa());
        usuario.setAtivo(true);

        Usuario salvo = salvar(usuario);
        registrarAuditoria(contexto.ator(), contexto.empresa(), salvo, "FUNCIONARIO_CRIADO");
        acessoConta.enviarConvite(salvo);
        return UsuarioAdminResponse.from(salvo);
    }

    @Transactional
    public UsuarioAdminResponse atualizar(
            Authentication autenticacao,
            Long empresaSolicitada,
            Long id,
            EmpresaUsuarioUpdateRequest body
    ) {
        AcessoEquipe contexto = contexto(autenticacao, empresaSolicitada);
        Usuario usuario = alvoDaMesmaEmpresa(contexto, id);
        validarPermissoesDelegadas(contexto.ator(), body.permissoes());

        if (!Objects.equals(usuario.getVersao(), body.versao())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Este funcionário foi alterado por outra sessão. Atualize a tela antes de salvar."
            );
        }

        String emailAnterior = usuario.getEmail();
        String email = normalizarEmail(body.email());
        boolean emailAlterado = !email.equalsIgnoreCase(emailAnterior);
        usuarios.findByEmailIgnoreCase(email)
                .filter(outro -> !outro.getId().equals(usuario.getId()))
                .ifPresent(outro -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já cadastrado");
                });

        usuario.setNome(body.nome().trim());
        usuario.setEmail(email);
        if (emailAlterado) {
            usuario.setEmailVerificado(false);
            usuario.setConviteEnviadoEm(null);
        }
        usuario.setTelefone(textoOpcional(body.telefone()));
        usuario.setPermissoes(permissoes(body.permissoes()));
        usuario.setAtivo(body.ativo());

        Usuario salvo = salvar(usuario);

        if (!salvo.isAtivo()) {
            acessoConta.encerrarSessoes(emailAnterior);
            if (emailAlterado) acessoConta.encerrarSessoes(salvo.getEmail());
        } else if (emailAlterado) {
            acessoConta.encerrarSessoes(emailAnterior);
            if (salvo.isSenhaDefinida()) {
                acessoConta.enviarVerificacaoEmail(salvo);
            } else {
                acessoConta.enviarConvite(salvo);
            }
        }

        registrarAuditoria(
                contexto.ator(),
                contexto.empresa(),
                salvo,
                body.ativo() ? "FUNCIONARIO_ATUALIZADO" : "FUNCIONARIO_DESATIVADO"
        );
        return UsuarioAdminResponse.from(salvo);
    }

    @Transactional
    public void redefinirSenha(
            Authentication autenticacao,
            Long empresaSolicitada,
            Long id,
            UsuarioAdminPasswordRequest body
    ) {
        AcessoEquipe contexto = contexto(autenticacao, empresaSolicitada);
        Usuario usuario = alvoDaMesmaEmpresa(contexto, id);

        usuario.setSenhaHash(passwordEncoder.encode(body.senha()));
        usuario.setSenhaDefinida(true);
        // A senha definida pelo gestor funciona como ativação administrativa do acesso.
        // Isso permite bootstrap/testes mesmo quando o SMTP ainda não está configurado.
        usuario.setEmailVerificado(true);
        Usuario salvo = salvar(usuario);
        acessoConta.invalidarTokensDoUsuario(salvo.getId());
        acessoConta.encerrarSessoes(salvo.getEmail());
        registrarAuditoria(contexto.ator(), contexto.empresa(), salvo, "SENHA_FUNCIONARIO_REDEFINIDA");
    }

    @Transactional
    public boolean reenviarConvite(
            Authentication autenticacao,
            Long empresaSolicitada,
            Long id
    ) {
        AcessoEquipe contexto = contexto(autenticacao, empresaSolicitada);
        Usuario usuario = alvoDaMesmaEmpresa(contexto, id);
        if (usuario.isSenhaDefinida() && usuario.isEmailVerificado()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Este funcionário já ativou a conta"
            );
        }
        boolean enviado = acessoConta.enviarConvite(usuario);
        registrarAuditoria(contexto.ator(), contexto.empresa(), usuario, "CONVITE_FUNCIONARIO_REENVIADO");
        return enviado;
    }

    private AcessoEquipe contexto(Authentication autenticacao, Long empresaSolicitada) {
        acesso.exigir(autenticacao, PermissaoUsuario.EQUIPE_GERENCIAR);
        Usuario ator = acesso.usuarioAtual(autenticacao);
        TenantContextService.Contexto tenant = tenants.resolver(autenticacao, empresaSolicitada);
        Empresa empresa = empresas.findById(tenant.empresaId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Empresa não encontrada"));
        return new AcessoEquipe(ator, empresa);
    }

    private Usuario alvoDaMesmaEmpresa(AcessoEquipe contexto, Long id) {
        Usuario alvo = usuarios.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Colaborador não encontrado"));

        if (alvo.getPerfil() != PerfilUsuario.USUARIO
                || alvo.getEmpresa() == null
                || !Objects.equals(alvo.getEmpresa().getId(), contexto.empresa().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Colaborador não pertence à empresa");
        }

        if (contexto.ator().getPerfil() == PerfilUsuario.USUARIO) {
            if (Objects.equals(contexto.ator().getId(), alvo.getId())) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Altere seu próprio acesso somente pela sua conta"
                );
            }
            if (alvo.getPermissoes().contains(PermissaoUsuario.EQUIPE_GERENCIAR)) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Somente o administrador pode alterar outro gestor de equipe"
                );
            }
        }

        return alvo;
    }

    private void validarPermissoesDelegadas(Usuario ator, Set<PermissaoUsuario> permissoes) {
        if (ator.getPerfil() == PerfilUsuario.USUARIO
                && permissoes != null
                && permissoes.contains(PermissaoUsuario.EQUIPE_GERENCIAR)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Somente o administrador pode delegar a gestão da equipe"
            );
        }
    }

    private String normalizarEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String textoOpcional(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return valor.trim();
    }

    private LinkedHashSet<PermissaoUsuario> permissoes(Set<PermissaoUsuario> permissoes) {
        LinkedHashSet<PermissaoUsuario> resultado = permissoes == null
                ? new LinkedHashSet<>()
                : new LinkedHashSet<>(permissoes);

        if (resultado.contains(PermissaoUsuario.CLIENTES_GERENCIAR)) {
            resultado.add(PermissaoUsuario.CLIENTES_VISUALIZAR);
        }
        if (resultado.contains(PermissaoUsuario.EMPREENDIMENTOS_GERENCIAR)) {
            resultado.add(PermissaoUsuario.EMPREENDIMENTOS_VISUALIZAR);
        }
        if (resultado.contains(PermissaoUsuario.VENDAS_GERENCIAR)
                || resultado.contains(PermissaoUsuario.VENDAS_CRIAR)
                || resultado.contains(PermissaoUsuario.VENDAS_EDITAR)
                || resultado.contains(PermissaoUsuario.VENDAS_EXCLUIR)
                || resultado.contains(PermissaoUsuario.VENDAS_HISTORICO_VISUALIZAR)) {
            resultado.add(PermissaoUsuario.VENDAS_VISUALIZAR);
        }
        if (resultado.contains(PermissaoUsuario.RECEBIMENTOS_REGISTRAR)
                || resultado.contains(PermissaoUsuario.RECEBIMENTOS_ESTORNAR)) {
            resultado.add(PermissaoUsuario.RECEBIMENTOS_VISUALIZAR);
        }

        return resultado;
    }

    private Usuario salvar(Usuario usuario) {
        try {
            return usuarios.saveAndFlush(usuario);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Dados de usuário duplicados", e);
        } catch (OptimisticLockingFailureException e) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Funcionário alterado por outra sessão. Atualize a tela.",
                    e
            );
        }
    }

    private void registrarAuditoria(Usuario ator, Empresa empresa, Usuario alvo, String acao) {
        auditoria.save(new AuditoriaOperacional(
                empresa.getId(),
                ator.getId(),
                "USUARIO",
                alvo.getId(),
                acao
        ));
    }

    private record AcessoEquipe(Usuario ator, Empresa empresa) {
    }
}
