ALTER TABLE usuarios
    ADD COLUMN email_verificado BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN senha_definida BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN convite_enviado_em TIMESTAMP NULL;

CREATE TABLE tokens_acesso (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expira_em TIMESTAMP NOT NULL,
    usado_em TIMESTAMP NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tokens_acesso_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_tokens_acesso_usuario_tipo
    ON tokens_acesso(usuario_id, tipo);

CREATE INDEX idx_tokens_acesso_expira
    ON tokens_acesso(expira_em);
