# Imob Control — publicação em Hostinger Business

Status: **procedimento preparado, implantação real ainda não executada**.

## Arquitetura

Hostinger Business aceita **Node.js + Express**, GitHub, **React** e MySQL.
O projeto continua em um repositório GitHub com **dois apps Node.js separados**:

- Web: TanStack Start/React (raiz do repo, `./`), app de apresentação.
- API: Express + MySQL (`backend-node/`), app de negócio.
- Web direciona rotas `/api/*` para API via **`API_UPSTREAM`**, implementado em `src/server.ts`. Assim o navegador usa cookies de mesma origem sem precisar habilitar CORS público.

Na Hostinger, aplicações de um monorepo são sites Node.js separados e cada uma conta para o limite do plano.

## 1. Banco de homologação

No hPanel → Bancos de dados MySQL:
1. Criar banco **novo e vazio** e usuário exclusivo, com acesso limitado.
2. Importar o `imobcontrol-MYSQL-REAL-20261110.sql` **somente no ambiente de homologação** (arquivo em canal privado, nunca no Git).
3. Conferir o manifesto e totals; conferir 41 clientes, 41 vendas, 8.000 parcelas, 645 movimentos. Não restaurar por cima de dados de produção.
4. Rodar `backend-node/sql/01_node_sessoes.sql` para sessões Node (a tabela antiga do Spring não é reutilizada).
5. Fazer testes de login, criação de venda, recebimento e estorno com dados fictícios e conferência do saldo.

**Atenção:** o banco real contém registros pessoais e financeiros. Nunca exponha o SQL publicamente ou faça upload no repositório. A exportação representa dados **até 03/11/2026** e precisa de corte de atualização para entrar em produção.

## 2. API (site Node.js privado para administração)

No hPanel: Websites → Create site → Web App → Import Git Repository.

| Configuração | Valor |
|---|---|
| Repositório | `luizamoll/imobcontrol-finance-dashboard` |
| Branch para testes | `migracao-node-mysql-20261110` |
| Root directory | `backend-node` |
| Framework | Express |
| Node | 22.x |
| Instalação | npm |
| Comando de início | `npm start` |
| Arquivo de entrada | `src/index.js` |

Variáveis de ambiente no painel **da API** (NÃO no GitHub):
```text
NODE_ENV=production
COOKIE_SECURE=true
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=NOME_DO_BANCO
DB_USER=USUARIO_DO_BANCO
DB_PASSWORD=SENHA_FORTE_DO_BANCO
SESSION_SECRET=UMA_CHAVE_ALEATORIA_LONGA_UNICA_DE_32_OU_MAIS_CARACTERES
```

Não definir `PORT` manualmente, a Hostinger gerencia isso.

A API precisa de HTTPS e URL definida, por exemplo `https://api.seudominio.com.br`. Se a Hostinger não suportar acesso interno entre apps, usar URL HTTPS pública e manter a autenticação por sessão/CSRF; nunca confiar apenas na URL obscura. O proxy web encaminha as requisições.

## 3. Web (site Node.js React)

Criar outro Web App na Hostinger com o **mesmo repositório**:

| Configuração | Valor |
|---|---|
| Branch | `migracao-node-mysql-20261110` |
| Root directory | `./` |
| Framework | Other (TanStack Start/Nitro), se não detectado automaticamente |
| Node | 22.x |
| Instalação | npm (Bun não é suportado na Hostinger) |
| Build | `npm run build` |
| Start | `npm start` |
| Output | `.output` |
| Entry | `.output/server/index.mjs` |

Configuração somente **do servidor web**:
```text
NODE_ENV=production
API_UPSTREAM=https://api.seudominio.com.br
```
O valor acima é exemplo, trocar pela URL efetiva da API. `src/server.ts` encaminha `/api/*` diretamente para o upstream. **Não usar `VITE_API_UPSTREAM`**: a URL fica no servidor, não no bundle do navegador.

Se precisar manter a versão anterior operando, usar domínio temporário/staging para essas duas aplicações.

## 4. Homologação obrigatória

Antes de apontar domínio do cliente:
- CI verde em `backend-node` (unitários + MySQL 8 real) e build de `web`.
- `GET /health` API responde JSON com `status=UP`.
- Login no domínio web (cookies `HttpOnly` por HTTPS).
- Cadastro de cliente, empreendimento, unidade, venda e parcelas.
- Recebimento retroativo em outubro deve entrar em **outubro**, não novembro.
- Segunda tentativa de receber a mesma parcela deve dar **409 sem duplicar movimentos**.
- Estorno deve reabrir parcela e manter o histórico como estornado.
- Conciliar totais e contagens antes de usar dados do cliente.
- Avaliar módulos ainda não migrados; o servidor devolve 501 para rotas ausentes.

## Situação atual

Não ativar produção nem mesclar o PR #30 enquanto edição/exclusão de vendas, reajustes, acordos, fechamentos, administração, convites e demais rotas não estiverem portados e homologados. Manter a instalação anterior funcionando e os backups armazenados.

**Referências oficiais**:
- https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
- https://www.hostinger.com/support/how-to-deploy-monorepos-with-npm-yarn-or-pnpm-on-hostinger/
- https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/
