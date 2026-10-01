-- Separa a antiga permissão ampla de vendas em ações independentes.
-- Usuários que já tinham VENDAS_GERENCIAR preservam o mesmo acesso após a migração.

INSERT INTO usuario_permissoes (usuario_id, permissao)
SELECT legado.usuario_id, novas.permissao
FROM usuario_permissoes legado
CROSS JOIN (
    VALUES
        ('VENDAS_CRIAR'),
        ('VENDAS_EDITAR'),
        ('VENDAS_EXCLUIR')
) AS novas(permissao)
WHERE legado.permissao = 'VENDAS_GERENCIAR'
  AND NOT EXISTS (
      SELECT 1
      FROM usuario_permissoes existente
      WHERE existente.usuario_id = legado.usuario_id
        AND existente.permissao = novas.permissao
  );

DELETE FROM usuario_permissoes
WHERE permissao = 'VENDAS_GERENCIAR';
