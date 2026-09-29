ALTER TABLE usuarios
    ADD COLUMN telefone VARCHAR(30);

CREATE TABLE usuario_permissoes (
    usuario_id BIGINT NOT NULL,
    permissao VARCHAR(80) NOT NULL,
    PRIMARY KEY (usuario_id, permissao),
    CONSTRAINT fk_usuario_permissoes_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_usuario_permissoes_usuario_id ON usuario_permissoes(usuario_id);

-- Preserva o comportamento dos usuários operacionais já existentes.
INSERT INTO usuario_permissoes (usuario_id, permissao)
SELECT u.id, p.permissao
FROM usuarios u
CROSS JOIN (
    VALUES
        ('CLIENTES_VISUALIZAR'),
        ('CLIENTES_GERENCIAR'),
        ('EMPREENDIMENTOS_VISUALIZAR'),
        ('EMPREENDIMENTOS_GERENCIAR'),
        ('VENDAS_VISUALIZAR'),
        ('VENDAS_GERENCIAR'),
        ('RECEBIMENTOS_VISUALIZAR'),
        ('RECEBIMENTOS_REGISTRAR'),
        ('RECEBIMENTOS_ESTORNAR'),
        ('FINANCEIRO_VISUALIZAR'),
        ('RELATORIOS_VISUALIZAR'),
        ('CONFIGURACOES_GERENCIAR')
) AS p(permissao)
WHERE u.perfil = 'USUARIO';
