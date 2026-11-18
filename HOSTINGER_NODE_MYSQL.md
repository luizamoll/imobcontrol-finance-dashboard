# Imob Control: deploy unificado Hostinger + MySQL

**Branch de homologacao:** `feat/hostinger-app-unificado-20261111`.
A versao Java da `production` permanece inalterada. NAO usar com cliente ate comparar dados, saldos e fluxos.

## Arquitetura
- Um unico aplicativo web Node.js 22 (React/TanStack SSR e API Express).
- Nitro `node_server` publica `.output/server/index.mjs` (`server/index.mjs` relativo a `.output` no painel).
- `/api/**`, `/health` e `/actuator/health` sao processados pelo Express no mesmo processo.
- Nenhum segundo app de API, nenhum `API_UPSTREAM`.

## Hostinger hPanel
| Campo | Configuracao |
|---|---|
| Git | `luizamoll/imobcontrol-finance-dashboard` |
| Branch | `feat/hostinger-app-unificado-20261111` |
| Diretorio raiz | `./` |
| Node.js | `22` |
| Build | `npm run build` |
| Start | `npm start` |
| Output | `.output` |
| Entry | `server/index.mjs` |

### Variaveis de ambiente secretas
```text
NODE_ENV=production
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=SEU_BANCO_HOSTINGER
DB_USER=SEU_USUARIO_MYSQL
DB_PASSWORD=SENHA_DO_MYSQL
SESSION_SECRET=SEGREDO_ALEATORIO_DE_32+_CARACTERES
SESSION_COOKIE_SECURE=true
APP_URL=https://SEU_DOMINIO
SMTP_HOST=SERVIDOR_SMTP
SMTP_PORT=587
SMTP_USER=USUARIO_SMTP
SMTP_PASSWORD=SENHA_SMTP
SMTP_FROM=Imob Control <no-reply@SEU_DOMINIO>
```
O envio de convites, confirmacao de e-mail e recuperacao de senha depende de SMTP operacional. Sem SMTP, o sistema permite redefinicao administrativa, mas **nao** envio de convite nem recuperacao por e-mail. Nunca registrar segredos no GitHub ou em prints publicos.

## Banco MySQL 8: procedimentos para homologacao
1. Criar **banco novo, vazio, de homologacao**.
2. Importar dump privado MySQL de 03/11/2026, conferindo origem e versao; ele **nao** inclui operacoes posteriores. NUNCA importar sobre banco de producao em uso.
3. Executar somente se necessarias as migracoes, na ordem:
   - `backend-node/sql/01_node_sessoes.sql`
   - `backend-node/sql/02_revisoes_financeiras.sql`
   - `backend-node/sql/03_tokens_acesso_node.sql`
4. Validar tabelas e indices, permissoes, contagem de usuarios/clientes/vendas/parcelas/movimentos e somatorios por empreendimento. Verificar que os movimentos estornados nao sao somados.
5. Testar um login de conta ativa com senha existente. Verificar cookie seguro e isolamento por empresa.

## Funcionalidades Node da migracao
- Autenticacao, sessoes, CSRF, equipe, permisssoes, empresas, superadmin, auditoria.
- Minha conta, alteracao de senha, verificacao de e-mail por codigo, convite, recuperacao por e-mail (dependem de SMTP).
- Clientes, corretores, empreendimentos, quadras, unidades, vendas, parcelas, recebimentos, comissoes, estornos.
- Acordos e substituicao atomica de parcelas, reajustes contratuais, revisao financeira com trilha historica.
- Dividendos de terceiros, fechamento mensal, lancamentos, estornos e arquivos de competencia.
- Implementacao foi enviada ao GitHub e os testes automatizados usam MySQL 8 descartavel; testar com o dump real de homologacao ANTES do uso operacional.

## Checklist de aprovacao
- `POST /api/auth/login` retorna JSON 200 com credenciais validas, ou 401 JSON se invalidas; nunca 404 HTML.
- `GET /api/auth/csrf` retorna 200 JSON com cookie seguro.
- `GET /api/clientes` sem login retorna 401 JSON; com empresa autorizada lista so o tenant correspondente.
- Testar criar/editar/excluir venda sem pagamentos; bloquear alteracao retroativa apos recebimento.
- Testar receber parcela em data historica, bloquear recebimento duplo, estornar e conferir saldos.
- Testar acordos, reajustes, fechamento de mes arquivado (snapshot), dividendos e permissoes.
- Testar convites, recuperar senha e verificar e-mail com SMTP verdadeiro.
- Comparar **resultado e saldos** da versao Java e da versao Node na mesma base, incluindo centavos.
- Validar no **dominio de homologacao** com Pedro e responsavel pelo cliente antes de mudar DNS/branch de producao.

A existencia de CI verde nao significa que a aplicacao foi validada com o banco real ou publicada no hPanel.
