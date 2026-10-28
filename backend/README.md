# ImobControl API

API do ImobControl em **Java 21 + Spring Boot 4.1**, com PostgreSQL, JPA, Flyway, autenticação/autorização por empresa e regras de operação financeira.

## Pacotes principais
- `auth`, `security`, `tenant`: identidade, sessão, segurança e isolamento.
- `operacao`, `cliente`, `corretor`: empreendimentos, unidades e cadastros.
- `financeiro`: vendas, parcelas, recebimentos, comissões e movimentações.
- `dividendos`, `fechamento`: participações de terceiros e prestações de contas mensais.

## Desenvolvimento
Com Java 21 e Maven instalados, configurar o perfil local e suas variáveis (não versionar segredos):

```bash
cd backend
mvn test
mvn spring-boot:run
```

A API expõe `/actuator/health` e endpoints de negócio sob `/api/`. O perfil `prod` exige credenciais do PostgreSQL; as migrations Flyway são validadas na inicialização.

## Fluxo de manutenção
Alterar regra financeira → adicionar/ajustar testes de regressão → PR → CI → revisão → publicação da `production` → healthcheck e homologação. **Não editar migrations já aplicadas.**

Consulte [guia do projeto](../docs/GUIA_DO_PROJETO.md), [regras](../docs/REGRAS_DE_NEGOCIO.md), [arquitetura](../docs/ARQUITETURA.md) e [produção](../docs/PRODUCAO_POSTGRESQL.md).
