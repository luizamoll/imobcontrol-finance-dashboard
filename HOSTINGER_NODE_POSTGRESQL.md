# Imob Control — Java → Node.js, PostgreSQL preservado

A mudança de linguagem **não** migra o banco: a aplicação usa o **mesmo PostgreSQL** já restaurado. O frontend React permanece.

## Componentes

- `/`: React / TanStack Start com proxy HTTP em `src/server.ts`.
- `backend-node/`: Express.js / Node 22 com driver `pg`.
- Banco: PostgreSQL 16+ (ou versão compatível com o backup existente). **Não usar MySQL.**

## Configuração da API

No painel da aplicação Node.js, configurar:

```env
NODE_ENV=production
COOKIE_SECURE=true
SESSION_SECRET=COLOQUE_UMA_CHAVE_ALEATORIA_FORTE_COM_32_OU_MAIS_CARACTERES
DATABASE_URL=postgresql://USUARIO:SENHA@HOST:5432/BANCO
```

Caso prefira, usar as variáveis PGHOST, PGPORT, PGDATABASE, PGUSER e PGPASSWORD em lugar de DATABASE_URL. Para PostgreSQL remoto com certificado válido, configurar `PGSSL=true` e o certificado da CA no ambiente, se necessário. Nunca publicar senhas no GitHub. Não alterar o banco existente antes do backup.

O backend precisa de uma única nova tabela de sessão, executando **somente depois de verificar a base**:

```sql
-- Arquivo backend-node/sql/01_node_sessoes_postgres.sql
```

Esse script é isolado; não altera clientes, vendas, parcelas ou movimentos.

## Iniciar

```sh
cd backend-node
npm install
npm start
```

Para a web React, criar outra aplicação Node apontando para a raiz do repo com `npm install`, `npm run build`, `npm start` e:

```env
API_UPSTREAM=https://ENDERECO_DA_API
```

O navegador continua acessando `/api` pelo mesmo domínio do frontend, por meio do proxy SSR. Configurar HTTPS para ambas aplicações.

## Testes

GitHub Actions, workflow `Imob Control Node + PostgreSQL`, verifica a API contra a estrutura das migrations PostgreSQL originais usando banco temporário descartável. Também há testes do frontend.

## Situação — NÃO PUBLICAR SEM CONCLUIR A MIGRAÇÃO

Parte da API Java já foi portada para Node: autenticação e sessões, clientes, empreendimentos/quadras/unidades, criação e consulta de vendas, baixa e estorno, comissões, parte das configurações da empresa.

Ainda faltam fluxos da versão Java como edição/exclusão e revisão financeira de vendas, acordos, reajustes de vendas existentes, fechamentos, administração de usuários, recuperação de acesso e dividendos. Rotas não portadas respondem `501`. Não substituir a aplicação em uso até as operações críticas estarem implementadas e validadas.

A refatoração está isolada na branch `migracao-node-postgresql-20261110`; a produção Java segue intacta. **Nenhuma exportação ou conversão de PostgreSQL para MySQL é necessária.**
