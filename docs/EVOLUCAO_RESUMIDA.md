# ImobControl — evolução resumida

Histórico **por entregas agrupadas**, não transcrição de chat. PRs e commits guardam os detalhes exatos. Status abaixo não equivale a homologação comercial.

| Período / referência | Entrega | Verificação e limite |
|---|---|---|
| Out/2026, entregas anteriores | Cadastro de cliente na Nova Venda, cadastro de corretor compartilhado por empresa, CEP, sócios e dividendos de terceiros | Conferir fluxo com usuários e permissões reais; não presumir que todo cenário foi homologado |
| 27/10 — [PR #20](https://github.com/luizamoll/imobcontrol-finance-dashboard/pull/20) | Comissão baseada no contrato; incluída vs. cobrada por fora, com proteção do histórico | Testes automatizados; pagamento externo ainda depende de controle próprio |
| 27/10 — [PR #21](https://github.com/luizamoll/imobcontrol-finance-dashboard/pull/21) | Cadastro completo do comprador na Nova Venda e corretor responsável sem abandonar a operação | Frontend/API e migration de corretores; conferir fluxo real do cliente |
| 27/10 — [PR #22](https://github.com/luizamoll/imobcontrol-finance-dashboard/pull/22) | Melhor tratamento de erro 409, tentativas repetidas e assets antigos após deploy | Tratamento melhorado, sem garantir ausência de novos conflitos legítimos |
| 27/10 — [PR #23](https://github.com/luizamoll/imobcontrol-finance-dashboard/pull/23) | Fechamento mensal, adimplência, valores registrados e lançamentos adicionais | Cálculo depende dos dados registrados; competência histórica requer conferência |
| 27/10 — [PR #24](https://github.com/luizamoll/imobcontrol-finance-dashboard/pull/24) | Detalhamento por unidade, impressão e arquivo mensal imutável, com distinção atribuído/pago | Snapshot somente após mês encerrado; conferir antes de arquivar |
| 27/10 — [PR #25](https://github.com/luizamoll/imobcontrol-finance-dashboard/pull/25) | Redesenho responsivo do fechamento: resumo, unidades, lançamentos, arquivados | Alteração de interface; sem alteração planejada dos cálculos |

## Como manter
Uma nova linha somente para **entrega relevante**, com data, PR, efeito, status de teste e limitação ainda conhecida. Correções pequenas na mesma entrega podem ser agrupadas.

**Importante:** o registro acima é um mapa de trabalho, não uma declaração de que todas as exigências do cliente foram encerradas. Requisitos, bugs e testes pendentes ficam no [ROADMAP](ROADMAP.md).
