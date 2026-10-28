# Arquitetura atual — ImobControl

> Documento atualizado em 28/10/2026. Substitui a descrição inicial de protótipo: o sistema já tem API, PostgreSQL, autenticação e operações reais. **Nem toda configuração local foi eliminada.**

## Componentes

```text
Navegador
  └─ React / TypeScript / TanStack Start (src/)
       ├─ páginas: src/routes/
       ├─ componentes: src/components/
       ├─ requisições e estado: src/lib/
       └─ compatibilidades locais (verificar por recurso)
             │
             ▼
      API Java 21 / Spring Boot (backend/)
       ├─ auth, security, tenant: autenticação/autorização por empresa
       ├─ operacao: empreendimentos e unidades
       ├─ cliente, corretor: cadastros
       ├─ financeiro: vendas, parcelas e movimentos
       ├─ dividendos: participações de terceiros
       └─ fechamento: apuração mensal, lançamentos e arquivos
             │
             ▼
      PostgreSQL + migrações Flyway
```

## Caminhos principais
- `src/routes/vendas.index.tsx`: Nova Venda; `src/routes/vendas.$id.tsx`: edição/ficha.
- `src/routes/clientes.tsx`, `src/routes/recebedores.tsx`: cadastros.
- `src/routes/relatorios.tsx`, `src/routes/fechamento-mensal.tsx`: relatórios.
- `backend/src/main/java/br/com/imobcontrol/financeiro/`: cálculos e persistência financeira.
- `backend/src/main/java/br/com/imobcontrol/fechamento/`: apuração e arquivamento mensal.
- `backend/src/main/resources/db/migration/`: evolução de estrutura de dados.

## Princípios técnicos
1. **API e banco como fonte de verdade** para dinheiro e registros compartilhados; não confiar em cálculos/client-only em operações críticas.
2. Toda operação deve respeitar a empresa e as permissões do usuário; versões e conflitos impedem sobrescritas silenciosas.
3. Movimentos e estornos precisam de rastreabilidade; fechamentos arquivados são fotografias da apuração.
4. Distinguir *destinado*, *reservado* e *efetivamente pago* em modelos, API, telas e relatórios.
5. Migrações só avançam; não editar migrations **já aplicadas** em produção. Novos ajustes em uma migration posterior.
6. Testes automatizados e verificação de deploy antes de homologação; QA financeiro com dados de teste e conciliação real em ambiente autorizado.

## Onde não duplicar explicações
Regras funcionais: [REGRAS_DE_NEGOCIO.md](REGRAS_DE_NEGOCIO.md). Infraestrutura: [PRODUCAO_POSTGRESQL.md](PRODUCAO_POSTGRESQL.md). Evolução: [EVOLUCAO_RESUMIDA.md](EVOLUCAO_RESUMIDA.md).
