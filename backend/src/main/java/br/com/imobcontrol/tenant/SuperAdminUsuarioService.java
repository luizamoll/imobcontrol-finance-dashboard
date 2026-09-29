package br.com.imobcontrol.tenant;

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

import java.util.Locale;
import java.util.Objects;

@Service
public class SuperAdminUsuarioService {

    private final UsuarioRepository usuarios;
    private final EmpresaRepository empresas;
    private final PasswordEncoder passwordEncoder;
    private final AuditoriaOperacionalRepository auditoria;

    public SuperAdminUsuarioService(
            UsuarioRepository usuarios,
            EmpresaRepository empresas,
            PasswordEncoder passwordEncoder,
            AuditoriaOperacionalRepository auditoria
    ) {
        this.usuarios = usuarios;
        this.empresas = empresas;
        this.passwordEncoder = passwordEncoder;
        this.auditoria = auditoria;
    }

    @Transactional(readOnly = true)
    public Page<UsuarioAdminResponse> listar(
            Long empresaId,
            PerfilUsuario perfil,
            Boolean ativo,
            String busca,
            int pagina,
            int tamanho
    ) {
        if (pagina < 0 || tamanho < 1 || tamanho > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paginação inválida");
        }

        String termo = busca == null || busca.isBlank() ? null : busca.trim();
        return usuarios.buscar(
                empresaId,
                perfil,
                ativo,
                termo,
                PageRequest.of(pagina, tamanho, Sort.by(Sort.Direction.ASC, "nome"))
        ).map(UsuarioAdminResponse::from);
    }

    @Transactional(readOnly = true)
    public UsuarioAdminSummary resumo() {
        return new UsuarioAdminSummary(
                usuarios.count(),
                usuarios.countByAtivoTrue(),
                usuarios.countByAtivoFalse(),
                usuarios.countByPerfil(PerfilUsuario.ADMIN),
                usuarios.countByPerfil(PerfilUsuario.USUARIO)
        );
    }

    @Transactional
    public UsuarioAdminResponse criar(
            Authentication autenticacao,
            UsuarioAdminCreateRequest body
    ) {
        Usuario ator = ator(autenticacao);
        validarPerfilGerenciavel(body.perfil());

        String email = normalizarEmail(body.email());
        if (usuarios.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já cadastrado");
        }

        Empresa empresa = empresaAtiva(body.empresaId());
        Usuario usuario = new Usuario();
        usuario.setNome(body.nome().trim());
        usuario.setEmail(email);
        usuario.setTelefone(textoOpcional(body.telefone()));
        usuario.setSenhaHash(passwordEncoder.encode(body.senha()));
        usuario.setPerfil(body.perfil());
        usuario.setEmpresa(empresa);
        usuario.setAtivo(true);

        Usuario salvo = salvar(usuario);
        registrarAuditoria(ator, salvo, "USUARIO_CRIADO");
        return UsuarioAdminResponse.from(salvo);
    }

    @Transactional
    public UsuarioAdminResponse atualizar(
            Authentication autenticacao,
            Long id,
            UsuarioAdminUpdateRequest body
    ) {
        Usuario ator = ator(autenticacao);
        validarPerfilGerenciavel(body.perfil());

        Usuario usuario = usuarios.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));
        validarAlvoGerenciavel(usuario);

        if (!Objects.equals(usuario.getVersao(), body.versao())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Este usuário foi alterado por outra sessão. Atualize o painel antes de salvar."
            );
        }

        String email = normalizarEmail(body.email());
        usuarios.findByEmailIgnoreCase(email)
                .filter(outro -> !outro.getId().equals(usuario.getId()))
                .ifPresent(outro -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já cadastrado");
                });

        Empresa empresa = empresaAtiva(body.empresaId());
        usuario.setNome(body.nome().trim());
        usuario.setEmail(email);
        usuario.setTelefone(textoOpcional(body.telefone()));
        usuario.setEmpresa(empresa);
        usuario.setPerfil(body.perfil());
        usuario.setAtivo(body.ativo());

        Usuario salvo = salvar(usuario);
        registrarAuditoria(ator, salvo, body.ativo() ? "USUARIO_ATUALIZADO" : "USUARIO_DESATIVADO");
        return UsuarioAdminResponse.from(salvo);
    }

    @Transactional
    public void redefinirSenha(
            Authentication autenticacao,
            Long id,
            UsuarioAdminPasswordRequest body
    ) {
        Usuario ator = ator(autenticacao);
        Usuario usuario = usuarios.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado"));
        validarAlvoGerenciavel(usuario);

        usuario.setSenhaHash(passwordEncoder.encode(body.senha()));
        Usuario salvo = salvar(usuario);
        registrarAuditoria(ator, salvo, "SENHA_REDEFINIDA");
    }

    private Usuario ator(Authentication autenticacao) {
        if (autenticacao == null || !autenticacao.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        Usuario ator = usuarios.findByEmailIgnoreCase(autenticacao.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        if (!ator.isAtivo() || ator.getPerfil() != PerfilUsuario.SUPER_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return ator;
    }

    private Empresa empresaAtiva(Long id) {
        Empresa empresa = empresas.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Empresa não encontrada"));
        if (!empresa.isAtiva()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A empresa está inativa");
        }
        return empresa;
    }

    private void validarAlvoGerenciavel(Usuario usuario) {
        if (usuario.getPerfil() == PerfilUsuario.SUPER_ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Contas SUPER_ADMIN não podem ser alteradas por este painel"
            );
        }
    }

    private void validarPerfilGerenciavel(PerfilUsuario perfil) {
        if (perfil == PerfilUsuario.SUPER_ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "O painel permite atribuir apenas ADMIN ou USUARIO"
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

    private Usuario salvar(Usuario usuario) {
        try {
            return usuarios.saveAndFlush(usuario);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Dados de usuário duplicados", e);
        } catch (OptimisticLockingFailureException e) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Usuário alterado por outra sessão. Atualize o painel.",
                    e
            );
        }
    }

    private void registrarAuditoria(Usuario ator, Usuario alvo, String acao) {
        if (alvo.getEmpresa() == null) return;
        auditoria.save(new AuditoriaOperacional(
                alvo.getEmpresa().getId(),
                ator.getId(),
                "USUARIO",
                alvo.getId(),
                acao
        ));
    }
}
