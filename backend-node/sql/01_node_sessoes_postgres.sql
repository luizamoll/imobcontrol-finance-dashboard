-- Nova tabela de sessoes Node; nao modifica os dados existentes.
-- Rodar uma vez no PostgreSQL apos validar a estrutura original.
CREATE TABLE IF NOT EXISTS node_sessoes (
  token_hash CHAR(64) PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_em TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_node_sessoes_expira ON node_sessoes(expira_em);
CREATE INDEX IF NOT EXISTS idx_node_sessoes_usuario ON node_sessoes(usuario_id);
