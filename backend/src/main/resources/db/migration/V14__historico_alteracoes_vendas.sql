ALTER TABLE auditoria_operacional
    ADD COLUMN detalhes TEXT;

-- O colaborador de homologação João Ferreira já deve receber acesso ao novo histórico.
INSERT INTO usuario_permissoes (usuario_id, permissao)
SELECT u.id, 'VENDAS_HISTORICO_VISUALIZAR'
FROM usuarios u
WHERE lower(u.email) = 'joao.ferreira@liderimoveis.com.br'
ON CONFLICT (usuario_id, permissao) DO NOTHING;
