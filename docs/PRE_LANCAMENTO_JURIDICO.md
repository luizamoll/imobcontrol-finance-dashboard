# ImobControl — documentos legais e aceite (etapa final)

**Estado: PENDENTE / NÃO IMPLEMENTAR AGORA.** Primeiro estabilizar funcionalidades, permissões, dados, relatórios e operação. Não exibir termos improvisados em produção nem pedir aceite de um documento ainda não aprovado.

## Materiais a preparar
1. **Contrato comercial de licença/prestação de serviço** entre a fornecedora do ImobControl e a empresa contratante: escopo, preço/cobrança, implantação, suporte, manutenção, alterações adicionais, prazos, rescisão, acesso aos dados, exportação, responsabilidade, disponibilidade e resolução de conflitos.
2. **Termos de Uso para usuários do software**: quem pode acessar, responsabilidade por credenciais, perfis, condutas proibidas, limites das informações financeiras, registros/auditoria, mudanças e suporte.
3. **Aviso/Política de Privacidade e tratamento de dados**: finalidade dos dados, papéis das empresas envolvidas e agentes de tratamento, retenção, segurança, direitos de titulares e canais de atendimento; revisar à luz da LGPD e dos fluxos reais.
4. **Políticas operacionais anexas, se necessárias**: backup/restauração, atendimento a incidentes, disponibilidade, importação/exportação, encerramento de contrato.

## Aceite eletrônico — implementar somente depois dos textos aprovados
- Exibir **versão vigente dos Termos de Uso dentro do software**, de modo legível, antes de exigir aceite do usuário elegível.
- Ação afirmativa, identificada e inequívoca: por exemplo, caixa de seleção não marcada por padrão + botão **Aceitar e continuar**; permitir abrir/ler documento e informar como não aceitar/sair.
- Persistir prova do aceite **no backend**, ligada ao usuário e à empresa, com ID/versão e hash do texto, data/hora em UTC e contexto suficiente para auditoria. Definir retenção e acesso a esse registro com orientação jurídica e de privacidade.
- Em revisão material dos termos, decidir com assessoria jurídica quais usuários precisam aceitar a nova versão; **não apagar aceites anteriores**.
- Não confundir **aceite dos Termos de Uso por usuários** com **assinatura/aceite do contrato comercial pela empresa**. São instrumentos distintos.
- Testar primeiro acesso, sessão já aberta, recusa, nova versão, permissões e armazenamento seguro do aceite.

## Critérios antes de ativar
- [ ] Responsável/fornecedora e empresa contratante corretamente identificados
- [ ] Modelo comercial e escopo real conferidos
- [ ] Tratamento de dados pessoais mapeado e textos coerentes com o produto
- [ ] Textos revisados por profissional jurídico qualificado no Brasil
- [ ] Versões finais aprovadas e publicadas com referência estável
- [ ] Fluxo de aceite implementado, testado e auditável
- [ ] Contrato comercial formalizado à parte
- [ ] Manual de operação/ajuda e canais de suporte preparados

Esta lista é **planejamento de produto**, não substitui revisão jurídica.
