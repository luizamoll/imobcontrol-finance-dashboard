# ImobControl

Sistema web para controle financeiro de empreendimentos imobiliários, com foco no acompanhamento de vendas, parcelas, recebimentos, impostos, comissões e distribuição de repasses.

O projeto nasceu de uma necessidade real de organizar regras financeiras que ficam difíceis de acompanhar em planilhas conforme aumentam o número de empreendimentos, unidades e pagamentos.

> **Demonstração:** nomes, CNPJs, valores, compradores, empreendimentos e demais dados exibidos no projeto são fictícios e foram criados apenas para simular cenários de uso.

## Funcionalidades atuais

- Dashboard com visão geral financeira
- Cadastro e acompanhamento de empreendimentos
- Controle de unidades e status de venda
- Registro de vendas e composição de pagamento
- Geração e acompanhamento de parcelas
- Registro de recebimentos
- Cálculo de imposto reservado
- Controle de comissão de corretagem
- Distribuição de valores entre empresa e sócio
- Acompanhamento de inadimplência
- Cadastro de recebedores
- Configurações de percentuais, juros, mora e tolerância
- Relatórios e acompanhamento financeiro

## Regras de negócio

O sistema trabalha com percentuais configuráveis por empreendimento e registra a distribuição financeira de cada recebimento.

No fluxo atual, um valor recebido pode ser separado em:

1. imposto reservado;
2. comissão aplicável;
3. saldo distribuído entre empresa e sócio conforme os percentuais do empreendimento.

Também existem configurações para correção, juros, mora, dias de tolerância e formas de pagamento.

## Tecnologias

### Interface atual

- TypeScript
- React 19
- TanStack Start
- TanStack Router
- TanStack Query
- Vite
- Tailwind CSS
- Radix UI
- React Hook Form
- Zod
- Recharts
- Bun

### Back-end em construção

- Java 21
- Spring Boot 4.1
- Spring Web
- Bean Validation
- Spring Boot Actuator
- Maven

O início da API está em [`backend/`](backend/README.md).

## Estrutura atual

```text
.
├── backend/       # API Java/Spring Boot em evolução
├── docs/          # documentação técnica
└── src/           # aplicação web atual
    ├── components/
    ├── hooks/
    ├── lib/
    └── routes/
```

As entidades centrais incluem empreendimentos, unidades, vendas, parcelas, movimentos financeiros e configurações.

## Estado do projeto

O ImobControl está em desenvolvimento. A interface e parte importante das regras de negócio já estão implementadas.

Os dados da interface ainda são mantidos no estado local com dados de demonstração. A migração para uma API própria em Java/Spring Boot foi iniciada e será feita por módulos, começando pela estrutura da aplicação e depois seguindo para persistência e regras de domínio.

### Próximas etapas

- primeiro CRUD de empreendimentos no back-end;
- persistência com PostgreSQL;
- API para vendas, parcelas e recebimentos;
- validação das regras financeiras no back-end;
- autenticação e perfis de acesso;
- testes automatizados;
- auditoria de alterações financeiras;
- integração completa da interface com a API.

## Executando a interface

Requisitos:

- Bun instalado

```bash
bun install
bun run dev
```

Para gerar a versão de produção:

```bash
bun run build
```

Para verificar o código:

```bash
bun run lint
```

## Executando o back-end

Com Java 21 e Maven instalados:

```bash
cd backend
mvn spring-boot:run
```

A documentação específica do back-end está em [`backend/README.md`](backend/README.md).

## Arquitetura

A visão de domínio e o fluxo financeiro estão documentados em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Objetivo técnico

Além de resolver um problema de negócio, este projeto é usado para praticar modelagem de domínio, regras financeiras, organização de aplicações web e evolução gradual para uma arquitetura full-stack com back-end Java.

---

**Maria Luiza Mol**  
Análise e Desenvolvimento de Sistemas · foco em Back-end Java
