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
public class EmpresaUsuarioService {

    private final UsuarioRepository usuarios;
    private final PasswordEncoder passwordEncoder;
    private final AuditoriaOperacionalRepository auditoria;

    public EmpresaUsuarioService(
            UsuarioRepository usuarios,
            PasswordEncoder passwordEncoder,
            AuditoriaOperacionalRepository auditoria
    ) {
        this.usuarios = usuarios;
        this.passwordEncoder = passwordEncoder;
        this.auditoria = auditoria;
    }

    @Transactional(readOnly = true)
    public Page<UsuarioAdminResponse> listar(
            Authentication autenticacao,
            Boolean ativo,
            String busca,
            int pagina,
            int tamanho
    ) {
        Usuario admin = admin(autenticacao);
        if (pagina < 0 || tamanho < 1 || tamanho > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paginação inválida");
        }

        String termo = busca == null || busca.isBlank() ? null : busca.trim();
        return usuarios.buscar(
                admin.getEmpresa().getId(),
                PerfilUsuario.USUARIO,
                ativo,
                termo,
                PageRequest.of(pagina, tamanho, Sort.by(Sort.Direction.ASC, "nome"))
        ).map(UsuarioAdminResponse::from);
    }

    @Transactional
    public UsuarioAdminResponse criar(
            Authentication autenticacao,
            EmpresaUsuarioCreateRequest body
    ) {
        Usuario admin = admin(autenticacao);
        String email = normalizarEmail(body.email());
        if (usuarios.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já cadastrado");
        }

        Usuario usuario = new Usuario();
        usuario.setNome(body.nome().trim());
        usuario.setEmail(email);
        usuario.setSenhaHash(passwordEncoder.encode(body.senha()));
        usuario.setPerfil(PerfilUsuario.USUARIO);
        usuario.setEmpresa(admin.getEmpresa());
        usuario.setAtivo(true);

        Usuario salvo = salvar(usuario);
        registrarAuditoria(admin, salvo, "FUNCIONARIO_CRIADO");
        return UsuarioAdminResponse.from(salvo);
    }

    @Transactional
    public UsuarioAdminResponse atualizar(
            Authentication autenticacao,
            Long id,
            EmpresaUsuarioUpdateRequest body
    ) {
        Usuario admin = admin(autenticacao);
        Usuario usuario = alvoDaMesmaEmpresa(admin, id);

        if (!Objects.equals(usuario.getVersao(), body.versao())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Este funcionário foi alterado por outra sessão. Atualize a tela antes de salvar."
            );
        }

        String email = normalizarEmail(body.email());
        usuarios.findByEmailIgnoreCase(email)
                .filter(outro -> !outro.getId().equals(usuario.getId()))
                .ifPresent(outro -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já cadastrado");
                });

        usuario.setNome(body.nome().trim());
        usuario.setEmail(email);
        usuario.setAtivo(body.ativo());

        Usuario salvo = salvar(usuario);
        registrarAuditoria(
                admin,
                salvo,
                body.ativo() ? "FUNCIONARIO_ATUALIZADO" : "FUNCIONARIO_DESATIVADO"
        );
        return UsuarioAdminResponse.from(salvo);
    }

    @Transactional
    public void redefinirSenha(
            Authentication autenticacao,
            Long id,
            UsuarioAdminPasswordRequest body
    ) {
        Usuario admin = admin(autenticacao);
        Usuario usuario = alvoDaMesmaEmpresa(admin, id);

        usuario.setSenhaHash(passwordEncoder.encode(body.senha()));
        Usuario salvo = salvar(usuario);
        registrarAuditoria(admin, salvo, "SENHA_FUNCIONARIO_REDEFINIDA");
    }

    private Usuario admin(Authentication autenticacao) {
        if (autenticacao == null || !autenticacao.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        Usuario admin = usuarios.findByEmailIgnoreCase(autenticacao.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        if (!admin.isAtivo()
                || admin.getPerfil() != PerfilUsuario.ADMIN
                || admin.getEmpresa() == null
                || !admin.getEmpresa().isAtiva()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return admin;
    }

    private Usuario alvoDaMesmaEmpresa(Usuario admin, Long id) {
        Usuario alvo = usuarios.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Funcionário não encontrado"));

        if (alvo.getPerfil() != PerfilUsuario.USUARIO
                || alvo.getEmpresa() == null
                || !Objects.equals(alvo.getEmpresa().getId(), admin.getEmpresa().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Funcionário não pertence à sua empresa");
        }
        return alvo;
    }

    private String normalizarEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
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

    private void registrarAuditoria(Usuario admin, Usuario alvo, String acao) {
        auditoria.save(new AuditoriaOperacional(
                admin.getEmpresa().getId(),
                admin.getId(),
                "USUARIO",
                alvo.getId(),
                acao
        ));
    }
}
