ALTER TABLE quadras
    ADD COLUMN tipo_agrupamento VARCHAR(30) NOT NULL DEFAULT 'quadra';

CREATE INDEX idx_quadras_empresa_emp_tipo
    ON quadras(empresa_id, empreendimento_id, tipo_agrupamento);
