package br.com.imobcontrol.auth;

import br.com.imobcontrol.tenant.Empresa;
import br.com.imobcontrol.tenant.Usuario;
import br.com.imobcontrol.tenant.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UsuarioRepository usuarioRepository;
    private final SecurityContextRepository securityContextRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(
            AuthService authService,
            UsuarioRepository usuarioRepository,
            SecurityContextRepository securityContextRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.authService = authService;
        this.usuarioRepository = usuarioRepository;
        this.securityContextRepository = securityContextRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public AuthResponse login(
            @Valid @RequestBody LoginRequest body,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        try {
            AuthService.LoginResult result = authService.autenticar(body.email(), body.senha());

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(result.authentication());
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, request, response);

            return AuthResponse.from(result.usuario());
        } catch (AuthenticationException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos");
        }
    }

    @GetMapping("/me")
    public AuthResponse me(Authentication authentication) {
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        return AuthResponse.from(usuario);
    }

    @PutMapping("/minha-conta")
    public AuthResponse atualizarMinhaConta(
            Authentication authentication,
            @Valid @RequestBody MinhaContaRequest body,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        if (!passwordEncoder.matches(body.senhaAtual(), usuario.getSenhaHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Senha atual incorreta");
        }

        String novoEmail = body.email().trim().toLowerCase();
        if (!novoEmail.equalsIgnoreCase(usuario.getEmail())
                && usuarioRepository.existsByEmailIgnoreCase(novoEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já cadastrado");
        }

        if (body.novaSenha() != null && !body.novaSenha().isBlank() && body.novaSenha().length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A nova senha deve ter pelo menos 8 caracteres");
        }

        usuario.setEmail(novoEmail);
        if (body.novaSenha() != null && !body.novaSenha().isBlank()) {
            usuario.setSenhaHash(passwordEncoder.encode(body.novaSenha()));
        }
        Usuario salvo = usuarioRepository.saveAndFlush(usuario);

        Authentication novaAutenticacao = UsernamePasswordAuthenticationToken.authenticated(
                salvo.getEmail(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + salvo.getPerfil().name()))
        );
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(novaAutenticacao);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);

        return AuthResponse.from(salvo);
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of(
                "headerName", token.getHeaderName(),
                "parameterName", token.getParameterName(),
                "token", token.getToken()
        );
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request) {
        SecurityContextHolder.clearContext();
        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
        }
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String senha
    ) {
    }

    public record MinhaContaRequest(
            @NotBlank @Email String email,
            @NotBlank String senhaAtual,
            String novaSenha
    ) {
    }

    public record AuthResponse(
            Long id,
            String nome,
            String email,
            String perfil,
            EmpresaResumo empresa
    ) {
        static AuthResponse from(Usuario usuario) {
            Empresa empresa = usuario.getEmpresa();
            EmpresaResumo empresaResumo = empresa == null
                    ? null
                    : new EmpresaResumo(empresa.getId(), empresa.getNome(), empresa.getSlug());

            return new AuthResponse(
                    usuario.getId(),
                    usuario.getNome(),
                    usuario.getEmail(),
                    usuario.getPerfil().name(),
                    empresaResumo
            );
        }
    }

    public record EmpresaResumo(Long id, String nome, String slug) {
    }
}
