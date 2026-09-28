ALTER TABLE vendas
    ADD COLUMN repasse_comissao_pct NUMERIC(9,4) NOT NULL DEFAULT 50,
    ADD COLUMN comissao_sobre_acrescimos BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE movimentos
    ADD COLUMN comissao_base_calculo NUMERIC(19,2),
    ADD COLUMN comissao_repasse_pct_aplicado NUMERIC(9,4),
    ADD COLUMN comissao_sobre_acrescimos_aplicada BOOLEAN,
    ADD COLUMN acrescimos_recebidos NUMERIC(19,2),
    ADD COLUMN comissao_teorica NUMERIC(19,2),
    ADD COLUMN saldo_comissao_apos NUMERIC(19,2);
