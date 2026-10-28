# ImobControl — guia do projeto

**Fonte de consulta rápida.** Este documento diz onde encontrar as informações; não tenta repetir cada alteração.

## Situação em 28/10/2026
- Sistema comercial em evolução e homologação com cliente real; **não confundir deploy bem-sucedido com validação funcional pelo cliente**.
- Frontend: React/TypeScript + TanStack Start; API: Java 21 + Spring Boot; PostgreSQL; publicação via Railway, branch `production`.
- Há testes automatizados no GitHub Actions (frontend e backend) e migrações de banco Flyway. A última migração revisada é a **V21**.
- Dados operacionais principais são persistidos pela API. Ainda existem configurações/compatibilidades locais; antes de qualquer alteração, verificar a fonte de verdade de cada módulo.

## Onde cada informação vive (sem duplicação)
| Arquivo | O que contém |
|---|---|
| [REGRAS_DE_NEGOCIO.md](REGRAS_DE_NEGOCIO.md) | Conceitos financeiros, regras confirmadas e pontos que exigem validação |
| [EVOLUCAO_RESUMIDA.md](EVOLUCAO_RESUMIDA.md) | Entregas por bloco, mudanças relevantes e referências aos PRs |
| [ROADMAP.md](ROADMAP.md) | Pendências reais, em ordem de prioridade |
| [ARQUITETURA.md](ARQUITETURA.md) | Frontend, backend, dados e caminhos do código |
| [PRE_LANCAMENTO_JURIDICO.md](PRE_LANCAMENTO_JURIDICO.md) | Termos, contrato, privacidade e aceite no software — **fase final** |
| [PRODUCAO_POSTGRESQL.md](PRODUCAO_POSTGRESQL.md) | Infraestrutura, segurança, banco e operação |

## Processo padrão de alteração
1. **Registrar necessidade:** problema/feedback, quem pediu, tela afetada e comportamento esperado. Usar Issue quando houver regra financeira, segurança ou funcionalidade nova.
2. **Conferir estado real:** ler o código em `production` e os registros/testes; comparar o que já existe, falta ou está falhando. Não supor que pedidos antigos continuam pendentes.
3. **Implementar em branch + PR:** preservar compatibilidade e histórico, principalmente em vendas/parcelas/recebimentos.
4. **Validar:** testes de frontend/backend, migrações e casos de negócio; depois do merge, conferir Railway e healthchecks. **CI verde não substitui teste de aceite com o cliente.**
5. **Atualizar a documentação apenas onde mudou:** regra → `REGRAS_DE_NEGOCIO`; pendência → `ROADMAP`; nova entrega importante → uma linha/bloco em `EVOLUCAO_RESUMIDA`. Não copiar cada conversa nem logs extensos.
6. **Homologar:** marcar explicitamente *implementado*, *publicado*, *testado tecnicamente*, *validado pelo cliente* ou *pendente*. São estados diferentes.

## Decisões de manutenção
- Registros financeiros históricos não devem ser reprocessados silenciosamente.
- Em novos recursos, diferenciar *valor atribuído/reservado* de *valor efetivamente pago*.
- Preferir persistência compartilhada no backend para cadastros utilizados por equipes, com isolamento por empresa e autorização.
- Nenhuma credencial, CPF real, dump do banco ou dado de cliente nos documentos do GitHub.
- Incidentes: registrar causa, correção, teste e eventual impacto; não colar centenas de linhas de log.
- Para mudanças puramente visuais, atualizar somente o bloco de entrega significativo; não criar dezenas de arquivos de documentação.

## Simplificação final da documentação
Quando o produto estabilizar, consolidar os registros históricos em **versões/releases**, arquivar documentos ultrapassados, remover duplicações e gerar um manual curto do usuário. **Não apagar auditorias, migrations ou histórico Git:** simplificar a explicação é diferente de excluir rastreabilidade.

> Dúvidas sobre comportamento: consultar primeiro código e testes da branch `production`. Os documentos orientam, mas podem ficar defasados.
