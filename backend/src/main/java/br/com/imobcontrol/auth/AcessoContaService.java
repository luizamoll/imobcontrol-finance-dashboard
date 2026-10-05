package br.com.imobcontrol.auth;

import br.com.imobcontrol.cliente.AuditoriaOperacional;
import br.com.imobcontrol.cliente.AuditoriaOperacionalRepository;
import br.com.imobcontrol.tenant.Usuario;
import br.com.imobcontrol.tenant.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

@Service
public class AcessoContaService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UsuarioRepository usuarios;
    private final TokenAcessoRepository tokens;
    private final PasswordEncoder passwordEncoder;
    private final EmailTransacionalService emails;
    private final SessaoUsuarioService sessoes;
    private final AuditoriaOperacionalRepository auditoria;
    private final String appUrl;

    public AcessoContaService(
            UsuarioRepository usuarios,
            TokenAcessoRepository tokens,
            PasswordEncoder passwordEncoder,
            EmailTransacionalService emails,
            SessaoUsuarioService sessoes,
            AuditoriaOperacionalRepository auditoria,
            @Value("${imobcontrol.app-url:http://localhost:3000}") String appUrl
    ) {
        this.usuarios = usuarios;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
        this.emails = emails;
        this.sessoes = sessoes;
        this.auditoria = auditoria;
        this.appUrl = appUrl == null ? "" : appUrl.replaceAll("/+$", "");
    }

    public boolean envioEmailDisponivel() {
        return emails.disponivel();
    }

    @Transactional
    public boolean enviarConvite(Usuario usuario) {
        if (usuario == null || !usuario.isAtivo() || !emails.disponivel()) {
            return false;
        }

        String token = emitirToken(usuario, TipoTokenAcesso.CONVITE, LocalDateTime.now().plusHours(48));
        String link = appUrl + "/ativar-conta?token=" + url(token);
        String empresa = usuario.getEmpresa() == null ? "ImobControl" : usuario.getEmpresa().getNome();

        boolean enviado = emails.enviar(
                usuario.getEmail(),
                "Convite para acessar o ImobControl",
                """
                Olá, %s.

                Você recebeu acesso ao ImobControl no ambiente %s.

                Para confirmar seu e-mail e criar sua senha, use o link abaixo:
                %s

                Este convite é de uso único e expira em 48 horas.

                Se você não esperava este convite, ignore esta mensagem.
                """.formatted(usuario.getNome(), empresa, link)
        );

        if (enviado) {
            usuario.setConviteEnviadoEm(LocalDateTime.now());
            usuarios.saveAndFlush(usuario);
        } else {
            invalidarTokenBruto(token, TipoTokenAcesso.CONVITE);
        }

        return enviado;
    }

    @Transactional
    public boolean enviarVerificacaoEmail(Usuario usuario) {
        if (usuario == null || !usuario.isAtivo() || !emails.disponivel()) {
            return false;
        }

        String codigo = emitirCodigoVerificacao(
                usuario,
                LocalDateTime.now().plusMinutes(15)
        );

        boolean enviado = emails.enviar(
                usuario.getEmail(),
                "Código de verificação do ImobControl",
                """
                Olá, %s.

                Seu código de verificação do ImobControl é:

                %s

                Digite este código na tela Minha conta.
                Ele é de uso único e expira em 15 minutos.

                Se você não solicitou esta alteração, não compartilhe o código com ninguém.
                """.formatted(usuario.getNome(), codigo)
        );

        if (!enviado) {
            invalidarCodigoVerificacao(usuario.getId(), codigo);
        }
        return enviado;
    }

    @Transactional
    public void solicitarRecuperacao(String email) {
        String normalizado = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        if (normalizado.isBlank() || !emails.disponivel()) {
            return;
        }

        usuarios.findByEmailIgnoreCase(normalizado)
                .filter(Usuario::isAtivo)
                .filter(this::empresaAtiva)
                .ifPresent(usuario -> {
                    String token = emitirToken(
                            usuario,
                            TipoTokenAcesso.RECUPERACAO_SENHA,
                            LocalDateTime.now().plusMinutes(30)
                    );
                    String link = appUrl + "/redefinir-senha?token=" + url(token);

                    boolean enviado = emails.enviar(
                            usuario.getEmail(),
                            "Recuperação de senha do ImobControl",
                            """
                            Olá, %s.

                            Recebemos uma solicitação para redefinir sua senha do ImobControl.

                            Use o link abaixo:
                            %s

                            O link é de uso único e expira em 30 minutos.

                            Se você não solicitou a recuperação, ignore esta mensagem.
                            """.formatted(usuario.getNome(), link)
                    );

                    if (!enviado) {
                        invalidarTokenBruto(token, TipoTokenAcesso.RECUPERACAO_SENHA);
                    }
                });
    }

    @Transactional
    public void ativarConta(String tokenBruto, String novaSenha) {
        validarSenha(novaSenha);
        TokenAcesso token = tokenValido(tokenBruto, TipoTokenAcesso.CONVITE);
        Usuario usuario = token.getUsuario();

        usuario.setSenhaHash(passwordEncoder.encode(novaSenha));
        usuario.setSenhaDefinida(true);
        usuario.setEmailVerificado(true);
        usuarios.saveAndFlush(usuario);

        consumirTodos(usuario.getId());
        sessoes.encerrarTodas(usuario.getEmail());
        registrar(usuario, "CONTA_ATIVADA");
    }

    @Transactional
    public void redefinirSenha(String tokenBruto, String novaSenha) {
        validarSenha(novaSenha);
        TokenAcesso token = tokenValido(tokenBruto, TipoTokenAcesso.RECUPERACAO_SENHA);
        Usuario usuario = token.getUsuario();

        usuario.setSenhaHash(passwordEncoder.encode(novaSenha));
        usuario.setSenhaDefinida(true);
        usuario.setEmailVerificado(true);
        usuarios.saveAndFlush(usuario);

        consumirTodos(usuario.getId());
        sessoes.encerrarTodas(usuario.getEmail());
        registrar(usuario, "SENHA_RECUPERADA");
    }

    @Transactional
    public void verificarEmail(String tokenBruto) {
        TokenAcesso token = tokenValido(tokenBruto, TipoTokenAcesso.VERIFICACAO_EMAIL);
        Usuario usuario = token.getUsuario();
        usuario.setEmailVerificado(true);
        usuarios.saveAndFlush(usuario);

        consumir(token);
        registrar(usuario, "EMAIL_VERIFICADO");
    }

    @Transactional
    public void verificarEmailCodigo(Long usuarioId, String codigo) {
        if (usuarioId == null || codigo == null || !codigo.trim().matches("\\d{6}")) {
            throw codigoInvalido();
        }

        TokenAcesso token = tokens.findByTokenHashAndTipo(
                        hashCodigo(usuarioId, codigo.trim()),
                        TipoTokenAcesso.VERIFICACAO_EMAIL
                )
                .orElseThrow(this::codigoInvalido);

        if (token.getUsadoEm() != null || token.getExpiraEm().isBefore(LocalDateTime.now())) {
            throw codigoInvalido();
        }

        Usuario usuario = token.getUsuario();
        if (usuario == null
                || !usuario.getId().equals(usuarioId)
                || !usuario.isAtivo()
                || !empresaAtiva(usuario)) {
            throw codigoInvalido();
        }

        usuario.setEmailVerificado(true);
        usuarios.saveAndFlush(usuario);

        consumir(token);
        invalidarAbertos(usuario.getId(), TipoTokenAcesso.VERIFICACAO_EMAIL);
        registrar(usuario, "EMAIL_VERIFICADO");
    }

    @Transactional
    public void invalidarTokensDoUsuario(Long usuarioId) {
        consumirTodos(usuarioId);
    }

    public void encerrarSessoes(String email) {
        sessoes.encerrarTodas(email);
    }

    private String emitirCodigoVerificacao(
            Usuario usuario,
            LocalDateTime expiraEm
    ) {
        invalidarAbertos(usuario.getId(), TipoTokenAcesso.VERIFICACAO_EMAIL);

        for (int tentativa = 0; tentativa < 10; tentativa++) {
            String codigo = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
            String tokenHash = hashCodigo(usuario.getId(), codigo);
            if (tokens.findByTokenHashAndTipo(tokenHash, TipoTokenAcesso.VERIFICACAO_EMAIL).isPresent()) {
                continue;
            }

            TokenAcesso token = new TokenAcesso();
            token.setUsuario(usuario);
            token.setTipo(TipoTokenAcesso.VERIFICACAO_EMAIL);
            token.setTokenHash(tokenHash);
            token.setExpiraEm(expiraEm);
            tokens.saveAndFlush(token);
            return codigo;
        }

        throw new IllegalStateException("Não foi possível gerar um código de verificação");
    }

    private String emitirToken(
            Usuario usuario,
            TipoTokenAcesso tipo,
            LocalDateTime expiraEm
    ) {
        invalidarAbertos(usuario.getId(), tipo);

        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String bruto = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        TokenAcesso token = new TokenAcesso();
        token.setUsuario(usuario);
        token.setTipo(tipo);
        token.setTokenHash(hash(bruto));
        token.setExpiraEm(expiraEm);
        tokens.saveAndFlush(token);
        return bruto;
    }

    private TokenAcesso tokenValido(String tokenBruto, TipoTokenAcesso tipo) {
        if (tokenBruto == null || tokenBruto.isBlank()) {
            throw tokenInvalido();
        }

        TokenAcesso token = tokens.findByTokenHashAndTipo(hash(tokenBruto.trim()), tipo)
                .orElseThrow(this::tokenInvalido);

        if (token.getUsadoEm() != null || token.getExpiraEm().isBefore(LocalDateTime.now())) {
            throw tokenInvalido();
        }

        Usuario usuario = token.getUsuario();
        if (usuario == null || !usuario.isAtivo() || !empresaAtiva(usuario)) {
            throw tokenInvalido();
        }

        return token;
    }

    private boolean empresaAtiva(Usuario usuario) {
        return usuario.getEmpresa() == null || usuario.getEmpresa().isAtiva();
    }

    private void invalidarAbertos(Long usuarioId, TipoTokenAcesso tipo) {
        List<TokenAcesso> abertos =
                tokens.findAllByUsuario_IdAndTipoAndUsadoEmIsNull(usuarioId, tipo);
        LocalDateTime agora = LocalDateTime.now();
        abertos.forEach(token -> token.setUsadoEm(agora));
        if (!abertos.isEmpty()) tokens.saveAll(abertos);
    }

    private void consumirTodos(Long usuarioId) {
        List<TokenAcesso> abertos = tokens.findAllByUsuario_IdAndUsadoEmIsNull(usuarioId);
        LocalDateTime agora = LocalDateTime.now();
        abertos.forEach(token -> token.setUsadoEm(agora));
        if (!abertos.isEmpty()) tokens.saveAll(abertos);
    }

    private void consumir(TokenAcesso token) {
        token.setUsadoEm(LocalDateTime.now());
        tokens.save(token);
    }

    private void invalidarTokenBruto(String tokenBruto, TipoTokenAcesso tipo) {
        tokens.findByTokenHashAndTipo(hash(tokenBruto), tipo).ifPresent(this::consumir);
    }

    private void invalidarCodigoVerificacao(Long usuarioId, String codigo) {
        tokens.findByTokenHashAndTipo(
                hashCodigo(usuarioId, codigo),
                TipoTokenAcesso.VERIFICACAO_EMAIL
        ).ifPresent(this::consumir);
    }

    private String hashCodigo(Long usuarioId, String codigo) {
        return hash(usuarioId + ":" + codigo);
    }

    private void validarSenha(String senha) {
        if (senha == null || senha.length() < 8 || senha.length() > 72) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A senha deve ter entre 8 e 72 caracteres"
            );
        }
    }

    private ResponseStatusException tokenInvalido() {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Este link é inválido, já foi usado ou expirou"
        );
    }

    private ResponseStatusException codigoInvalido() {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Código inválido, já utilizado ou expirado"
        );
    }

    private String hash(String token) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256")
                            .digest(token.getBytes(StandardCharsets.UTF_8))
            );
        } catch (Exception ex) {
            throw new IllegalStateException("Não foi possível proteger o token", ex);
        }
    }

    private String url(String token) {
        return URLEncoder.encode(token, StandardCharsets.UTF_8);
    }

    private void registrar(Usuario usuario, String acao) {
        if (usuario.getEmpresa() == null) return;
        auditoria.save(new AuditoriaOperacional(
                usuario.getEmpresa().getId(),
                usuario.getId(),
                "USUARIO",
                usuario.getId(),
                acao
        ));
    }
}
