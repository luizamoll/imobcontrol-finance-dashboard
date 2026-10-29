# ImobControl — regras de negócio (referência rápida)

Este é um índice de regras **observadas no código e/ou acordadas com o cliente**, não uma promessa de que todos os casos já foram validados em produção.

## Cadastro e acesso
- Empreendimento → unidades → cliente/comprador → venda → parcelas → recebimentos → relatórios.
- Na Nova Venda, o comprador pode ser cadastrado sem sair do formulário; há opção de dados completos. O corretor responsável também pode ser cadastrado no fluxo.
- Cadastros compartilhados precisam respeitar **empresa selecionada, perfil e permissões do usuário**.

## Comissão
- Para novas vendas com composição explicitamente informada, a base da comissão é o **valor total contratado**.
- Se **incluída**, o valor do imóvel após comissão = contrato − comissão; **não** somar novamente a comissão ao contrato.
- Se **externa**, a comissão não integra o preço nem sai automaticamente das parcelas recebidas daquele contrato. O pagamento externo requer controle separado.
- Regras de repasse e teto precisam respeitar o contrato e a configuração da venda. Vendas históricas sem modalidade explicitada não devem ser reinterpretadas automaticamente.
- Exemplo: contrato R$ 310.000, comissão 5% → comissão R$ 15.500; valor líquido quando incluída = R$ 294.500.

## Parcelas, correção, acordos e histórico
- Recebimento retroativo: juros/multa devem considerar a **data efetiva do pagamento**; data de registro e data financeira não são equivalentes.
- Correção periódica: regras podem variar por empreendimento/venda; verificar nos testes antes de prometer aplicação automática em cada cenário.
- Acordos/renegociações: preservar parcelas originais e seu histórico, identificar parcelas em acordo e vincular novas obrigações. Não apagar histórico financeiro.
- Bloquear concorrência/dobro de envio; conflito 409 não autoriza repetir uma operação sem verificar se ela já foi gravada.
- **Revisão financeira após estorno integral**: somente venda ativa, com histórico de movimentos inteiramente estornados, sem acordos/reajustes nem saldo pago em parcelas. Exige permissão VENDAS_EDITAR, versão atual, motivo com pelo menos 15 caracteres e confirmação explícita.
- A revisão não apaga parcelas nem movimentos: cancela as parcelas antigas, marca itens antigos como substituídos, cria nova composição e guarda os dados anterior/novo em registro de auditoria. Não altera comprador, unidade, empreendimento ou data original do contrato.
- Pagamentos ainda ativos ou relações com acordos/reajustes requerem outro fluxo de ajuste: o sistema bloqueia em vez de apagar histórico.

## Fechamento mensal
- Período e empreendimento são filtros fundamentais.
- **Pagou no mês**: houve recebimento no período; **adimplente no corte**: não possui saldo vencido na data de encerramento. Podem diferir.
- Recebimento total = recebimentos de parcelas não estornados pela data efetiva + outras entradas registradas.
- Valores **destinados** ao sócio, empreendedor e corretor não comprovam pagamentos. Imposto **reservado** também não significa imposto **pago**.
- Custos, impostos pagos, distratos, retenções e repasses efetivos requerem lançamento apropriado, sem dupla contagem.
- Prévia de meses antigos é reconstruída com dados atuais; fechamento **arquivado** guarda fotografia imutável no momento do arquivamento. Arquivar após conciliação documental.
- O disponível estimado não substitui extrato bancário nem apuração contábil.

## Pontos a validar em homologação
- Conciliação de um mês real: unidades, pagamentos por data efetiva, inadimplência, comissões e despesas com comprovantes.
- Regras de correção anual por empreendimento/venda e tratamento de alterações posteriores.
- Comissão externa: se/como registrar quitação e seu efeito nos relatórios.
- Acordos, distratos, vendas canceladas/quitadas e reconstrução histórica.
- Permissões de consulta/alteração para cada papel e empresa.

Sempre que uma regra mudar, atualizar **este arquivo e os testes correspondentes**, não replicar a regra em cinco documentos.
