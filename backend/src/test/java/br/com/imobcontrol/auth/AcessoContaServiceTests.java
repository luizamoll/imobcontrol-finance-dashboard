package br.com.imobcontrol.auth;

import br.com.imobcontrol.tenant.Empresa;
import br.com.imobcontrol.tenant.EmpresaRepository;
import br.com.imobcontrol.tenant.PerfilUsuario;
import br.com.imobcontrol.tenant.Usuario;
import br.com.imobcontrol.tenant.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AcessoContaServiceTests {

    @Autowired
    private AcessoContaService acessoConta;

    @Autowired
    private AuthService authService;

    @Autowired
    private TokenAcessoRepository tokens;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private EmpresaRepository empresas;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void conviteDefineSenhaConfirmaEmailEPermiteLoginUmaUnicaVez() throws Exception {
        Usuario usuario = criarUsuarioPendente();
        String bruto = "convite-" + UUID.randomUUID();

        TokenAcesso token = novoToken(usuario, TipoTokenAcesso.CONVITE, bruto, 60);
        tokens.saveAndFlush(token);

        assertThrows(
                BadCredentialsException.class,
                () -> authService.autenticar(usuario.getEmail(), "NovaSenha123!")
        );

        acessoConta.ativarConta(bruto, "NovaSenha123!");

        Usuario ativado = usuarios.findById(usuario.getId()).orElseThrow();
        assertTrue(ativado.isSenhaDefinida());
        assertTrue(ativado.isEmailVerificado());
        authService.autenticar(ativado.getEmail(), "NovaSenha123!");

        assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> acessoConta.ativarConta(bruto, "OutraSenha123!")
        );
    }

    @Test
    void recuperacaoTrocaSenhaEConsomeToken() throws Exception {
        Usuario usuario = criarUsuarioAtivo();
        String bruto = "reset-" + UUID.randomUUID();
        tokens.saveAndFlush(novoToken(usuario, TipoTokenAcesso.RECUPERACAO_SENHA, bruto, 30));

        acessoConta.redefinirSenha(bruto, "SenhaNova456!");

        authService.autenticar(usuario.getEmail(), "SenhaNova456!");
        assertThrows(
                BadCredentialsException.class,
                () -> authService.autenticar(usuario.getEmail(), "SenhaAntiga123!")
        );
        assertTrue(
                tokens.findAllByUsuario_IdAndUsadoEmIsNull(usuario.getId()).isEmpty()
        );
    }

    @Test
    void tokenExpiradoNaoPodeSerUsado() throws Exception {
        Usuario usuario = criarUsuarioPendente();
        String bruto = "expirado-" + UUID.randomUUID();
        TokenAcesso token = novoToken(usuario, TipoTokenAcesso.CONVITE, bruto, -1);
        tokens.saveAndFlush(token);

        assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> acessoConta.ativarConta(bruto, "NovaSenha123!")
        );

        Usuario pendente = usuarios.findById(usuario.getId()).orElseThrow();
        assertFalse(pendente.isSenhaDefinida());
        assertFalse(pendente.isEmailVerificado());
    }

    private Usuario criarUsuarioPendente() {
        Usuario usuario = baseUsuario();
        usuario.setSenhaHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        usuario.setSenhaDefinida(false);
        usuario.setEmailVerificado(false);
        return usuarios.saveAndFlush(usuario);
    }

    private Usuario criarUsuarioAtivo() {
        Usuario usuario = baseUsuario();
        usuario.setSenhaHash(passwordEncoder.encode("SenhaAntiga123!"));
        usuario.setSenhaDefinida(true);
        usuario.setEmailVerificado(true);
        return usuarios.saveAndFlush(usuario);
    }

    private Usuario baseUsuario() {
        Empresa empresa = new Empresa();
        empresa.setNome("Empresa " + UUID.randomUUID());
        empresa.setSlug("empresa-" + UUID.randomUUID());
        empresa.setAtiva(true);
        empresa = empresas.saveAndFlush(empresa);

        Usuario usuario = new Usuario();
        usuario.setEmpresa(empresa);
        usuario.setNome("Usuário teste");
        usuario.setEmail("usuario-" + UUID.randomUUID() + "@teste.local");
        usuario.setPerfil(PerfilUsuario.USUARIO);
        usuario.setAtivo(true);
        return usuario;
    }

    private TokenAcesso novoToken(
            Usuario usuario,
            TipoTokenAcesso tipo,
            String bruto,
            long minutos
    ) throws Exception {
        TokenAcesso token = new TokenAcesso();
        token.setUsuario(usuario);
        token.setTipo(tipo);
        token.setTokenHash(hash(bruto));
        token.setExpiraEm(LocalDateTime.now().plusMinutes(minutos));
        return token;
    }

    private String hash(String valor) throws Exception {
        return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256")
                        .digest(valor.getBytes(StandardCharsets.UTF_8))
        );
    }
}
