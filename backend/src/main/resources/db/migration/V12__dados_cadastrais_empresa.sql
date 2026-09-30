ALTER TABLE empresas
    ADD COLUMN razao_social VARCHAR(200) NULL;

ALTER TABLE empresas
    ADD COLUMN cnpj VARCHAR(18) NULL;

ALTER TABLE empresas
    ADD COLUMN email VARCHAR(200) NULL;

ALTER TABLE empresas
    ADD COLUMN telefone VARCHAR(30) NULL;

CREATE UNIQUE INDEX uq_empresas_cnpj
    ON empresas(cnpj)
    WHERE cnpj IS NOT NULL;
