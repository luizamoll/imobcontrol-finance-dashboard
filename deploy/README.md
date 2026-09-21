# Hospedagem do ImobControl

Este diretório reúne a preparação de implantação do ImobControl.

## Estado atual

A aplicação já possui uma base de implantação com:

- front-end React/TanStack Start empacotado em Docker;
- API Java/Spring Boot empacotada em Docker;
- PostgreSQL 17;
- Nginx como proxy reverso;
- autenticação e usuários persistidos no banco;
- health check da API em `/actuator/health`.

### Limitação importante antes de produção

Os dados operacionais do negócio — empreendimentos, quadras, unidades, vendas, parcelas,
recebimentos, movimentos e configurações financeiras — ainda são mantidos no
`localStorage` do navegador.

Por isso, a versão atual pode ser publicada para **homologação/testes**, mas não deve ser
considerada produção para dados financeiros reais. Em navegadores ou dispositivos diferentes,
esses dados não são compartilhados.

A etapa obrigatória antes de produção é migrar esse estado operacional para a API Java e o
PostgreSQL, sempre associado ao `empresa_id`.

## Fluxo recomendado

1. Trabalhar em uma branch de desenvolvimento.
2. Executar build e testes.
3. Publicar primeiro em um ambiente de homologação.
4. Validar autenticação, regras financeiras e fluxos de recebimento.
5. Migrar os dados operacionais para Java/PostgreSQL.
6. Ativar HTTPS.
7. Definir `SESSION_COOKIE_SECURE=true`.
8. Promover a versão validada para produção.

Depois da publicação, novas alterações continuam normalmente pelo GitHub. O host pode ser
configurado para fazer um novo deploy sempre que a branch de produção for atualizada.

## Variáveis de ambiente

Copie `.env.example` para `.env` somente no servidor e altere as senhas.

Nunca versione o arquivo `.env`.

Variáveis principais:

- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `IMOB_ADMIN_NAME`
- `IMOB_ADMIN_EMAIL`
- `IMOB_ADMIN_PASSWORD`
- `SESSION_COOKIE_SECURE`
- `HTTP_PORT`

## Subindo a pilha Docker

Com Docker e Docker Compose instalados:

```bash
docker compose up -d --build
```

Para verificar os serviços:

```bash
docker compose ps
```

A API pode ser verificada por:

```text
/actuator/health
```

## HTTPS

O arquivo `deploy/nginx.conf` atualmente recebe tráfego HTTP. Em hospedagem pública, o HTTPS
deve ser terminado pelo provedor ou por um proxy TLS na frente do Nginx.

Somente após o endereço público estar usando HTTPS defina:

```env
SESSION_COOKIE_SECURE=true
```

## Atualizações depois de hospedado

Hospedar não congela o sistema. O fluxo continua sendo:

```text
alteração -> branch -> testes -> merge -> deploy
```

O ambiente publicado deve sempre ser atualizado a partir de uma versão testada, em vez de
editar arquivos diretamente no servidor.
