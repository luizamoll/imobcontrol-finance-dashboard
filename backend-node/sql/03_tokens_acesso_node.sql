-- Execute UMA VEZ no banco MySQL homologacao antes de ativar convites/recuperacao.
-- Nao altera tabelas historicas, vendas, parcelas nem recebimentos.
CREATE TABLE IF NOT EXISTS tokens_acesso_node (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expira_em DATETIME NOT NULL,
  usado_em DATETIME NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tokens_node_hash (token_hash),
  INDEX idx_tokens_node_usuario_tipo (usuario_id, tipo, usado_em),
  CONSTRAINT fk_tokens_node_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
