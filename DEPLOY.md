# ImobControl — instruções de hospedagem

Este repositório contém três partes da aplicação:

- **Frontend:** React + TanStack Start, servido por Node.js/Nitro.
- **Backend:** Java 21 + Spring Boot, porta interna `8081`.
- **Banco:** PostgreSQL.

O arquivo `docker-compose.yml` sobe frontend, backend, PostgreSQL e Nginx em conjunto.

## Requisitos do servidor

- Docker Engine
- Docker Compose v2
- Porta 80 liberada para o acesso inicial por HTTP
- Para produção definitiva: domínio + HTTPS

## 1. Configurar as variáveis

Na raiz do projeto:

```bash
cp .env.example .env
```

Edite `.env` e defina senhas fortes para `DB_PASSWORD` e `IMOB_ADMIN_PASSWORD`.

O arquivo `.env` **não deve ser enviado ao GitHub**.

`IMOB_ADMIN_EMAIL` e `IMOB_ADMIN_PASSWORD` criam o primeiro `SUPER_ADMIN` apenas caso esse e-mail ainda não exista no banco.

Enquanto o acesso for somente por IP/HTTP, mantenha:

```env
SESSION_COOKIE_SECURE=false
```

Quando HTTPS estiver ativo, altere para:

```env
SESSION_COOKIE_SECURE=true
```

## 2. Subir o sistema

```bash
docker compose up -d --build
```

Verificar os serviços:

```bash
docker compose ps
```

Verificar a API:

```bash
curl http://127.0.0.1/actuator/health
```

Resposta esperada:

```json
{"status":"UP"}
```

O sistema ficará disponível inicialmente em:

```text
http://IP_DO_SERVIDOR/
```

A página de login é:

```text
http://IP_DO_SERVIDOR/login
```

## 3. Logs

Todos os serviços:

```bash
docker compose logs -f
```

Somente backend:

```bash
docker compose logs -f backend
```

Somente frontend:

```bash
docker compose logs -f frontend
```

## 4. Atualização

Após receber uma nova versão do projeto:

```bash
docker compose up -d --build
```

As migrations do banco são executadas automaticamente pelo Flyway. O volume `postgres_data` preserva os dados entre recriações dos containers.

## 5. Backup

Exemplo de backup do PostgreSQL:

```bash
docker compose exec -T db pg_dump -U "$DB_USER" "$DB_NAME" > imobcontrol-backup.sql
```

O responsável pela infraestrutura deve configurar uma rotina automática de backup antes de uso com dados reais.

## 6. HTTPS

O Nginx incluído no projeto faz o proxy interno entre navegador, frontend e backend. Para produção definitiva, o responsável pela hospedagem deve colocar HTTPS na frente da aplicação (certificado TLS, proxy do provedor ou configuração própria).

Após HTTPS estar funcionando, `SESSION_COOKIE_SECURE=true` é obrigatório.

## Observação sobre o estágio atual

A autenticação, sessão, estrutura multi-tenant inicial e banco de usuários já utilizam o backend Java. As telas e dados financeiros que ainda estiverem mantidos apenas no frontend devem ser considerados **MVP de desenvolvimento**, não armazenamento definitivo de produção, até que os respectivos módulos sejam migrados para a API/PostgreSQL.
