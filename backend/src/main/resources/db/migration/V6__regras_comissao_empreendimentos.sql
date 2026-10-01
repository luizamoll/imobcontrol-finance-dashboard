ALTER TABLE empreendimentos
    ADD COLUMN repasse_comissao_pct NUMERIC(9,4) NOT NULL DEFAULT 50;

ALTER TABLE empreendimentos
    ADD COLUMN comissao_sobre_acrescimos BOOLEAN NOT NULL DEFAULT FALSE;
