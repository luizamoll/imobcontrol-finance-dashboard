ALTER TABLE empreendimentos
    ADD COLUMN socio_nome VARCHAR(160);

ALTER TABLE empreendimentos
    ADD COLUMN reajuste_contratual_json TEXT;

ALTER TABLE vendas
    ADD COLUMN valor_imovel NUMERIC(19,2);

ALTER TABLE vendas
    ADD COLUMN corretagem_valor NUMERIC(19,2);

ALTER TABLE vendas
    ADD COLUMN corretagem_compoe_valor_contrato BOOLEAN;

ALTER TABLE vendas
    ADD COLUMN corretagem_forma_pagamento VARCHAR(40);

ALTER TABLE movimentos
    ADD COLUMN socio_nome VARCHAR(160);
