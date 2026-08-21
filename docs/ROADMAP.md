# Roadmap técnico — ImobControl

Este roadmap organiza a evolução do ImobControl sem apresentar como concluído o que ainda está em desenvolvimento.

## Concluído

- [x] Interface web para o fluxo financeiro de demonstração
- [x] Organização inicial da documentação técnica
- [x] Estrutura inicial da API com Java 21 e Spring Boot
- [x] Endpoint básico da aplicação
- [x] Health check com Spring Boot Actuator
- [x] Teste de carregamento do contexto Spring
- [x] CI do back-end com GitHub Actions

## Em andamento

- [ ] Modelar `Empreendimento` no back-end
- [ ] Criar o primeiro CRUD da API
- [ ] Definir validações de entrada
- [ ] Separar regras de aplicação e regras de domínio

## Próxima etapa

- [ ] Adicionar PostgreSQL
- [ ] Adicionar Spring Data JPA
- [ ] Criar migrações versionadas de banco
- [ ] Modelar unidades e vínculos com empreendimentos
- [ ] Criar testes de integração para persistência

## Regras financeiras

- [ ] Modelar vendas e composição de pagamento
- [ ] Modelar parcelas e recebimentos
- [ ] Levar o cálculo de imposto para o back-end
- [ ] Levar o cálculo de comissão para o back-end
- [ ] Implementar distribuição de repasses entre empresa e sócio
- [ ] Criar testes unitários para cenários financeiros

## Segurança e produção

- [ ] Autenticação
- [ ] Perfis de acesso e autorização
- [ ] Auditoria de alterações financeiras
- [ ] Tratamento padronizado de erros da API
- [ ] Configuração de ambientes
- [ ] Estratégia de deploy

## Integração

- [ ] Conectar a interface React à API Java
- [ ] Remover gradualmente dependências do estado local para dados de negócio
- [ ] Validar fluxos completos entre interface, API e banco

---

O roadmap é atualizado conforme houver implementação real no repositório. Itens não devem ser marcados apenas por planejamento ou estudo teórico.
