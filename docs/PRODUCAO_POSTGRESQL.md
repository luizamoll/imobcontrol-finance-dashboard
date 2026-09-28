# Produção escalável — ImobControl

## Arquitetura oficial

A produção do ImobControl não usa H2 ou SQLite como banco real.

Fluxo:

```text
Navegador
   |
   v
Frontend Node/TanStack (Hostinger)
   |
   | /api/* via proxy do próprio frontend
   v
API Java/Spring Boot
   |
   | rede privada do provedor
   v
PostgreSQL
```

O navegador continua chamando `/api` no mesmo domínio do ImobControl. O servidor Node encaminha as requisições para a API definida em `API_UPSTREAM`. Isso mantém sessão e CSRF no mesmo domínio do frontend e evita depender de CORS entre o navegador e o backend.

## Banco de produção

O perfil `prod` exige explicitamente:

- `DB_URL`
- `DB_USER`
- `DB_PASSWORD`

Sem essas variáveis o backend de produção não sobe. Portanto, o fallback H2 existente no perfil local não pode ser usado acidentalmente em produção.

O pool Hikari pode ser dimensionado com:

- `DB_POOL_MAX` (padrão 20)
- `DB_POOL_MIN` (padrão 2)

O Flyway cria e valida o esquema automaticamente.

## Sessões escaláveis

As sessões autenticadas usam Spring Session JDBC e ficam no PostgreSQL.

Isso é importante porque permite rodar mais de uma instância da API sem prender o usuário à memória de um único servidor. Se a API for escalada horizontalmente, qualquer réplica consegue recuperar a sessão.

A migration `V8__sessoes_compartilhadas.sql` cria as tabelas de sessão.

## Railway — backend + PostgreSQL

O repositório possui `backend/railway.toml` e `backend/Dockerfile`.

No Railway:

1. Crie um projeto.
2. Adicione PostgreSQL.
3. Adicione o repositório GitHub como um serviço e defina o diretório raiz como `/backend`.
4. Mantenha o build pelo Dockerfile.
5. Configure as variáveis do serviço Java:

```text
DB_URL=jdbc:postgresql://<PGHOST>:<PGPORT>/<PGDATABASE>
DB_USER=<PGUSER>
DB_PASSWORD=<PGPASSWORD>
IMOB_ADMIN_NAME=<nome da super administradora>
IMOB_ADMIN_EMAIL=<email da super administradora>
IMOB_ADMIN_PASSWORD=<senha inicial forte>
SPRING_PROFILES_ACTIVE=prod
```

Use referências das variáveis do serviço PostgreSQL do próprio Railway em vez de copiar credenciais quando possível.

6. Gere um domínio HTTPS para a API.
7. No frontend da Hostinger, configure:

```text
API_UPSTREAM=https://<dominio-da-api>
```

Não coloque `/api` no final.

## Escala

A aplicação foi preparada para crescer em duas direções:

- **vertical:** aumentar CPU/RAM e o tamanho do PostgreSQL;
- **horizontal:** adicionar réplicas da API Spring.

As sessões não ficam presas à memória de uma instância. Os dados operacionais usam `empresa_id`, índices e controle de concorrência por versão.

Para aumentar réplicas da API, confirme antes se o limite de conexões do PostgreSQL comporta:

```text
réplicas da API × DB_POOL_MAX
```

Deixe margem para migrations, administração e conexões de manutenção.

## Backup

Antes de colocar dados reais em produção, habilite backups automáticos do PostgreSQL no provedor.

Além do backup do provedor, mantenha uma política periódica de exportação lógica (`pg_dump`) para recuperação independente.

## Migração dos dados locais existentes

O conteúdo antigo de `localStorage` não deve ser apagado automaticamente.

A migração da Empresa Líder deve ser feita de forma assistida para o PostgreSQL depois que o ambiente de produção estiver validado. O sistema já separa o cache por empresa e o banco passa a ser a fonte de verdade dos módulos migrados.
