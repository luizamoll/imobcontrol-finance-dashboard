export type ExpandedHelpTarget = { label: string; href: string };
export type ExpandedHelpTopic = {
  id: string;
  title: string;
  questions: string[];
  answer: string;
  keywords: string[];
  routes?: string[];
  target?: ExpandedHelpTarget;
};

// 46 temas x 5 perguntas = 230 perguntas relevantes do ImobControl.
export const expandedHelpTopics: ExpandedHelpTopic[] = [
  {
    "id": "guia-inicio-fluxo",
    "title": "Começando no ImobControl",
    "questions": [
      "Por onde começo a usar o ImobControl?",
      "Qual é a ordem certa para cadastrar as informações?",
      "O que devo cadastrar primeiro no sistema?",
      "Como é o fluxo básico do ImobControl?",
      "Sou novo no sistema, o que faço primeiro?"
    ],
    "answer": "Um fluxo seguro é: confira a empresa e as configurações básicas, cadastre o empreendimento, crie seus agrupamentos e unidades, cadastre os clientes e corretores, registre as vendas e depois acompanhe parcelas, recebimentos e relatórios. O Dashboard ajuda a enxergar a operação, mas os cadastros e regras ficam nos módulos específicos.",
    "keywords": [
      "começar",
      "primeiros passos",
      "ordem",
      "fluxo",
      "novo usuário"
    ],
    "routes": [
      "/"
    ],
    "target": {
      "label": "Ir para o Dashboard",
      "href": "/"
    }
  },
  {
    "id": "dashboard-entender",
    "title": "Entendendo o Dashboard",
    "questions": [
      "Para que serve o Dashboard?",
      "O Dashboard altera algum dado?",
      "Onde vejo um resumo da operação?",
      "Qual tela mostra a visão geral do negócio?",
      "Devo usar o Dashboard para fazer lançamentos?"
    ],
    "answer": "O Dashboard serve como visão geral e acompanhamento. Use-o para enxergar indicadores e sinais da operação; os lançamentos e alterações devem ser feitos nos módulos correspondentes, como Vendas, Recebimentos, Empreendimentos e Relatórios.",
    "keywords": [
      "dashboard",
      "visão geral",
      "resumo",
      "indicadores",
      "lançamentos"
    ],
    "routes": [
      "/"
    ],
    "target": {
      "label": "Abrir Dashboard",
      "href": "/"
    }
  },
  {
    "id": "login-acesso",
    "title": "Entrar no sistema",
    "questions": [
      "Como faço login no ImobControl?",
      "Qual e-mail devo usar para entrar?",
      "Não consigo entrar, o que devo conferir?",
      "Meu acesso não funciona, o que faço?",
      "Aparece erro de login, como resolvo?"
    ],
    "answer": "Use o e-mail vinculado ao seu usuário e sua senha atual. Se não conseguir entrar, confira primeiro o e-mail digitado, se o usuário está ativo e se a senha está correta. Se necessário, use a recuperação de senha ou peça a um administrador para redefinir seu acesso existente.",
    "keywords": [
      "login",
      "entrar",
      "acesso",
      "email",
      "senha",
      "erro"
    ],
    "routes": [
      "/login",
      "/recuperar-senha"
    ],
    "target": {
      "label": "Recuperar senha",
      "href": "/recuperar-senha"
    }
  },
  {
    "id": "conta-senha-email",
    "title": "Minha conta, e-mail e senha",
    "questions": [
      "Como altero minha senha?",
      "Como mudo meu e-mail de acesso?",
      "Onde atualizo meu nome ou telefone?",
      "Qual é o tamanho mínimo da nova senha?",
      "Por que o sistema pede minha senha atual?"
    ],
    "answer": "Abra Minha conta para atualizar nome, telefone, e-mail e senha. Para alterar e-mail ou senha, confirme sua senha atual. A nova senha precisa ter pelo menos 8 caracteres e a confirmação deve ser igual. Alterações de e-mail podem exigir verificação por código.",
    "keywords": [
      "minha conta",
      "senha atual",
      "nova senha",
      "email",
      "telefone",
      "8 caracteres"
    ],
    "routes": [
      "/conta"
    ],
    "target": {
      "label": "Abrir Minha conta",
      "href": "/conta"
    }
  },
  {
    "id": "equipe-criar",
    "title": "Adicionar funcionário ou colaborador",
    "questions": [
      "Como adicionar um funcionário?",
      "Como cadastrar um colaborador?",
      "Como criar um usuário para minha equipe?",
      "Como dar acesso a um funcionário?",
      "Onde adiciono uma pessoa da equipe?"
    ],
    "answer": "Abra Equipe e acessos e clique em Novo colaborador. Preencha Nome e E-mail de acesso; Telefone é opcional. Defina as permissões necessárias e crie o colaborador. O acesso fica vinculado à empresa atual e o sistema prepara o primeiro acesso por convite ou acesso temporário.",
    "keywords": [
      "funcionário",
      "funcionario",
      "colaborador",
      "equipe",
      "novo colaborador",
      "criar usuário"
    ],
    "routes": [
      "/equipe"
    ],
    "target": {
      "label": "Abrir Equipe e acessos",
      "href": "/equipe"
    }
  },
  {
    "id": "equipe-editar",
    "title": "Editar colaborador",
    "questions": [
      "Como altero os dados de um funcionário?",
      "Como editar um colaborador?",
      "Posso mudar o e-mail de um usuário da equipe?",
      "Como atualizar o telefone de um funcionário?",
      "Onde altero as permissões de um colaborador existente?"
    ],
    "answer": "Em Equipe e acessos, encontre o colaborador e clique em Editar. Você pode atualizar os dados disponíveis, o status e as permissões conforme seu nível de acesso. Evite criar uma segunda conta para a mesma pessoa quando o correto é editar a existente.",
    "keywords": [
      "editar funcionário",
      "editar colaborador",
      "equipe",
      "email",
      "telefone",
      "permissões"
    ],
    "routes": [
      "/equipe"
    ],
    "target": {
      "label": "Abrir Equipe e acessos",
      "href": "/equipe"
    }
  },
  {
    "id": "equipe-permissoes",
    "title": "Permissões da equipe",
    "questions": [
      "Como escolho o que um funcionário pode acessar?",
      "Como funcionam as permissões da equipe?",
      "Posso liberar só algumas funções para um colaborador?",
      "Por que um funcionário não vê determinado botão?",
      "Como tiro uma permissão de um usuário?"
    ],
    "answer": "As permissões são definidas em Equipe e acessos. Libere somente o necessário para a função da pessoa. Algumas ações dependem de permissões específicas; por exemplo, visualizar vendas não é o mesmo que criar, editar ou excluir vendas. Se um botão não aparece, confira as permissões desse usuário.",
    "keywords": [
      "permissão",
      "permissoes",
      "funcionário",
      "botão não aparece",
      "acesso"
    ],
    "routes": [
      "/equipe"
    ],
    "target": {
      "label": "Abrir Equipe e acessos",
      "href": "/equipe"
    }
  },
  {
    "id": "equipe-convite-acesso",
    "title": "Convite e acesso temporário",
    "questions": [
      "O funcionário não recebeu o convite, o que faço?",
      "Como definir uma senha temporária para um colaborador?",
      "Posso liberar acesso sem o e-mail de convite?",
      "Como reenviar o convite de primeiro acesso?",
      "Qual o mínimo de caracteres da senha temporária?"
    ],
    "answer": "Na lista da equipe, usuários ainda não ativados podem ter a opção de reenviar convite. Se o envio de e-mail não estiver disponível ou você precisar liberar o acesso manualmente, use Definir acesso e crie uma senha temporária com pelo menos 8 caracteres. Depois, o colaborador pode entrar com o e-mail cadastrado.",
    "keywords": [
      "convite",
      "senha temporária",
      "definir acesso",
      "reenviar convite",
      "8 caracteres"
    ],
    "routes": [
      "/equipe"
    ],
    "target": {
      "label": "Abrir Equipe e acessos",
      "href": "/equipe"
    }
  },
  {
    "id": "equipe-status",
    "title": "Ativar ou bloquear colaborador",
    "questions": [
      "Como bloquear o acesso de um funcionário?",
      "Como reativar um colaborador?",
      "O que significa usuário inativo?",
      "Como impedir temporariamente que alguém entre?",
      "Onde vejo quais funcionários estão ativos?"
    ],
    "answer": "Em Equipe e acessos, edite o colaborador e altere o Status do acesso. Ativo pode acessar conforme suas permissões; Inativo fica com acesso bloqueado. A própria tela também permite filtrar usuários ativos e inativos.",
    "keywords": [
      "ativo",
      "inativo",
      "bloquear",
      "reativar",
      "status de acesso"
    ],
    "routes": [
      "/equipe"
    ],
    "target": {
      "label": "Abrir Equipe e acessos",
      "href": "/equipe"
    }
  },
  {
    "id": "equipe-ver-como",
    "title": "Ver o sistema como um colaborador",
    "questions": [
      "Como vejo o que um funcionário enxerga?",
      "Posso simular o acesso de um colaborador?",
      "Como testar as permissões de um usuário?",
      "Quero conferir se o funcionário vê só o que deve, como faço?",
      "O que faz o botão Ver como?"
    ],
    "answer": "Administradores habilitados podem usar Ver como na tela Equipe e acessos para visualizar o sistema com as permissões daquele colaborador. Isso é útil para validar menus, botões e acessos sem alterar as permissões apenas para testar.",
    "keywords": [
      "ver como",
      "simular funcionário",
      "testar permissões",
      "visualizar acesso"
    ],
    "routes": [
      "/equipe"
    ],
    "target": {
      "label": "Abrir Equipe e acessos",
      "href": "/equipe"
    }
  },
  {
    "id": "empreendimento-criar",
    "title": "Cadastrar empreendimento",
    "questions": [
      "Como cadastrar um empreendimento?",
      "Quais dados preciso informar para um novo empreendimento?",
      "Onde cadastro uma SPE?",
      "Como criar um loteamento no sistema?",
      "Como cadastrar um empreendimento de gleba rural?"
    ],
    "answer": "Abra Empreendimentos e escolha Novo empreendimento. Informe os dados principais, incluindo nome e SPE responsável, além do tipo e das demais informações aplicáveis. O sistema aceita tipos como Loteamento, Gleba rural, Vertical, Horizontal, Comercial, Misto e Outro.",
    "keywords": [
      "novo empreendimento",
      "spe",
      "loteamento",
      "gleba rural",
      "vertical",
      "horizontal"
    ],
    "routes": [
      "/empreendimentos"
    ],
    "target": {
      "label": "Abrir Empreendimentos",
      "href": "/empreendimentos"
    }
  },
  {
    "id": "empreendimento-regras",
    "title": "Regras financeiras do empreendimento",
    "questions": [
      "Onde configuro comissão do empreendimento?",
      "Como defino o percentual do sócio e da empresa?",
      "Onde informo a alíquota tributária?",
      "Como configuro juros e multa de um empreendimento?",
      "As regras do empreendimento valem para as vendas?"
    ],
    "answer": "No cadastro do empreendimento você pode definir regras como participação de sócio e empresa, comissão, repasse, tributação e inadimplência. Sócio + empresa precisam totalizar 100% do saldo líquido. Essas regras servem como base operacional e podem ser congeladas no contrato conforme a lógica da venda.",
    "keywords": [
      "regra financeira",
      "sócio",
      "empresa",
      "comissão",
      "tributação",
      "juros",
      "multa"
    ],
    "routes": [
      "/empreendimentos",
      "/configuracoes"
    ],
    "target": {
      "label": "Abrir Empreendimentos",
      "href": "/empreendimentos"
    }
  },
  {
    "id": "empreendimento-editar-excluir",
    "title": "Editar ou excluir empreendimento",
    "questions": [
      "Como editar um empreendimento?",
      "Posso excluir um empreendimento?",
      "Por que não consigo excluir um empreendimento?",
      "O que acontece se o empreendimento já tiver histórico financeiro?",
      "Onde altero os dados de uma SPE?"
    ],
    "answer": "Abra o empreendimento para editar os dados permitidos. A exclusão é protegida: se o empreendimento possui histórico financeiro, o sistema bloqueia a exclusão para preservar a rastreabilidade. Nessa situação, não force a remoção do histórico.",
    "keywords": [
      "editar empreendimento",
      "excluir empreendimento",
      "histórico financeiro",
      "spe"
    ],
    "routes": [
      "/empreendimentos"
    ],
    "target": {
      "label": "Abrir Empreendimentos",
      "href": "/empreendimentos"
    }
  },
  {
    "id": "agrupamentos",
    "title": "Quadras, blocos e setores",
    "questions": [
      "Como cadastrar uma quadra?",
      "Posso organizar unidades por bloco?",
      "O que é um agrupamento no empreendimento?",
      "Como criar um setor dentro do empreendimento?",
      "A unidade precisa estar dentro de uma quadra?"
    ],
    "answer": "Dentro do empreendimento, use os agrupamentos para organizar as unidades. O sistema aceita Quadra, Bloco e Setor. Uma unidade pode ser vinculada a um agrupamento ou cadastrada diretamente no empreendimento, quando isso fizer mais sentido para a operação.",
    "keywords": [
      "quadra",
      "bloco",
      "setor",
      "agrupamento",
      "unidade"
    ],
    "routes": [
      "/empreendimentos"
    ]
  },
  {
    "id": "unidades-cadastrar",
    "title": "Cadastrar unidade, lote ou gleba",
    "questions": [
      "Como cadastrar um lote?",
      "Como cadastrar uma gleba?",
      "Onde adiciono uma unidade?",
      "Quais tipos de unidade existem?",
      "Posso cadastrar apartamento, sala ou loja?"
    ],
    "answer": "Abra o empreendimento e use Nova unidade. Informe matrícula, identificação da unidade/lote e os demais dados. Os tipos disponíveis incluem Lote, Gleba, Apartamento, Sala, Casa, Loja e Outro.",
    "keywords": [
      "unidade",
      "lote",
      "gleba",
      "apartamento",
      "sala",
      "casa",
      "loja",
      "matrícula"
    ],
    "routes": [
      "/empreendimentos"
    ]
  },
  {
    "id": "unidades-status",
    "title": "Status da unidade",
    "questions": [
      "O que significa unidade disponível?",
      "Como marco uma unidade como reservada?",
      "Quais status uma unidade pode ter?",
      "Uma unidade vendida pode voltar para disponível?",
      "O que acontece com a unidade quando excluo uma venda?"
    ],
    "answer": "A unidade pode ficar Disponível, Reservada, Vendida ou Cancelada. Quando uma venda válida é vinculada, a unidade passa a refletir a operação correspondente. Se uma venda sem histórico de recebimentos for excluída pelo fluxo oficial, a unidade volta para Disponível.",
    "keywords": [
      "status unidade",
      "disponível",
      "reservado",
      "vendido",
      "cancelado"
    ],
    "routes": [
      "/empreendimentos",
      "/vendas"
    ]
  },
  {
    "id": "clientes-cadastrar",
    "title": "Cadastrar e editar clientes",
    "questions": [
      "Como cadastrar um cliente?",
      "Onde edito um cliente?",
      "Como localizar um comprador?",
      "Preciso informar o nome do cliente?",
      "Onde ficam os dados pessoais do comprador?"
    ],
    "answer": "Abra Clientes para criar, buscar e editar cadastros. O nome é obrigatório; os demais campos disponíveis podem ser preenchidos conforme os dados que você possui. Use o cadastro do cliente para depois vinculá-lo corretamente às vendas.",
    "keywords": [
      "cliente",
      "comprador",
      "cadastro",
      "editar cliente",
      "buscar cliente"
    ],
    "routes": [
      "/clientes"
    ],
    "target": {
      "label": "Abrir Clientes",
      "href": "/clientes"
    }
  },
  {
    "id": "venda-criar",
    "title": "Criar uma venda",
    "questions": [
      "Como cadastrar uma venda?",
      "Como criar um contrato no ImobControl?",
      "Como vincular cliente e unidade em uma venda?",
      "Quais dados preciso escolher antes de salvar a venda?",
      "Onde começo uma nova venda?"
    ],
    "answer": "Abra Vendas e clique em Nova venda. Selecione empreendimento, unidade disponível e cliente, informe o valor negociado, data do contrato, corretor e a composição real do pagamento. Antes de salvar, confira se a composição fecha com o valor negociado.",
    "keywords": [
      "nova venda",
      "contrato",
      "cliente",
      "unidade",
      "valor negociado"
    ],
    "routes": [
      "/vendas"
    ],
    "target": {
      "label": "Abrir Vendas",
      "href": "/vendas"
    }
  },
  {
    "id": "venda-composicao",
    "title": "Composição do pagamento",
    "questions": [
      "Como monto as parcelas de uma venda?",
      "Posso ter entrada e parcelas na mesma venda?",
      "Como cadastrar uma parcela personalizada?",
      "Posso colocar um bem como parte do pagamento?",
      "O que significa composição do pagamento?"
    ],
    "answer": "A composição representa como o valor negociado será pago. Você pode combinar itens como À vista, Entrada/Sinal, Entrada parcelada, Parcelas iguais, Parcela personalizada, Bem material e Outros. A soma da composição precisa fechar com o valor do contrato, respeitando apenas pequenos ajustes normais de arredondamento.",
    "keywords": [
      "composição",
      "entrada",
      "sinal",
      "parcelas iguais",
      "parcela personalizada",
      "bem"
    ],
    "routes": [
      "/vendas"
    ]
  },
  {
    "id": "venda-corretagem",
    "title": "Corretor e comissão da venda",
    "questions": [
      "Como informo o corretor de uma venda?",
      "Onde coloco o percentual de comissão?",
      "O que é repasse de cada recebimento para comissão?",
      "A comissão pode incidir sobre juros e multa?",
      "Como altero o corretor responsável pela venda?"
    ],
    "answer": "Na venda, selecione o corretor responsável e informe a comissão total e o percentual de cada recebimento destinado ao repasse. Também existe a opção de definir se o repasse incide apenas sobre o principal ou sobre o total recebido com acréscimos. O cadastro pessoal do corretor fica em Corretores e recebedores.",
    "keywords": [
      "corretor",
      "comissão",
      "repasse",
      "acréscimos",
      "juros",
      "multa"
    ],
    "routes": [
      "/vendas",
      "/recebedores"
    ],
    "target": {
      "label": "Abrir Corretores e recebedores",
      "href": "/recebedores"
    }
  },
  {
    "id": "venda-editar",
    "title": "Editar uma venda",
    "questions": [
      "Como editar uma venda?",
      "Onde altero o corretor da venda?",
      "Posso mudar as regras de juros de uma venda?",
      "Quais dados da venda posso corrigir?",
      "Como abrir a edição do contrato?"
    ],
    "answer": "Abra Vendas, entre no contrato e clique em Editar venda. Conforme o histórico e suas permissões, você pode corrigir dados como corretor, comissão, regras de inadimplência e observações. Campos financeiros estruturais ficam mais restritos depois que existem recebimentos.",
    "keywords": [
      "editar venda",
      "corretor",
      "comissão",
      "juros",
      "contrato"
    ],
    "routes": [
      "/vendas"
    ],
    "target": {
      "label": "Abrir Vendas",
      "href": "/vendas"
    }
  },
  {
    "id": "venda-excluir",
    "title": "Excluir uma venda",
    "questions": [
      "Como excluir uma venda?",
      "Onde fica o botão Excluir venda?",
      "Por que não aparece a opção de excluir?",
      "O que acontece com as parcelas quando excluo a venda?",
      "Posso excluir uma venda que já recebeu pagamento?"
    ],
    "answer": "Abra a venda e use Excluir venda, desde que seu usuário tenha a permissão VENDAS_EXCLUIR. Ao confirmar, a composição e as parcelas são removidas e a unidade volta para Disponível. Vendas que já possuem histórico de recebimentos não podem ser excluídas.",
    "keywords": [
      "excluir venda",
      "apagar venda",
      "deletar venda",
      "VENDAS_EXCLUIR",
      "histórico recebimentos"
    ],
    "routes": [
      "/vendas"
    ],
    "target": {
      "label": "Abrir Vendas",
      "href": "/vendas"
    }
  },
  {
    "id": "venda-bloqueios",
    "title": "Campos bloqueados depois do recebimento",
    "questions": [
      "Por que não consigo alterar o valor total da venda?",
      "Por que a composição da venda está bloqueada?",
      "Por que não consigo trocar o comprador depois de receber?",
      "O que fica bloqueado após o primeiro recebimento?",
      "Ainda posso alterar juros depois de já ter recebido parcelas?"
    ],
    "answer": "Depois que a venda possui recebimentos, comprador, valor total e composição ficam bloqueados para preservar o histórico. Ainda é possível ajustar informações permitidas, como corretor, comissão e regras de juros, correção, multa e tolerância para parcelas ainda abertas.",
    "keywords": [
      "bloqueado",
      "recebimento",
      "valor total",
      "comprador",
      "composição",
      "juros"
    ],
    "routes": [
      "/vendas"
    ]
  },
  {
    "id": "venda-historico",
    "title": "Histórico da venda",
    "questions": [
      "Onde vejo quem alterou uma venda?",
      "Existe histórico de alterações do contrato?",
      "Consigo ver a data e hora de uma edição?",
      "Como saber quais campos de uma venda foram alterados?",
      "Por que não vejo o histórico da venda?"
    ],
    "answer": "Na venda existe uma área de Histórico de alterações que registra criação e edições, incluindo usuário, data/hora e campos alterados. A visualização depende da permissão de histórico de vendas do usuário.",
    "keywords": [
      "histórico venda",
      "alterações",
      "usuário",
      "data hora",
      "VENDAS_HISTORICO_VISUALIZAR"
    ],
    "routes": [
      "/vendas"
    ]
  },
  {
    "id": "parcelas-consultar",
    "title": "Consultar parcelas",
    "questions": [
      "Onde vejo todas as parcelas?",
      "Como procurar uma parcela pelo cliente?",
      "Posso filtrar parcelas por empreendimento?",
      "Como filtrar parcelas por status?",
      "Onde vejo o total previsto e recebido?"
    ],
    "answer": "Abra Parcelas. A tela permite filtrar por empreendimento, status e busca por cliente, empreendimento, unidade, matrícula, corretor ou descrição. Ela também resume total previsto, total recebido e valores em atraso atualizados.",
    "keywords": [
      "parcelas",
      "filtro",
      "status",
      "cliente",
      "matrícula",
      "total previsto"
    ],
    "routes": [
      "/parcelas"
    ],
    "target": {
      "label": "Abrir Parcelas",
      "href": "/parcelas"
    }
  },
  {
    "id": "parcelas-status",
    "title": "Status das parcelas",
    "questions": [
      "O que significa parcela pendente?",
      "O que significa parcela vencida?",
      "O que significa parcela paga?",
      "O que significa parcela cancelada?",
      "O que significa parcela em acordo?"
    ],
    "answer": "Os status indicam a situação atual da obrigação. Pendente ainda está em aberto; Vencida está em atraso; Paga tem recebimento registrado; Cancelada não está ativa para cobrança; Em acordo indica que a parcela original foi preservada como parte de uma renegociação e não deve ser tratada como cobrança ativa normal.",
    "keywords": [
      "pendente",
      "vencida",
      "paga",
      "cancelada",
      "em acordo"
    ],
    "routes": [
      "/parcelas"
    ]
  },
  {
    "id": "recebimentos-localizar",
    "title": "Localizar recebimento",
    "questions": [
      "Como encontro uma parcela para receber?",
      "Como buscar um recebimento pelo nome do cliente?",
      "Posso procurar pela matrícula?",
      "Como vejo só entradas ou só parcelas?",
      "Por que as parcelas aparecem agrupadas por venda?"
    ],
    "answer": "Na Central de Recebimentos, use os filtros por empreendimento e origem e a busca por cliente, empreendimento, unidade, matrícula ou corretor. As parcelas ficam agrupadas por venda para evitar que recebimentos de contratos diferentes se misturem. Abra Ver parcelas no bloco do contrato.",
    "keywords": [
      "central recebimentos",
      "buscar",
      "matrícula",
      "entrada",
      "parcelas",
      "agrupadas"
    ],
    "routes": [
      "/recebimentos"
    ],
    "target": {
      "label": "Abrir Central de Recebimentos",
      "href": "/recebimentos"
    }
  },
  {
    "id": "recebimentos-registrar",
    "title": "Registrar recebimento",
    "questions": [
      "Como dar baixa em uma parcela?",
      "Como registrar um recebimento?",
      "Onde clico para receber uma parcela?",
      "O que acontece ao confirmar o recebimento?",
      "O sistema faz a distribuição financeira automaticamente?"
    ],
    "answer": "Na Central de Recebimentos, abra o contrato, clique em Receber na parcela desejada, confira o valor, informe a data do recebimento e confirme. O sistema registra a quitação e executa a distribuição financeira prevista, reservando tributo, aplicando comissão e distribuindo o saldo conforme as regras congeladas.",
    "keywords": [
      "dar baixa",
      "receber parcela",
      "confirmar recebimento",
      "distribuição financeira",
      "tributo",
      "comissão"
    ],
    "routes": [
      "/recebimentos"
    ],
    "target": {
      "label": "Abrir Central de Recebimentos",
      "href": "/recebimentos"
    }
  },
  {
    "id": "recebimentos-data-real",
    "title": "Data real do pagamento",
    "questions": [
      "Como registrar um pagamento antigo?",
      "Qual data devo informar na baixa?",
      "Posso lançar hoje um pagamento que aconteceu antes?",
      "Juros devem usar a data do lançamento ou a data paga?",
      "Como fazer uma baixa retroativa?"
    ],
    "answer": "Informe a data em que o pagamento realmente aconteceu. Para uma baixa retroativa, os cálculos e o histórico devem considerar a data efetiva do pagamento, não simplesmente a data em que você está digitando o lançamento hoje.",
    "keywords": [
      "pagamento antigo",
      "data real",
      "data efetiva",
      "retroativo",
      "baixa"
    ],
    "routes": [
      "/recebimentos",
      "/vendas"
    ]
  },
  {
    "id": "inadimplencia-calculo",
    "title": "Juros, correção e multa",
    "questions": [
      "Por que uma parcela vencida ficou mais cara?",
      "Como o sistema calcula juros por atraso?",
      "Onde vejo correção, juros e multa separados?",
      "A tolerância interfere no cálculo?",
      "Por que o valor atualizado muda conforme a data?"
    ],
    "answer": "Parcelas vencidas são atualizadas conforme as regras congeladas no contrato, que podem incluir correção, juros, multa/mora e tolerância. Ao receber uma parcela atrasada, a Central de Recebimentos mostra o valor original e os acréscimos que formam o total atualizado.",
    "keywords": [
      "juros",
      "multa",
      "mora",
      "correção",
      "tolerância",
      "valor atualizado"
    ],
    "routes": [
      "/recebimentos",
      "/inadimplencia",
      "/parcelas"
    ]
  },
  {
    "id": "recebimentos-reverter",
    "title": "Reverter recebimento",
    "questions": [
      "Como desfazer uma baixa?",
      "Como reverter uma parcela paga por engano?",
      "Existe estorno de recebimento?",
      "Marquei a parcela como paga errado, o que faço?",
      "Onde fica o botão Reverter?"
    ],
    "answer": "Na tela Parcelas, localize a parcela com status Paga e use Reverter. Essa ação desfaz o recebimento registrado. Use-a somente quando a baixa realmente estiver incorreta, porque isso afeta o histórico financeiro relacionado.",
    "keywords": [
      "reverter",
      "estornar",
      "desfazer baixa",
      "paga por engano"
    ],
    "routes": [
      "/parcelas"
    ],
    "target": {
      "label": "Abrir Parcelas",
      "href": "/parcelas"
    }
  },
  {
    "id": "recebimentos-parcial",
    "title": "Pagamento parcial",
    "questions": [
      "Posso dar baixa parcial em uma parcela?",
      "O sistema aceita pagamento parcial?",
      "O cliente pagou só uma parte, como registro?",
      "Posso informar um valor menor que a parcela?",
      "Uma baixa parcial mantém saldo na mesma parcela?"
    ],
    "answer": "No fluxo atual, pagamento parcial ainda não está habilitado na Central de Recebimentos. A confirmação quita a parcela integralmente. Se o cliente pagou só uma parte, não registre a quitação total como se estivesse completa; trate o caso antes de lançar para não distorcer o histórico.",
    "keywords": [
      "pagamento parcial",
      "baixa parcial",
      "valor menor",
      "saldo"
    ],
    "routes": [
      "/recebimentos",
      "/parcelas"
    ]
  },
  {
    "id": "inadimplencia-tela",
    "title": "Tela de inadimplência",
    "questions": [
      "Onde vejo clientes em atraso?",
      "Como consultar parcelas vencidas?",
      "Posso filtrar inadimplência por empreendimento?",
      "Como buscar um cliente inadimplente?",
      "A tela de inadimplência muda a regra dos contratos?"
    ],
    "answer": "Abra Inadimplência para consultar parcelas vencidas. Você pode filtrar por empreendimento e buscar cliente. Os filtros mudam apenas o que está sendo exibido; cada parcela continua sendo atualizada pelas regras congeladas em seu próprio contrato.",
    "keywords": [
      "inadimplência",
      "atraso",
      "vencidas",
      "filtro empreendimento",
      "cliente"
    ],
    "routes": [
      "/inadimplencia"
    ],
    "target": {
      "label": "Abrir Inadimplência",
      "href": "/inadimplencia"
    }
  },
  {
    "id": "reajuste-aplicar",
    "title": "Aplicar reajuste contratual",
    "questions": [
      "Como aplicar a correção anual?",
      "Onde lanço o índice do reajuste?",
      "Como o sistema calcula a próxima data de reajuste?",
      "O que significa maior entre percentual base e índice?",
      "Preciso informar o percentual apurado do índice?"
    ],
    "answer": "Na venda, quando houver regra de reajuste contratual, use a ação de reajuste. O sistema sugere a data de referência com base na periodicidade e no último reajuste ou na data do contrato. Informe o percentual apurado do índice no período; em regras do tipo maior entre, o contrato usa o maior valor entre o percentual base e o índice informado.",
    "keywords": [
      "reajuste",
      "correção anual",
      "índice",
      "percentual base",
      "periodicidade"
    ],
    "routes": [
      "/vendas",
      "/configuracoes"
    ]
  },
  {
    "id": "acordo-criar",
    "title": "Criar acordo",
    "questions": [
      "Como lançar um acordo?",
      "Como renegociar parcelas vencidas?",
      "Onde crio uma renegociação?",
      "Quais parcelas posso incluir no acordo?",
      "Como definir entrada e novas parcelas do acordo?"
    ],
    "answer": "Abra a venda e, na seção Acordos, use Lançar acordo quando houver parcelas elegíveis. Selecione as parcelas que originaram a negociação e informe as novas condições, como data do acordo, valor negociado, entrada, quantidade de parcelas, primeiro vencimento e observações. Depois confirme em Criar acordo.",
    "keywords": [
      "acordo",
      "renegociação",
      "parcelas elegíveis",
      "entrada",
      "novo parcelamento"
    ],
    "routes": [
      "/vendas"
    ]
  },
  {
    "id": "acordo-historico",
    "title": "Preservação das parcelas no acordo",
    "questions": [
      "O acordo apaga as parcelas antigas?",
      "O que acontece com as parcelas originais?",
      "Quais parcelas ficam ativas depois do acordo?",
      "Como o sistema preserva o histórico de uma renegociação?",
      "Por que aparece Em acordo nas parcelas antigas?"
    ],
    "answer": "As parcelas originais não são apagadas. Elas permanecem no histórico com status Em acordo, preservando a dívida e a rastreabilidade. Somente as novas parcelas geradas pelo acordo ficam ativas para cobrança.",
    "keywords": [
      "parcelas originais",
      "em acordo",
      "histórico",
      "novas parcelas",
      "renegociação"
    ],
    "routes": [
      "/vendas",
      "/parcelas"
    ]
  },
  {
    "id": "recebedores-cadastrar",
    "title": "Corretores e recebedores",
    "questions": [
      "Como cadastrar um corretor?",
      "Onde cadastro um sócio?",
      "Como cadastrar uma empresa recebedora?",
      "Quais dados posso guardar de um recebedor?",
      "Posso cadastrar chave PIX do corretor?"
    ],
    "answer": "Abra Corretores e recebedores. Cadastre Nome/Razão social e escolha o tipo Sócio, Empresa ou Corretor. Conforme o tipo, você pode informar CPF/CNPJ, CRECI, e-mail, telefone e chave PIX para repasse.",
    "keywords": [
      "corretor",
      "sócio",
      "empresa",
      "recebedor",
      "creci",
      "pix"
    ],
    "routes": [
      "/recebedores"
    ],
    "target": {
      "label": "Abrir Corretores e recebedores",
      "href": "/recebedores"
    }
  },
  {
    "id": "recebedores-remover",
    "title": "Editar ou remover recebedor",
    "questions": [
      "Como editar um corretor?",
      "Posso excluir um recebedor?",
      "Por que não consigo remover um corretor?",
      "O sistema deixa apagar corretor usado em venda?",
      "Como corrigir os dados de um sócio?"
    ],
    "answer": "Na tela Corretores e recebedores, edite o cadastro existente quando precisar corrigir dados. A remoção de corretor é protegida quando ele já está vinculado a uma venda, evitando quebrar o histórico. Nesses casos, prefira corrigir o cadastro em vez de apagá-lo.",
    "keywords": [
      "editar corretor",
      "remover corretor",
      "vinculado venda",
      "editar sócio"
    ],
    "routes": [
      "/recebedores"
    ],
    "target": {
      "label": "Abrir Corretores e recebedores",
      "href": "/recebedores"
    }
  },
  {
    "id": "comissoes-entender",
    "title": "Comissões de corretores",
    "questions": [
      "Como sei quanto o corretor tem a receber?",
      "Onde vejo a comissão total do corretor?",
      "Como vejo o que já foi repassado?",
      "O que significa saldo de comissão?",
      "Como acompanho comissão por contrato?"
    ],
    "answer": "Use o relatório Comissões a receber por corretor. Ele consolida por profissional a quantidade de contratos, comissão total, valor já repassado e saldo ainda a receber. As regras da venda e os recebimentos registrados alimentam esse acompanhamento.",
    "keywords": [
      "comissão",
      "corretor",
      "já repassado",
      "saldo",
      "contratos"
    ],
    "routes": [
      "/relatorios",
      "/vendas"
    ],
    "target": {
      "label": "Abrir Relatórios",
      "href": "/relatorios"
    }
  },
  {
    "id": "financeiro-distribuicao",
    "title": "Distribuição financeira e sócios",
    "questions": [
      "Onde vejo quanto ficou para o sócio?",
      "Como sei quanto ficou para a empresa?",
      "Onde acompanho tributos reservados?",
      "Como vejo as comissões pagas no financeiro?",
      "O Financeiro recalcula movimentos antigos quando mudo uma regra?"
    ],
    "answer": "Abra Financeiro para ver valores efetivamente registrados e a distribuição histórica. Tributos, comissões e repasses são lidos dos movimentos já gravados; o passado não é recalculado usando regras atuais. Isso preserva o que realmente aconteceu em cada recebimento.",
    "keywords": [
      "financeiro",
      "sócio",
      "empresa",
      "tributos",
      "comissões pagas",
      "histórico"
    ],
    "routes": [
      "/financeiro"
    ],
    "target": {
      "label": "Abrir Financeiro",
      "href": "/financeiro"
    }
  },
  {
    "id": "relatorios-tipos-filtros",
    "title": "Tipos e filtros de relatórios",
    "questions": [
      "Quais relatórios existem?",
      "Como filtro um relatório por período?",
      "Posso filtrar relatório por empreendimento?",
      "Qual relatório devo escolher?",
      "Por que o período fica desabilitado na carteira?"
    ],
    "answer": "Em Relatórios você encontra Recebimentos, Vendas, Comissões a receber por corretor, Sócios, Parcelas pagas por cliente e Carteira por empreendimento. É possível filtrar por empreendimento e, na maioria dos tipos, por data inicial e final. A Carteira mostra posição atual, por isso não usa período.",
    "keywords": [
      "relatórios",
      "filtro",
      "período",
      "empreendimento",
      "carteira"
    ],
    "routes": [
      "/relatorios"
    ],
    "target": {
      "label": "Abrir Relatórios",
      "href": "/relatorios"
    }
  },
  {
    "id": "relatorios-recebimentos-vendas",
    "title": "Relatórios de recebimentos e vendas",
    "questions": [
      "O que mostra o relatório de recebimentos?",
      "O que mostra o relatório de vendas?",
      "Onde vejo data e valor dos recebimentos?",
      "Onde vejo comprador, corretor e valor da venda?",
      "Como conferir vendas de um período?"
    ],
    "answer": "O relatório de Recebimentos mostra data, cliente, empreendimento, origem e valor pago. O relatório de Vendas mostra data do contrato, comprador, empreendimento, corretor e valor da venda. Use empreendimento e período para reduzir a consulta.",
    "keywords": [
      "relatório recebimentos",
      "relatório vendas",
      "comprador",
      "corretor",
      "valor pago"
    ],
    "routes": [
      "/relatorios"
    ],
    "target": {
      "label": "Abrir Relatórios",
      "href": "/relatorios"
    }
  },
  {
    "id": "relatorios-socios-clientes",
    "title": "Relatórios de sócios e clientes",
    "questions": [
      "Como gerar o relatório de sócios?",
      "Como ver parcelas pagas de um cliente?",
      "Onde vejo o bruto recebido e o valor do sócio?",
      "Como consultar juros e multa pagos por um cliente?",
      "Posso filtrar parcelas pagas por um cliente específico?"
    ],
    "answer": "Em Relatórios, Sócios mostra sócio, empreendimentos, quantidade de recebimentos, bruto recebido e valor destinado ao sócio. Parcelas pagas por cliente mostra pagamento, cliente, empreendimento, parcela, vencimento, valor original, juros/multa e valor pago, com filtro específico de cliente.",
    "keywords": [
      "relatório sócios",
      "parcelas pagas por cliente",
      "juros multa",
      "bruto recebido",
      "destinado sócio"
    ],
    "routes": [
      "/relatorios"
    ],
    "target": {
      "label": "Abrir Relatórios",
      "href": "/relatorios"
    }
  },
  {
    "id": "relatorios-carteira-exportar",
    "title": "Carteira e exportação",
    "questions": [
      "O que mostra Carteira por empreendimento?",
      "Onde vejo VGV, vendido, recebido e saldo?",
      "Como exportar um relatório em PDF?",
      "Como gerar Excel de um relatório?",
      "Posso imprimir o relatório direto do sistema?"
    ],
    "answer": "Carteira por empreendimento mostra VGV, total vendido, recebido e saldo por empreendimento. Depois de selecionar o tipo e os filtros, use os botões PDF, Excel ou Imprimir no topo da tela. A exportação usa os filtros atuais.",
    "keywords": [
      "carteira",
      "vgv",
      "pdf",
      "excel",
      "imprimir",
      "exportar"
    ],
    "routes": [
      "/relatorios"
    ],
    "target": {
      "label": "Abrir Relatórios",
      "href": "/relatorios"
    }
  },
  {
    "id": "configuracoes-empresa",
    "title": "Configurações da empresa",
    "questions": [
      "Onde altero os dados da empresa?",
      "Como mudar nome fantasia ou razão social?",
      "Onde informo CNPJ, telefone e e-mail da empresa?",
      "Para que servem as configurações padrão?",
      "Mudar a configuração altera contratos antigos?"
    ],
    "answer": "Abra Configurações para editar os dados básicos da empresa e valores padrão. Esses valores servem como ponto de partida para criar novos empreendimentos; não devem reescrever automaticamente o histórico de contratos e movimentos já registrados.",
    "keywords": [
      "configurações",
      "empresa",
      "nome fantasia",
      "razão social",
      "cnpj",
      "padrão"
    ],
    "routes": [
      "/configuracoes"
    ],
    "target": {
      "label": "Abrir Configurações",
      "href": "/configuracoes"
    }
  },
  {
    "id": "seguranca-auditoria",
    "title": "Segurança, auditoria e limites do assistente",
    "questions": [
      "O robô pode excluir uma venda por mim?",
      "O assistente consegue dar baixa sozinho?",
      "Onde vejo alterações administrativas?",
      "O robô pode mudar dados financeiros?",
      "O que faço se o assistente não souber uma resposta?"
    ],
    "answer": "O assistente orienta e indica caminhos, mas nesta versão não executa alterações financeiras, exclusões ou baixas sozinho. Para rastreabilidade administrativa, usuários autorizados podem consultar Auditoria. Se o assistente não tiver uma resposta segura, ele deve dizer isso em vez de inventar.",
    "keywords": [
      "assistente",
      "robô",
      "auditoria",
      "segurança",
      "alterar dados",
      "não sabe"
    ],
    "routes": [
      "/admin/auditoria"
    ],
    "target": {
      "label": "Abrir Auditoria",
      "href": "/admin/auditoria"
    }
  }
];
