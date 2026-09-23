# ImobControl 2 — release unica de cadastro, persistencia e marca

**Destino:** uma unica publicacao quando os itens abaixo estiverem completos e testados. Nenhuma alteracao nesta branch deve ser implantada automaticamente no site atual.

## Condicao de entrada em producao

- [ ] Definir hospedagem operacional para API Java e PostgreSQL; Hostinger Node/Nitro nao inicia o Java automaticamente.
- [ ] Persistir empreendimentos, quadras, unidades, compradores, vendas, composicao, parcelas, recebimentos e movimentos no banco compartilhado.
- [ ] Associar cada registro a uma empresa e validar isolamento no servidor, sem confiar no ID enviado pelo navegador.
- [ ] Usar transacoes e valores monetarios decimais para operacoes financeiras.
- [ ] Salvar as regras contratuais aplicadas a cada venda, sem recalcular o passado a partir de configuracoes novas.
- [ ] Auditar autor, momento e tipo de alteracao, inclusive reversoes de recebimento.
- [ ] Testar edicoes concorrentes e impedir sobrescrita silenciosa.
- [ ] Cadastro de comprador com CPF, CEP, endereco, estado civil, profissao e contatos, acessivel apenas aos usuarios autorizados da empresa.
- [ ] Vincular comprador cadastrado a vendas sem duplicar dados.
- [ ] Permitir editar dados cadastrais da venda; alteracoes de valor, parcelas e regras requerem fluxo financeiro explicito e auditado.
- [ ] Substituir favicon e simbolo de cifrao pela marca ImobControl; revisar icones da interface.
- [ ] Preparar exportacao/recuperacao dos dados locais existentes antes de qualquer migracao.
- [ ] Validar em dois navegadores/usuarios distintos na mesma empresa e em empresas distintas.
- [ ] Build frontend + testes backend + teste de deploy em homologacao.
- [ ] Backup e procedimento de restauracao confirmados antes de liberar clientes reais.

## Fluxo de publicacao

Desenvolver nesta branch, abrir PR para `main`, rodar CI e revisar dados/testes. Somente depois publicar na Hostinger e no host da API. O link publico permanece o mesmo.

## Regra de seguranca

Nao cadastrar CPF/endereco na persistencia local como solucao final. Na versao nova, os dados pessoais e operacionais devem ser gravados pelo backend com autenticacao, autorizacao e isolamento por empresa.
