-- Executar APENAS no MySQL de testes apos a migracao da tabela usuarios.
-- Nao importar a tabela spring_session do PostgreSQL como sessao ativa.
CREATE TABLE IF NOT EXISTS node_sessoes (
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_em DATETIME NOT NULL,
    KEY idx_node_sessoes_usuario (usuario_id),
    KEY idx_node_sessoes_expira (expira_em),
    CONSTRAINT fk_node_sessoes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
