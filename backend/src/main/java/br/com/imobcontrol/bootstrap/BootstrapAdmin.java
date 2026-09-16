package br.com.imobcontrol.bootstrap;

import br.com.imobcontrol.tenant.PerfilUsuario;
import br.com.imobcontrol.tenant.Usuario;
import br.com.imobcontrol.tenant.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class BootstrapAdmin implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapAdmin.class);

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final String nome;
    private final String email;
    private final String senha;

    public BootstrapAdmin(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder,
            @Value("${imobcontrol.bootstrap-admin.name:}") String nome,
            @Value("${imobcontrol.bootstrap-admin.email:}") String email,
            @Value("${imobcontrol.bootstrap-admin.password:}") String senha
    ) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.nome = nome;
        this.email = email;
        this.senha = senha;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (email.isBlank() || senha.isBlank()) {
            log.info("Super admin inicial não configurado; defina IMOB_ADMIN_EMAIL e IMOB_ADMIN_PASSWORD quando quiser criá-lo.");
            return;
        }

        if (senha.length() < 8) {
            log.warn("Super admin não criado: IMOB_ADMIN_PASSWORD precisa ter pelo menos 8 caracteres.");
            return;
        }

        String emailNormalizado = email.trim().toLowerCase();
        if (usuarioRepository.existsByEmailIgnoreCase(emailNormalizado)) {
            log.info("Super admin inicial já existe para {}.", emailNormalizado);
            return;
        }

        Usuario usuario = new Usuario();
        usuario.setNome(nome.isBlank() ? "Administrador ImobControl" : nome.trim());
        usuario.setEmail(emailNormalizado);
        usuario.setSenhaHash(passwordEncoder.encode(senha));
        usuario.setPerfil(PerfilUsuario.SUPER_ADMIN);
        usuario.setAtivo(true);
        usuario.setEmpresa(null);

        usuarioRepository.save(usuario);
        log.info("Super admin inicial criado para {}.", emailNormalizado);
    }
}
