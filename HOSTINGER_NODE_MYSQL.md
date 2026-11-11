# Imob Control — aplicação ÚNICA na Hostinger Business

**Branch:** `feat/hostinger-app-unificado-20261111`  
**Estado:** integração arquitetural para homologação, NÃO substitui ainda a produção.

## Como o projeto funciona

Uma instância Node.js e **uma única porta HTTP**:

```text
                  Hostinger — um Web App Node.js
https://seudominio.com
        |
        v
hosting/hostinger.mjs  (node / Express; única chamada .listen)
        |
        +-- /api/* e /health ---> Express em backend-node/src/index.js --> MySQL
        |
        +-- /login, /, /assets --> Nitro/TanStack SSR + React
                                  (.output/server/index.mjs)
```

O Express é importado como aplicação, sem abrir sua antiga porta 3000. O
Nitro é compilado com o preset `node_middleware` e recebe diretamente os
objetos de requisição e resposta do mesmo Express. **Não há segunda API,
subdomínio nem variável `API_UPSTREAM`.**

Os endpoints ainda não migrados de Java respondem 501; portanto, esta
branch **não significa que todos os módulos financeiros estão concluídos**.

## Deploy pelo hPanel

1. Acessar Hostinger → Websites → Create site → Web App.
2. Importar do GitHub o repositório `luizamoll/imobcontrol-finance-dashboard`.
3. Selecionar branch `feat/hostinger-app-unificado-20261111` e **diretório raiz `./`**.
4. Framework: escolher **Other** (ou Express customizado, se houver opção).
5. Node.js **22**, gerenciador **npm**.
6. Build: `npm run build` (produz `.output/server/index.mjs` e `.output/public`).
7. Iniciar: `npm start`; **entrada `hosting/hostinger.mjs` na raiz do projeto**.
8. **Não apontar a entrada para `.output/server/index.mjs`**: essa saída é
   middleware Nitro, não servidor independente. Não configurar um segundo site.
9. Caso o hPanel peça *Output directory*, manter o projeto completo
   disponível ao processo: `hosting/hostinger.mjs`, `backend-node/` e `.output/`
   devem estar **juntos**. Não configurar apenas `.output/` se isso
   excluir o backend e `hosting/hostinger.mjs`. Se o painel não permitir manter
   esses arquivos no deploy, é necessária uma configuração de pacote
   de saída específica antes de publicar.

**Uma única configuração de ambiente** no painel do Web App:

```env
NODE_ENV=production
COOKIE_SECURE=true
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=NOME_MYSQL_COM_PREFIXO_DA_HOSTINGER
DB_USER=USUARIO_MYSQL_COM_PREFIXO
DB_PASSWORD=SENHA_MYSQL
SESSION_SECRET=SEGREDO_ALEATORIO_COM_PELO_MENOS_32_CARACTERES
```

Deixar `PORT` controlada pela Hostinger. Não usar `DATABASE_URL`,
`PGHOST` nem `API_UPSTREAM`. Não comitar variáveis reais ao Git.

## Dados reais MySQL

O dump real **continua separado do código**, com dados até **03/11/2026**.
Se o Pedro já importou o dump em MySQL, **NÃO importar de novo**. Caso ainda
não tenha feito, importar em banco de homologação vazio pelo phpMyAdmin.
Aplicar uma única vez as tabelas auxiliares, se faltarem:

- `backend-node/sql/01_node_sessoes.sql` (sessões Node);
- `backend-node/sql/02_revisoes_financeiras.sql` (estrutura V22).

Conferir contagens e totais com o relatório de validação do dump. Esses
scripts não exigem alterar dados financeiros originais.

## Teste após publicar em preview

- `/api/auth/csrf` deve retornar JSON e cookie no mesmo domínio da página.
- `/login` deve retornar HTML do React/TanStack SSR pela **mesma porta**.
- `/api/clientes` sem login deve responder 401 JSON, não HTML.
- Acesso ao login com conta autorizada e conexão MySQL, com dados de teste.
- Testar baixa retroativa, estorno e erro 409 sem duplicação.
- Conferir fechamento de outubro/novembro e dados reais após homologação.

## Limites da refatoração

**Módulos Java ainda ausentes na API Node:** acordos, reajustes manuais,
revisões financeiras especiais, fechamento mensal/arquivos, convites e
administração de usuários, recuperação de acesso, dividendos e outros.
A migração unificada corrige o **problema de arquitetura** relatado pelo
Pedro; não declara esses módulos prontos. Manter o sistema anterior em
produção até completar e homologar as regras do cliente.

## Verificação técnica

O workflow GitHub Actions `Hostinger - app unico Express + Nitro + MySQL`
compila o SSR em modo middleware e sobe a aplicação para verificar API e
HTML na mesma porta. A automação evita dependência de um segundo site.
