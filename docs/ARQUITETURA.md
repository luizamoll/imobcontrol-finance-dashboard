# Arquitetura do ImobControl

## Visão atual

A aplicação está organizada como um front-end em TypeScript com TanStack Start. As páginas vivem em `src/routes`, os componentes reutilizáveis em `src/components` e as regras de estado e domínio estão concentradas principalmente em `src/lib/store.tsx`.

Atualmente, o projeto usa dados de demonstração e estado local para validar fluxo, interface e regras de negócio antes da implementação de persistência definitiva.

## Domínio principal

### Empreendimento

Representa cada operação imobiliária e concentra informações como SPE, CNPJ, tipo, área, quantidade de unidades, valor total e percentuais financeiros.

### Unidade

Representa lote, apartamento, sala, casa ou outra unidade comercializável. Cada unidade pode estar disponível, reservada, vendida ou cancelada.

### Venda

Liga empreendimento, unidade e comprador. Também registra valor, contrato, corretor e composição do pagamento.

### Parcela

Representa cada obrigação financeira gerada por uma venda, com vencimento, valor, pagamento e status.

### Movimento financeiro

Registra o resultado de um recebimento, separando imposto, comissão, valor da empresa e valor do sócio.

### Configurações

Centralizam percentuais e regras ajustáveis, incluindo corretagem, tributação, correção, juros, mora e tolerância.

## Fluxo financeiro

De forma simplificada:

```text
Venda
  ↓
Composição do pagamento
  ↓
Parcelas
  ↓
Recebimento
  ↓
Imposto reservado
  ↓
Comissão aplicável
  ↓
Distribuição do saldo
  ├── Empresa
  └── Sócio
```

## Evolução planejada

A próxima arquitetura deve mover regras críticas de negócio para o back-end e substituir o estado local por persistência real.

Direção prevista:

```text
Interface web
    ↓
API / camada de aplicação
    ↓
Serviços de domínio
    ↓
Persistência
    ↓
Banco de dados
```

Também estão previstas autenticação, autorização por perfil, testes automatizados e trilha de auditoria para alterações financeiras.

## Princípio do projeto

A interface pode facilitar a operação, mas cálculos financeiros e validações críticas não devem depender exclusivamente do cliente. A evolução do projeto deve priorizar consistência dos dados, rastreabilidade e regras de domínio testáveis.
