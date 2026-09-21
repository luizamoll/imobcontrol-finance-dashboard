# Handoff de hospedagem — ImobControl

Este documento é para quem vai hospedar o ImobControl.

## Repositório e branch

Repositório:
`https://github.com/luizamoll/imobcontrol-finance-dashboard`

Branch atual para homologação:
`feat/regras-contextuais-real`

> Não usar a `main` ainda. As alterações mais recentes e validadas estão nesta branch.

## Stack

- Front-end: React 19 + TanStack Start + Vite
- Runtime front-end: Node 22
- Back-end: Java 21 + Spring Boot 4.1
- Banco: PostgreSQL 17
- Proxy: Nginx
- Orquestração: Docker Compose

## Arquivos principais de deploy

- `Dockerfile`
- `backend/Dockerfile`
- `docker-compose.yml`
- `deploy/nginx.conf`
- `.env.example`

## Variáveis de ambiente

Criar um arquivo `.env` no servidor baseado em `.env.example`.

Obrigatórias:

```env
DB_NAME=imobcontrol
DB_USER=imobcontrol
DB_PASSWORD=DEFINIR_SENHA_FORTE

IMOB_ADMIN_NAME=Administrador ImobControl
IMOB_ADMIN_EMAIL=DEFINIR_EMAIL_ADMIN
IMOB_ADMIN_PASSWORD=DEFINIR_SENHA_FORTE

SESSION_COOKIE_SECURE=false
HTTP_PORT=80
```

Quando o domínio estiver com HTTPS:

```env
SESSION_COOKIE_SECURE=true
```

Nunca versionar o arquivo `.env`.

## Subida com Docker Compose

Na raiz do projeto:

```bash
docker compose up -d --build
```

Verificar:

```bash
docker compose ps
```

Health check do back-end:

```text
/actuator/health
```

## Portas internas

- Nginx/proxy: 80
- Front-end: 3000
- Back-end: 8081
- PostgreSQL: 5432

Somente o proxy deve ficar público.

## Observação importante sobre esta versão

Esta é uma versão de **homologação**.

Autenticação, usuários e empresas já utilizam Java/PostgreSQL.

Porém, os dados operacionais abaixo ainda ficam no `localStorage` do navegador:

- empreendimentos;
- quadras;
- unidades;
- vendas;
- parcelas;
- recebimentos;
- movimentos financeiros;
- configurações financeiras.

Portanto:

- não usar dados financeiros reais nesta etapa;
- os dados operacionais ainda não são compartilhados entre navegadores/dispositivos;
- limpar dados do navegador pode remover esses registros;
- a próxima etapa é migrar esses módulos para a API Java/PostgreSQL com `empresa_id`.

## Atualizações futuras

A aplicação continuará sendo atualizada pelo GitHub.

Fluxo recomendado:

```text
alteração -> testes -> commit -> push -> deploy
```

Evitar editar arquivos manualmente direto no servidor.

## Validações já executadas

Na branch atual:

- `bun run build` passou;
- `mvn -f backend/pom.xml test` passou.

## Para clonar diretamente a branch

```bash
git clone -b feat/regras-contextuais-real https://github.com/luizamoll/imobcontrol-finance-dashboard.git
cd imobcontrol-finance-dashboard
```
