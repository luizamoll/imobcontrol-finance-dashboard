# Arquitetura do ImobControl

## Visão atual

O ImobControl está em uma fase de transição entre uma aplicação web com regras concentradas no cliente e uma arquitetura full-stack com back-end próprio.

A interface atual é construída em TypeScript com TanStack Start. As páginas vivem em `src/routes`, os componentes reutilizáveis em `src/components` e boa parte do estado e das regras de demonstração ainda está concentrada em `src/lib/store.tsx`.

O back-end já possui uma estrutura inicial em `backend/`, construída com Java 21 e Spring Boot. Neste momento, ele contém a aplicação Spring, um endpoint básico, health check com Actuator, teste de contexto e validação automática pelo GitHub Actions.

Os dados de negócio da interface continuam sendo fictícios e mantidos localmente enquanto os módulos do domínio são migrados para a API.

## Componentes atuais

```text
Interface web
React + TypeScript + TanStack
        │
        │ migração gradual
        ▼
API Java + Spring Boot
estrutura inicial já criada
        │
        │ próximas etapas
        ▼
Serviços de domínio
        │
        ▼
Persistência
        │
        ▼
PostgreSQL
```

A existência da API não significa que todas as regras já foram migradas. A evolução é intencionalmente incremental para que cada módulo possa ser compreendido, validado e testado antes do próximo.

## Domínio principal

### Empreendimento

Representa cada operação imobiliária e concentra informações como SPE, CNPJ, tipo, área, quantidade de unidades, valor total e percentuais financeiros.

Será o primeiro agregado a ser modelado no back-end, servindo como base para o primeiro CRUD da API.

### Unidade

Representa lote, apartamento, sala, casa ou outra unidade comercializável. Cada unidade pode estar disponível, reservada, vendida ou cancelada e pertence a um empreendimento.

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

Esse fluxo ainda é representado principalmente pelas regras existentes na aplicação web. A meta é mover gradualmente os cálculos críticos para serviços de domínio no back-end.

## Estrutura do back-end

A estrutura inicial está organizada em:

```text
backend/
├── pom.xml
└── src/
    ├── main/
    │   ├── java/br/com/imobcontrol/
    │   │   ├── ImobControlApplication.java
    │   │   └── api/
    │   └── resources/
    │       └── application.yml
    └── test/
```

A organização deve evoluir conforme surgirem módulos reais. A intenção é evitar uma arquitetura excessivamente complexa antes de haver necessidade concreta.

Uma direção provável para os próximos módulos é:

```text
api/            # controllers e contratos HTTP
application/    # casos de uso e coordenação
 domain/         # entidades e regras de negócio
infrastructure/ # persistência e integrações
```

Essa divisão é uma direção de evolução, não uma estrutura declarada como concluída.

## Persistência

A persistência definitiva ainda não foi implementada.

A próxima etapa prevê PostgreSQL, Spring Data JPA e migrações versionadas de banco. A modelagem deverá priorizar consistência entre empreendimentos, unidades, vendas, parcelas e recebimentos.

## Testes e automação

O back-end já possui um teste de carregamento do contexto Spring e um workflow de CI que executa os testes Maven no GitHub Actions.

Conforme as regras financeiras forem migradas, os testes devem se concentrar especialmente em:

- cálculo de imposto;
- comissão de corretagem;
- distribuição entre empresa e sócio;
- vencimento e situação de parcelas;
- cenários de recebimento parcial ou fora do prazo;
- validações de consistência entre venda, parcela e recebimento.

## Segurança e auditoria

Autenticação e autorização ainda não foram implementadas.

Antes de um cenário de produção, o projeto deverá incluir perfis de acesso, validação no servidor e trilha de auditoria para alterações financeiras relevantes.

## Princípios técnicos

A evolução do ImobControl segue alguns princípios:

1. cálculos financeiros e validações críticas não devem depender exclusivamente do cliente;
2. cada etapa deve permanecer compreensível e testável;
3. documentação deve distinguir claramente o que já existe do que está planejado;
4. regras financeiras devem priorizar consistência e rastreabilidade;
5. novas camadas devem ser adicionadas quando houver necessidade real, evitando complexidade artificial para fins de portfólio.

O acompanhamento das próximas etapas está em [`ROADMAP.md`](ROADMAP.md).
