# Imob Control — deploy unificado na Hostinger Business

A aplicação desta branch é **uma única web app Node.js**, com Express (API) e Nitro/TanStack Start (React SSR). Banco de dados **MySQL**.

## Configuração no hPanel

| Configuração | Valor |
| --- | --- |
| Repositório Git | `luizamoll/imobcontrol-finance-dashboard` |
| Branch | `feat/hostinger-app-unificado-20261111` |
| Diretório raiz | `./` |
| Versão do Node | `22` |
| Instalação | `npm install` |
| Build | `npm run build` |
| Iniciar | `npm start` |
| Arquivo de entrada | `server/index.mjs` relativo à saída `.output/` |
| Banco | MySQL (mesma conta Hostinger) |

**Não criar uma aplicação separada para backend.** Não definir `API_UPSTREAM`.

Definir estas variáveis no painel, sem colocá-las em arquivos públicos:

```text
NODE_ENV=production
SESSION_COOKIE_SECURE=true
APP_URL=https://SEU_DOMINIO
SMTP_HOST=HOST_SMTP
SMTP_PORT=587
SMTP_USER=USUARIO_SMTP
SMTP_PASSWORD=SENHA_SMTP
SMTP_FROM=Imob Control <no-reply@SEU_DOMINIO>
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=SEU_BANCO
DB_USER=SEU_USUARIO
DB_PASSWORD=SUA_SENHA
SESSION_SECRET=SEGREDO_ALEATORIO_FORTE_DE_32_CARACTERES_OU_MAIS
```

A variável `PORT` é gerenciada pelo provedor. O processo Nitro `.output/server/index.mjs` escuta essa porta e serve ambas as partes. O Express é registrado como handler Node em `vite.config.ts` nas rotas `/api/**`, `/health` e `/actuator/health`. O build gera `.output/server/index.mjs` (middleware Nitro) e `.output/public`, mantidos junto ao código na instalação. **É necessário iniciar `.output/server/index.mjs`**; é justamente a entrada que o painel da Hostinger detecta como `server/index.mjs`. Não iniciar o antigo arquivo `hosting/hostinger.mjs`.

## Banco

O dump privado MySQL até 03/11/2026 permanece **separado** do código. Criar banco de teste vazio no hPanel, importar no phpMyAdmin, aplicar se faltarem `backend-node/sql/01_node_sessoes.sql`, `02_revisoes_financeiras.sql` e `03_tokens_acesso_node.sql`. Conferir contagens e saldos antes de qualquer virada. Não reimportar sobre banco já populado e não incluir dump no GitHub.

## Verificações após o deploy em preview

- `/api/auth/csrf` → JSON e cookie da mesma origem.
- `/api/clientes` sem login → 401 JSON.
- `/login` → HTML React por SSR.
- Testar login real, baixa retroativa, 409 sem duplicação, estorno e relatório de valores.

O GitHub Actions dessa branch já verifica API Express e SSR Nitro **em uma única porta**. Os módulos de acordos, reajustes, revisões, equipe, convites, recuperação de senha e superadmin já foram adicionados. **Não publicar em produção antes de conferir o CI do último commit, executar as três migrações no MySQL de testes, configurar SMTP e validar os fluxos e saldos com o dump real.**

Detalhes: [HOSTINGER_NODE_MYSQL.md](HOSTINGER_NODE_MYSQL.md).
