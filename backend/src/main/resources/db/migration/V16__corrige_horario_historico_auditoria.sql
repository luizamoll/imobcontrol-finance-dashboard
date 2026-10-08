-- Os registros de auditoria criados antes da correção de fuso eram gravados
-- com o horário UTC do servidor em uma coluna sem timezone.
-- A partir do id 316 a aplicação passou a persistir America/Sao_Paulo.
UPDATE auditoria_operacional
SET criado_em = criado_em - INTERVAL '3 hours'
WHERE id <= 315;
