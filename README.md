# Imob Control — migracao Node.js + MySQL para Hostinger

O frontend React/TanStack Start + Nitro e a API Express funcionam em um unico servidor Node.js, sem `API_UPSTREAM`. O banco de destino e MySQL 8; o codigo Java original permanece preservado na branch `production`.

**Versao em homologacao:** `feat/hostinger-app-unificado-20261111`. Nao confundir build aprovado com autorizacao de uso do cliente.

## Desenvolvimento da aplicacao unificada

```bash
npm install
npm run build
npm start
```

O Nitro inicia em `.output/server/index.mjs`, incluindo Express em `/api/**` (tambem `/health`).

## Modulos presentes
- Login, sessoes, CSRF, minha conta, convite, verificacao de e-mail, recuperacao de senha.
- Empresas, administracao de usuarios, permissoes, superadmin e auditoria.
- Clientes, corretores, empreendimentos/quadras/unidades, vendas, parcelas, recebimentos, comissoes e estornos.
- Acordos, reajustes de contratos, revisao financeira controlada, dividendos e fechamento mensal.

## Testes e integracao
O GitHub Actions compila o frontend Nitro, verifica `POST /api/auth/login` em JSON e executa testes Node e MySQL 8. A base real requer **homologacao separada** das regras financeiras e das permissoes de clientes.

## Documentacao
- [Instrucoes Hostinger, SMTP e migracoes MySQL](HOSTINGER_NODE_MYSQL.md)
- [API Node](backend-node/README.md)
- [Deploy](DEPLOY.md)
- [Regras de negocio](docs/REGRAS_DE_NEGOCIO.md)

Nunca colocar dumps com dados reais nem credenciais neste repositorio publico.

Desenvolvido por Maria Luiza Mol.
