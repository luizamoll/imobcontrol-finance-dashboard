# Imob Control — Hostinger (Node.js + MySQL, aplicação única)

> **Branch de homologação** `feat/hostinger-app-unificado-20261111`. A produção Java/PostgreSQL continua intacta. A API Node ainda **não** cobre todos os módulos do Java; não substituir o sistema do cliente antes da homologação.

O projeto reúne **frontend React / TanStack Start / Nitro** e **backend Node.js / Express** no **mesmo aplicativo HTTP**, usando **uma única porta**. O banco de hospedagem é **MySQL 8**.

## Arquitetura

```text
Hostinger — 1 aplicação Node.js
  Nitro .output/server/index.mjs (único servidor HTTP)
    ├── /api/*           → backend-node/src/index.js (Express → MySQL)
    ├── /health          → Express
    └── /, /login, ...   → Nitro + TanStack Start (SSR React)
```

**O Nitro carrega o Express diretamente pelas rotas `format: "node"`. Não existem dois sites Node.js, proxy externo ou `API_UPSTREAM`.**
O dump MySQL com os dados reais é entregue separadamente e não integra o repositório.

## Iniciar

Na raiz do projeto, Node.js 22 e npm:

```bash
npm install
npm run build
npm start
```

O Nitro inicia em `.output/server/index.mjs`, escuta a variável `PORT` definida pelo provedor e atende as rotas Express registradas em `vite.config.ts`. A aplicação depende das variáveis `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SESSION_SECRET` e `COOKIE_SECURE=true` (com HTTPS). Configure-as **no painel**, nunca no GitHub.

Para desenvolvimento da API isoladamente, `cd backend-node && npm install && npm start`, mas **não** criar um segundo site no deploy unificado.

## Publicação e testes

- [Guia de hospedagem único](HOSTINGER_NODE_MYSQL.md)
- [Instruções rápidas](DEPLOY.md)
- [Backend Node](backend-node/README.md)
- [Regras de negócio](docs/REGRAS_DE_NEGOCIO.md)
- [Roadmap e pendências](docs/ROADMAP.md)

Workflow GitHub Actions: `Hostinger - app unico Express + Nitro + MySQL`, verificando build SSR, JSON em `/api`, cookies/CSRF e HTML em `/login`, na mesma porta.

**Pendências:** acordos, reajustes manuais, fechamentos, administração/convites, recuperação de acesso, revisões financeiras excepcionais, dividendos e outros endpoints do legado. Rotas não migradas retornam 501. Homologar as regras e os dados antes do uso real.

Sistema desenvolvido por Maria Luiza Mol.
