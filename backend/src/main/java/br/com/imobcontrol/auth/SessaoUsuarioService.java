package br.com.imobcontrol.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class SessaoUsuarioService {

    private final JdbcTemplate jdbc;

    public SessaoUsuarioService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void encerrarTodas(String email) {
        if (email == null || email.isBlank()) return;
        jdbc.update(
                "DELETE FROM SPRING_SESSION WHERE lower(PRINCIPAL_NAME) = lower(?)",
                email.trim()
        );
    }

    public void encerrarOutras(String email, String sessionIdAtual) {
        if (email == null || email.isBlank()) return;
        if (sessionIdAtual == null || sessionIdAtual.isBlank()) {
            encerrarTodas(email);
            return;
        }
        jdbc.update(
                """
                DELETE FROM SPRING_SESSION
                WHERE lower(PRINCIPAL_NAME) = lower(?)
                  AND SESSION_ID <> ?
                """,
                email.trim(),
                sessionIdAtual
        );
    }
}
