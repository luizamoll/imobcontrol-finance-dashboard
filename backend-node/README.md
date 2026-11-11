# Backend Node.js / Express / MySQL

A API roda como handler Node dentro do Nitro SSR, em uma unica aplicacao. Rotas `/api/**` sao registradas no `vite.config.ts`, com entrada `.output/server/index.mjs` para Hostinger.

## Modulos
- `index.js`: sessao, login, CSRF, autenticacao/isolamento da empresa, API.
- `clientes.js`, `catalogo*.js`, `vendas*.js`, `financeiro-read.js`, `recebimentos.js`: operacao.
- `corretores.js`, `dividendos.js`, `fechamento.js`: cadastros e fechamento.
- `acordos.js`, `reajustes.js`, `revisoes.js`: renegociacoes, atualizacoes monetarias e revisoes controladas.
- `usuarios.js`, `superadmin.js`, `acesso-conta.js`: equipe, superadmin, tokens, SMTP, recuperacao e verificacao.
- `sql/01_node_sessoes.sql`, `sql/02_revisoes_financeiras.sql`, `sql/03_tokens_acesso_node.sql`: estruturas MySQL complementares.

## Testes
```bash
cd backend-node
npm install
npm run check
npm test
```
O workflow `ImobControl Node.js (migracao)` tambem roda teste de integracao com um MySQL 8 descartavel. Nao executar os testes de integracao que criam/apagam tabelas no banco real.

**Obrigatorio antes de producao:** testar as operacoes do cliente no banco de homologacao com o dump privado, comparar calculos com o Java e validar SMTP. Consulte [o guia](../HOSTINGER_NODE_MYSQL.md).
