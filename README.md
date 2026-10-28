# ImobControl

[![Backend CI](https://github.com/luizamoll/imobcontrol-finance-dashboard/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/luizamoll/imobcontrol-finance-dashboard/actions/workflows/backend-ci.yml)

Sistema web para gestão de empreendimentos imobiliários, vendas, clientes, parcelas, recebimentos, comissões, dividendos de terceiros e fechamento mensal.

## Estado atual — outubro/2026

O ImobControl já possui **frontend React/TypeScript**, **API Java 21/Spring Boot**, **PostgreSQL**, autenticação e publicação da branch `production` no **Railway**. Módulos operacionais principais utilizam a API e o banco, com migrações Flyway (até a V21 na revisão documental de 28/10/2026).

**O sistema está em evolução e homologação contínua com cliente real.** Nem toda entrega publicada foi necessariamente validada em todos os cenários de negócio. Parte das configurações e compatibilidades pode continuar no navegador; verificar por módulo antes de alterar.

### Acessos do ambiente de produção
- [Frontend ImobControl](https://imobcontrol-web-preview-production.up.railway.app/)
- [Fechamento mensal](https://imobcontrol-web-preview-production.up.railway.app/fechamento-mensal)
- [GitHub Actions](https://github.com/luizamoll/imobcontrol-finance-dashboard/actions)

## Tecnologia
- Frontend: React 19, TypeScript, TanStack Start/Router, Vite, Tailwind CSS e Bun.
- Backend: Java 21, Spring Boot 4.1, Spring Data JPA, validações, autorização por empresa e Flyway.
- Banco: PostgreSQL; deploy: Railway; CI: GitHub Actions.

## Fluxo funcional
Empreendimentos e unidades → Clientes e corretores → Vendas → Parcelas e recebimentos → Relatórios/Fechamento Mensal.

Relatórios financeiros devem distinguir **valor previsto/atribuído** de **pagamento efetivamente realizado**. O fechamento mensal pode gerar uma prévia dinâmica e um arquivo histórico para um mês encerrado.

## Comece pela documentação
- **[Guia do projeto e rotina de manutenção](docs/GUIA_DO_PROJETO.md)** — índice central e método para evitar documentação repetitiva.
- [Regras de negócio e limitações](docs/REGRAS_DE_NEGOCIO.md)
- [Evolução resumida e PRs](docs/EVOLUCAO_RESUMIDA.md)
- [Pendências e prioridades](docs/ROADMAP.md)
- [Arquitetura](docs/ARQUITETURA.md)
- [Infraestrutura/PostgreSQL](docs/PRODUCAO_POSTGRESQL.md)
- [Etapa jurídica futura: contrato, termos e aceite](docs/PRE_LANCAMENTO_JURIDICO.md)

## Desenvolvimento
Na raiz, com Bun instalado:

```bash
bun install
bun run dev
bun run build
```

Backend:

```bash
cd backend
mvn test
mvn spring-boot:run
```

O backend depende da configuração correta de ambiente/banco. Consulte [backend/README.md](backend/README.md), [DEPLOY.md](DEPLOY.md) e os arquivos de configuração antes de executar.

## Segurança e contribuição
- Nunca versionar senhas, variáveis sigilosas, dumps ou dados pessoais reais.
- Abrir PR, passar CI e verificar o deploy/healthcheck antes de declarar publicação concluída.
- Registrar aceite do cliente **separadamente** do status de teste automatizado.
- Não reescrever histórico Git conectado ao Lovable e não modificar registros financeiros históricos sem um fluxo auditado.

**Projeto desenvolvido por Maria Luiza Mol.**
