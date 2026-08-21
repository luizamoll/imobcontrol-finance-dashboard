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

## Estrutura atual

```text
src/
├── components/   # componentes de interface
├── hooks/        # hooks reutilizáveis
├── lib/          # estado, regras de domínio e utilitários
├── routes/       # páginas e rotas da aplicação
├── router.tsx
└── server.ts
```

As entidades centrais incluem empreendimentos, unidades, vendas, parcelas, movimentos financeiros e configurações.

## Estado do projeto

O ImobControl está em desenvolvimento. A interface e parte importante das regras de negócio já estão implementadas.

No momento, os dados da aplicação são mantidos no estado local do projeto e usam dados de demonstração. A próxima etapa técnica é evoluir a aplicação para uma arquitetura com persistência em banco de dados e uma camada back-end própria.

### Próximas etapas

- persistência em banco de dados;
- autenticação e perfis de acesso;
- API para operações financeiras;
- validação das regras de negócio no back-end;
- testes automatizados;
- auditoria de alterações financeiras;
- preparação para deploy de produção.

## Executando localmente

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

## Arquitetura

A visão de domínio e o fluxo financeiro estão documentados em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Objetivo técnico

Além de resolver um problema de negócio, este projeto é usado para praticar modelagem de domínio, regras financeiras, organização de aplicações web e a evolução gradual de uma interface funcional para uma arquitetura back-end mais robusta.

---

**Maria Luiza Mol**  
Análise e Desenvolvimento de Sistemas · foco em Back-end Java
