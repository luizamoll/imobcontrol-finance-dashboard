ALTER TABLE movimentos
    ADD COLUMN estornado BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE movimentos
    ADD COLUMN estornado_em TIMESTAMP;

ALTER TABLE movimentos
    ADD COLUMN estornado_por_usuario_id BIGINT;

ALTER TABLE movimentos
    ADD CONSTRAINT fk_movimentos_estornado_por
        FOREIGN KEY (estornado_por_usuario_id) REFERENCES usuarios(id);

CREATE INDEX idx_movimentos_empresa_venda_ativo
    ON movimentos(empresa_id, venda_id, estornado);
