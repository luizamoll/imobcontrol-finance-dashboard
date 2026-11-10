# Imob Control — transicao Java → Node.js + MySQL

**Branch de migracao. Nao publicar em producao.** A API Node esta incompleta.

Objetivo: manter o frontend React/TanStack Start e substituir gradualmente o backend Java 21/Spring Boot por Node 20+/Express, preservando os contratos `/api` existentes.

## Feito nesta primeira etapa

- Conexao MySQL com pool e queries parametrizadas
- Login com hashes BCrypt existentes do Java, sessao armazenada no MySQL e cookie HttpOnly
- Endpoint de usuario atual, logout e token CSRF
- Separacao por empresa, verificacao de perfil e permissoes
- Clientes: listar, detalhar, cadastrar e atualizar (validacao de CPF/CEP, versao otimista e auditoria)
- Catalogo: listar/detalhar empreendimentos, listar quadras e unidades
- Financeiro: leitura de vendas/composicoes, parcelas e movimentos nao estornados
- Endpoints `/health` e `/actuator/health`
- Testes de contrato em `test/` e CI via GitHub Actions (`npm test` e `npm run check`)

Ainda faltam: cadastro/edicao de vendas, parcelas e empreendimentos, baixa/estorno de recebimentos, calculos de comissao e juros, administracao, recuperacao de senha, e-mails e outros endpoints. Leituras financeiras estao disponiveis, mas nao foram comparadas a uma base MySQL real. Rotas ausentes retornam 501. NAO usar em producao.

## Como testar em ambiente de desenvolvimento

1. Criar **MySQL de testes**, nunca sobrescrever producao.
2. Migrar esquema e dados do PostgreSQL para MySQL com um processo validado (os CSVs so fornecem dados, nao criam a estrutura).
3. Depois de existir a tabela `usuarios`, executar `sql/01_node_sessoes.sql` (nao reutilizar sessoes antigas).
4. Definir as variaveis de `.env.example` no ambiente do processo (o arquivo .env nao e carregado automaticamente).
5. Executar `npm install` e `npm start` dentro de `backend-node`.
6. Conferir `GET /health`, `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/clientes?pagina=0&tamanho=20`.

**Nao apontar o frontend de producao para esta API incompleta.**

## Dump para Hostinger

O `imobcontrol-railway.dump` existente e um backup **PostgreSQL custom**, nao um `.sql` MySQL importavel. O arquivo `imobcontrol-csv-20261103-171741.zip` tem 24 CSVs, estrutura original e contagens; para o Pedro gerar um dump MySQL:

1. Criar estrutura compativel em MySQL 8 (tipos, FKs, indices, DECIMAL e constraints), usando as migrations Java como referencia.
2. Importar CSVs em ordem de dependencias, com mapeamentos e valores nulos adequados; **nao importar** `spring_session`, `spring_session_attributes`, `tokens_acesso`, `flyway_schema_history` como estruturas de execucao da nova aplicacao.
3. Conferir 41 clientes, 41 vendas, 8000 parcelas, 645 movimentos, 2 empreendimentos e as outras contagens do manifesto.
4. Validar totais financeiros, relacionamentos e integridade; so entao gerar com `mysqldump` um arquivo `.sql` MySQL.
5. Guardar o `.dump` original ate a migracao integral estar verificada.

**Atencao:** os CSVs contem dados pessoais, senhas hash e informacoes financeiras. Nao subir dados reais ao GitHub.

## Hostinger

Em novembro de 2026, a Hostinger oferece Node.js gerenciado em planos Business e Cloud, com MySQL. Confirmar o plano contratado e as instrucoes de implantacao no hPanel. O frontend atual usa TanStack Start com Node: conferir suporte ao build antes da troca final. Manter o Java/Railway intocado ate a homologacao.

## Testes automatizados

```bash
cd backend-node
npm test
npm run check
```

Eles verificam contratos e sintaxe, nao substituem testes de integracao com MySQL nem a conciliacao de valores monetarios.
