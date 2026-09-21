package br.com.imobcontrol.auth;

import br.com.imobcontrol.tenant.Usuario;
import br.com.imobcontrol.tenant.UsuarioRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public LoginResult autenticar(String email, String senha) {
        String emailNormalizado = email == null ? "" : email.trim().toLowerCase();

        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(emailNormalizado)
                .orElseThrow(() -> new BadCredentialsException("Credenciais inválidas"));

        if (!usuario.isAtivo()) {
            throw new DisabledException("Usuário inativo");
        }

        if (!passwordEncoder.matches(senha, usuario.getSenhaHash())) {
            throw new BadCredentialsException("Credenciais inválidas");
        }

        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
                usuario.getEmail(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + usuario.getPerfil().name()))
        );

        return new LoginResult(usuario, authentication);
    }

    public record LoginResult(Usuario usuario, Authentication authentication) {
    }
}
