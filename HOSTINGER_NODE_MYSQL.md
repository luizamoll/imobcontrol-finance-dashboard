# Hostinger — Imob Control em um único site Nitro + Express + MySQL

**Branch** `feat/hostinger-app-unificado-20261111` (homologação).
**Objetivo**: manter o entrypoint que a Hostinger realmente executa e corrigir o 404 em `POST /api/auth/login`.

## A implementação correta

- O Nitro é o **servidor HTTP único**, com preset `node_server`.
- O build gera `.output/server/index.mjs`, executado pela Hostinger como `server/index.mjs` relativo à pasta `.output`.
- Em `vite.config.ts`, o Nitro registra `/api/**`, `/health` e `/actuator/health` com **`format: "node"`** e handler `backend-node/src/index.js`.
- Esse handler é o Express que implementa `POST /api/auth/login`, sessões, CSRF, vendas, parcelas e recebimentos.
- As páginas `/`, `/login` e demais telas são renderizadas normalmente pelo React/TanStack Start.
- **Não** utilizar `API_UPSTREAM`, dois sites Node, um segundo processo Express, ou um proxy externo entre API e frontend.

## Configuração no hPanel

**Uma única aplicação** Node.js, repositório `luizamoll/imobcontrol-finance-dashboard`, branch `feat/hostinger-app-unificado-20261111`, diretório raiz `./`, Node 22 e npm.

- Instalação: `npm install`.
- Build: `npm run build`.
- Iniciar: `npm start` (**`node .output/server/index.mjs`**).
- Se o hPanel usar **diretório de saída** `.output` e entrada relativa **`server/index.mjs`**, **está correto**. Não precisa trocar para um entrypoint externo.
- Deploy GitHub: escolher a branch acima; só fazer deploy depois de CI verde.

### Variáveis privadas no hPanel (sem enviar senhas em mensagens)

```env
NODE_ENV=production
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=SEU_BANCO_MYSQL_COM_PREFIXO
DB_USER=SEU_USUARIO_MYSQL_COM_PREFIXO
DB_PASSWORD=SEGREDO_CONFIGURADO_NO_HM_PANEL
SESSION_SECRET=SEGREDO_LONGO_DE_PELO_MENOS_32_CARACTERES
SESSION_COOKIE_SECURE=true
```

O backend também aceita `COOKIE_SECURE=true`. Qualquer uma das duas variáveis de cookie é válida em produção, com HTTPS.

## Teste obrigatório depois do deploy

Em DevTools → Network, confira:

1. `GET /api/auth/csrf`: **200 JSON** com cookie `imob_csrf`.
2. `POST /api/auth/login` com corpo vazio e JSON: **401 JSON** (validação). **Nunca 404 HTML**. Esta é a regressão protegida no CI.
3. `GET /api/clientes` sem sessão: **401 JSON**.
4. `GET /login`: **200 HTML** da aplicação React.
5. Login com usuário válido deve devolver 200 JSON, **desde que** o banco MySQL, a senha e a tabela `node_sessoes` estejam corretos.
6. Testar operações de venda, baixa com data retroativa, bloqueio de duplicidade (409) e estorno em banco de homologação.

## Banco de dados — separado do código

Não colocar dump ou credenciais no GitHub. O arquivo real MySQL está disponível separadamente e representa dados até **03/11/2026**. Importar em banco de homologação vazio, nunca sobre dados em uso. Aplicar, somente se faltarem, `backend-node/sql/01_node_sessoes.sql` e `02_revisoes_financeiras.sql`.

## Limitação funcional

O conserto de roteamento foi seguido pela implementação Node de corretores, dividendos de terceiros e fechamento mensal com lançamentos, estornos e arquivos. Esses módulos ainda exigem validação do CI/MySQL e homologação.

**Permanecem ausentes** acordos, reajustes manuais, administração de usuários/convites, recuperação de conta, revisões excepcionais e outras rotas. Rotas não implementadas podem responder 501. Não substituir o sistema financeiro do cliente até homologar a paridade funcional e os saldos.
