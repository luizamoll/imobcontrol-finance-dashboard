# ImobControl — prioridades e pendências

**Revisado em 28/10/2026.** Não confundir *implementado*, *publicado* e *homologado com o cliente*. Este arquivo contém apenas trabalho pendente ou que exige verificação, não a lista histórica de commits.

## Prioridade 1 — confiabilidade financeira
- [ ] Homologar com o cliente um mês real do **Fechamento Mensal**: conciliar recebimentos, comissão, repasses, despesas, impostos, distratos e inadimplência com comprovantes.
- [ ] Validar correção anual em vendas ativas e verificar impactos por empreendimento, venda e parcelas; impedir alterações retroativas incorretas.
- [ ] Verificar recebimentos retroativos, pagamentos parciais, juros/multa e data efetiva nos relatórios.
- [ ] Conferir tratamento de acordos, distratos, cancelamentos e vendas quitadas na carteira e nos fechamentos históricos.
- [ ] Definir e testar fluxo de pagamento **de comissão externa** (a comissão fora do preço não é descontada das parcelas da venda).
- [ ] Confirmar que os lançamentos de repasses efetivamente pagos não gerem dupla contagem no disponível estimado.

## Prioridade 2 — operação e segurança
- [ ] Validar cadastro completo de comprador/corretor/sócio em usuários e navegadores distintos.
- [ ] Revisar permissões para superadmin, admin e colaborador em todas as ações críticas e relatórios.
- [ ] Validar backups, restauração e exportação de dados com o responsável técnico.
- [ ] Monitorar conflitos 409 e ações duplicadas; revisar casos remanescentes com logs e reprodução.
- [ ] Revisar inconsistências entre cadastros compartilhados e configurações legadas locais.

## Prioridade 3 — experiência e entrega
- [ ] Testar a versão responsiva do fechamento no computador/celular e sua impressão/PDF com o cliente.
- [ ] Conferir assistente de ajuda/mascote e orientar pelas telas e regras realmente existentes.
- [ ] Criar manual objetivo do usuário e vídeo/roteiro de demonstração após estabilização.
- [ ] Consolidar e simplificar a documentação por releases, mantendo rastreabilidade por PR.

## Etapa final — jurídica e comercial (adiada intencionalmente)
- [ ] Definir e revisar **contrato comercial** da fornecedora com a empresa contratante.
- [ ] Definir/revisar **Termos de Uso**, aviso de privacidade/LGPD e regras de suporte.
- [ ] **Depois** dos textos aprovados, implementar **aceite versionado no próprio software**, com registro auditável por usuário/empresa.
- [ ] Homologar primeiro acesso, recusa, nova versão e assinatura contratual à parte.

Checklist: [PRE_LANCAMENTO_JURIDICO.md](PRE_LANCAMENTO_JURIDICO.md).

## Entregas já publicadas
Consultar [EVOLUCAO_RESUMIDA.md](EVOLUCAO_RESUMIDA.md). Não duplicar aqui o histórico completo.
