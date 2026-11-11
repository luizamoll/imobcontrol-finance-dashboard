# API Imob Control — Express + MySQL

Esta API é **registrada dentro do servidor Nitro** por `../vite.config.ts`, nas rotas `/api/**`, `/health` e `/actuator/health`, com `format: "node"`. O processo iniciado pela Hostinger é `.output/server/index.mjs`. Em hospedagem, **não é necessária uma aplicação separada**, subdomínio ou `API_UPSTREAM`. A pasta `backend-node` continua organizada em módulos para manutenção, mas participa do mesmo processo Node.js que serve o React/Nitro.

## Publicação na Hostinger

Na raiz do repositório: `npm install` → `npm run build` → `npm start`. Entrada: `.output/server/index.mjs` (ou `server/index.mjs` relativa à saída `.output`).

O servidor recebe `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SESSION_SECRET` e `COOKIE_SECURE=true` pelo hPanel. Banco: **MySQL 8**. Dump privado entregue à parte; não adicionar à branch.

## API já portada

Sessão e autenticação BCrypt, proteção CSRF, clientes, catálogo, criação e edição controlada de vendas, leitura financeira, recebimentos retroativos, estornos, cálculo monetário com `decimal.js` e configurações básicas de empresa. Testes em `test/` com MySQL 8 descartável.

## Em desenvolvimento

Revisões financeiras especiais, acordos, reajustes manuais, fechamento mensal, administração de usuários/convites, recuperação de acesso, dividendos e demais rotas Java não migradas. Essas operações retornam HTTP 501. Não usar com clientes sem completar e homologar.

Para desenvolvimento isolado da API:

```bash
cd backend-node
npm install
npm test
npm run check
npm start
```

Para deploy real, usar somente **a aplicação raiz**. Veja [o guia unificado](../HOSTINGER_NODE_MYSQL.md).
