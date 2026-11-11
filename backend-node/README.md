# Imob Control — API Node.js + MySQL (Hostinger Business)

Esta branch **não usa PostgreSQL**. A tecnologia do banco na hospedagem é **MySQL 8**, com `mysql2/promise`. O frontend React/TanStack Start continua no mesmo repositório.

## Código pronto para homologação

- Autenticação BCrypt, sessões persistidas, CSRF e isolamento de empresas.
- Clientes, cadastro e edição de empreendimentos, quadras e unidades.
- Criação/edição controlada de vendas e parcelas, cálculo de comissões com `decimal.js`.
- Recebimentos retroativos e estornos com auditoria, prevenção de baixa dupla (HTTP 409).
- Perfil/configuração da empresa e consultas financeiras.
- Testes unitários e integração em **MySQL 8** via GitHub Actions.

**Atenção: API parcial.** Acordos, reajustes manuais, revisões financeiras especiais, fechamento mensal, administração/convites, recuperação de senha, dividendos e outros endpoints Java ainda faltam; rotas ausentes retornam 501. Não publicar para o cliente até concluir esses módulos e homologar.

## Banco real do cliente

Existe dump MySQL privado com dados até 03/11/2026: `imobcontrol-MYSQL-REAL-20261110.sql`. **Não salvar esse arquivo no GitHub**.

No hPanel, criar banco de **homologação** vazio; importar o arquivo no phpMyAdmin, depois executar em ordem:

1. `sql/01_node_sessoes.sql`: sessões Node no MySQL (não reutilizar sessões Spring).
2. `sql/02_revisoes_financeiras.sql`: tabela V22 não incluída no backup de 03/11.
3. `VALIDACAO_APOS_IMPORTACAO.sql` (entregue com o dump), conferindo com `VALIDACAO_ORIGEM.txt`.

Não sobrescrever um banco em uso. Conferir quantidades e valores antes de apontar domínio.

## Hostinger Business

A API é uma aplicação Express separada, com diretório de projeto `backend-node/`, Node 22 e `npm start`. Configurar **no hPanel**:

```env
NODE_ENV=production
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=NOME_COMPLETO_COM_PREFIXO
DB_USER=USUARIO_COMPLETO_COM_PREFIXO
DB_PASSWORD=SENHA_DO_BANCO
SESSION_SECRET=CHAVE_ALEATORIA_FORTE_DE_32_CARACTERES_OU_MAIS
COOKIE_SECURE=true
```

A aplicação React usa `API_UPSTREAM=https://URL_DA_API`, configurado **apenas no servidor React**.

Documentação de deploy: [HOSTINGER_NODE_MYSQL.md](../HOSTINGER_NODE_MYSQL.md).

## Desenvolvimento

```sh
cd backend-node
npm install
npm run check
npm test
npm start
```

Guarde credenciais em variáveis de ambiente e não as envie por chat.
