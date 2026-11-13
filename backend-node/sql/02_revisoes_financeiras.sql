-- Compatibilidade entre a exportacao PostgreSQL V21 (03/11) e o codigo atual V22.
-- Executar UMA VEZ no MySQL de homologacao, apos importar o dump real.
-- Os dados das vendas existentes NAO sao modificados.
CREATE TABLE IF NOT EXISTS revisoes_financeiras_vendas (
  id BIGINT NOT NULL AUTO_INCREMENT,
  empresa_id BIGINT NOT NULL,
  venda_id BIGINT NOT NULL,
  usuario_id BIGINT NOT NULL,
  justificativa VARCHAR(1000) NOT NULL,
  versao_anterior BIGINT NOT NULL,
  versao_nova BIGINT NOT NULL,
  resumo_anterior TEXT NOT NULL,
  resumo_novo TEXT NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_revisoes_financeiras_vendas (empresa_id, venda_id, id),
  CONSTRAINT fk_revisoes_financeiras_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  CONSTRAINT fk_revisoes_financeiras_venda FOREIGN KEY (venda_id) REFERENCES vendas(id),
  CONSTRAINT fk_revisoes_financeiras_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
