# ImobControl API

Back-end em Java do ImobControl.

Esta pasta inicia a migração das regras críticas do sistema para uma API própria, separada da interface web atual.

## Stack inicial

- Java 21
- Spring Boot 4.1
- Spring Web
- Bean Validation
- Spring Boot Actuator
- Maven

## Executando

Requisitos:

- Java 21
- Maven 3.6.3+

```bash
cd backend
mvn spring-boot:run
```

Com a aplicação em execução:

```text
GET http://localhost:8080/api
GET http://localhost:8080/actuator/health
```

## Estrutura

```text
backend/
├── pom.xml
└── src/
    ├── main/
    │   ├── java/br/com/imobcontrol/
    │   │   ├── ImobControlApplication.java
    │   │   └── api/
    │   └── resources/application.yml
    └── test/
```

## Próximas etapas

O back-end será evoluído em etapas, mantendo cada recurso compreensível e testável:

1. modelar `Empreendimento` e expor o primeiro CRUD;
2. adicionar PostgreSQL, Spring Data JPA e migrações de banco;
3. modelar unidades, vendas e composição de pagamento;
4. mover regras de parcelas e recebimentos para serviços de domínio;
5. implementar cálculo de impostos, comissão e distribuição de repasses;
6. adicionar autenticação e autorização;
7. criar testes unitários para as regras financeiras;
8. integrar a interface atual à API.

A ideia não é gerar um back-end inteiro de uma vez. Cada módulo deve ser implementado e entendido antes de avançar para o próximo.
