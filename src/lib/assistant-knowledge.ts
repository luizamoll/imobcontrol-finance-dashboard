// Base de conhecimento do Assistente ImobControl — v1.
export type HelpTarget = {
  label: string;
  href: string;
};

export type HelpTopic = {
  id: string;
  title: string;
  questions: string[];
  answer: string;
  keywords: string[];
  routes?: string[];
  target?: HelpTarget;
};

export const helpTopics: HelpTopic[] = [
  {
    id: "primeiros-passos",
    title: "Primeiros passos no ImobControl",
    questions: [
      "Por onde eu começo?",
      "Como funciona o ImobControl?",
      "O que eu consigo fazer no sistema?"
    ],
    answer:
      "O ImobControl organiza a operação imobiliária em um fluxo simples: cadastre o empreendimento e suas unidades, registre clientes e vendas, acompanhe parcelas e recebimentos e use os relatórios para conferir a operação. O Dashboard resume os principais números e alertas.",
    keywords: ["começar", "inicio", "sistema", "fluxo", "usar", "primeiros passos"],
    routes: ["/"],
    target: { label: "Ir para o Dashboard", href: "/" }
  },
  {
    id: "login",
    title: "Acesso e login",
    questions: [
      "Não consigo entrar no sistema",
      "Minha senha não funciona",
      "Como recupero minha senha?"
    ],
    answer:
      "Na tela de login, confira se o e-mail está correto. Se a senha não funcionar, use a opção de recuperação de senha. Se o acesso foi criado por um administrador, ele também pode redefinir o acesso pela gestão da equipe. Nunca compartilhe sua senha definitiva com outras pessoas.",
    keywords: ["login", "senha", "acesso", "entrar", "esqueci", "recuperar"],
    routes: ["/login", "/recuperar-senha", "/redefinir-senha"],
    target: { label: "Recuperar senha", href: "/recuperar-senha" }
  },
  {
    id: "perfis-permissoes",
    title: "Perfis e permissões",
    questions: [
      "Por que não aparece uma opção para mim?",
      "Como funcionam as permissões?",
      "Qual a diferença entre os perfis?"
    ],
    answer:
      "As telas e ações disponíveis dependem do perfil e das permissões atribuídas ao usuário. Super Admin administra o ambiente geral; Admin gerencia a operação da empresa; usuários da equipe podem ter acessos específicos. Se uma opção não aparece, primeiro confirme se seu perfil possui a permissão necessária.",
    keywords: ["perfil", "permissão", "permissoes", "admin", "super admin", "usuario", "acesso"],
    routes: ["/equipe", "/admin", "/admin/usuarios"],
    target: { label: "Ver equipe e acessos", href: "/equipe" }
  },
  {
    id: "dashboard",
    title: "Dashboard",
    questions: [
      "O que aparece no Dashboard?",
      "Como acompanho a situação geral?",
      "Onde vejo um resumo da operação?"
    ],
    answer:
      "O Dashboard é o ponto de visão geral da operação. Use-o para acompanhar indicadores, recebimentos, movimentações e alertas antes de entrar nos módulos detalhados.",
    keywords: ["dashboard", "painel", "resumo", "indicadores", "visão geral"],
    routes: ["/"],
    target: { label: "Abrir Dashboard", href: "/" }
  },
  {
    id: "empreendimentos",
    title: "Empreendimentos",
    questions: [
      "Como cadastro um empreendimento?",
      "Onde altero os dados do empreendimento?",
      "Como vejo as unidades de um empreendimento?"
    ],
    answer:
      "Em Empreendimentos você cadastra e acompanha cada projeto imobiliário. Ali ficam dados como nome, SPE/CNPJ, tipo, valores, sócio, percentuais e regras operacionais. Ao abrir um empreendimento, você também consegue consultar seus agrupamentos e unidades.",
    keywords: ["empreendimento", "spe", "cnpj", "projeto", "loteamento", "cadastro"],
    routes: ["/empreendimentos"],
    target: { label: "Abrir Empreendimentos", href: "/empreendimentos" }
  },
  {
    id: "unidades-gleba",
    title: "Unidades, lotes e glebas",
    questions: [
      "Como cadastro uma gleba?",
      "Quais tipos de unidade existem?",
      "Onde cadastro um lote ou unidade?"
    ],
    answer:
      "As unidades pertencem a um empreendimento e podem representar lote, gleba, apartamento, sala, casa, loja ou outro tipo. O tipo Gleba está disponível para operações que precisam tratar esse formato separadamente. A unidade também guarda área, valor de venda e situação como disponível, reservada ou vendida.",
    keywords: ["gleba", "unidade", "lote", "apartamento", "sala", "casa", "loja", "matricula"],
    routes: ["/empreendimentos"]
  },
  {
    id: "clientes",
    title: "Clientes",
    questions: [
      "Como cadastro um cliente?",
      "Onde encontro um cliente?",
      "Como consulto os dados de um comprador?"
    ],
    answer:
      "Use a área Clientes para cadastrar e localizar compradores. O vínculo do cliente com vendas e parcelas permite acompanhar sua operação financeira e usar relatórios específicos por cliente.",
    keywords: ["cliente", "comprador", "cadastro", "cpf", "dados"],
    routes: ["/clientes"],
    target: { label: "Abrir Clientes", href: "/clientes" }
  },
  {
    id: "venda-excluir",
    title: "Excluir uma venda",
    questions: [
      "Como excluir uma venda?",
      "Onde excluo uma venda?",
      "Por que não consigo excluir uma venda?"
    ],
    answer:
      "Abra Vendas, entre na venda que deseja excluir e, no topo da tela, clique em Excluir venda. Confirme em Sim, excluir venda. Ao excluir, a composição e as parcelas dessa venda são removidas e a unidade volta para Disponível. Se a venda já possui histórico de recebimentos, ela não pode ser excluída. Se o botão Excluir venda não aparecer, confirme se o seu usuário possui a permissão VENDAS_EXCLUIR.",
    keywords: ["excluir venda", "apagar venda", "remover venda", "deletar venda", "vendas excluir", "historico de recebimentos"],
    routes: ["/vendas"],
    target: { label: "Abrir Vendas", href: "/vendas" }
  },
  {
    id: "venda-editar",
    title: "Editar uma venda",
    questions: [
      "Como edito uma venda?",
      "O que posso alterar em uma venda?",
      "Por que alguns campos da venda estão bloqueados?"
    ],
    answer:
      "Abra Vendas, entre na venda desejada e clique em Editar venda. Antes do primeiro recebimento, é possível ajustar os dados permitidos da venda e sua composição. Depois que existem recebimentos registrados, o comprador, o valor total do contrato e a composição do pagamento ficam bloqueados para preservar o histórico. Corretor, comissão, regras de juros, correção, multa e tolerância continuam ajustáveis para parcelas ainda abertas, conforme as permissões do usuário.",
    keywords: ["editar venda", "alterar venda", "campos bloqueados", "primeiro recebimento", "composição bloqueada", "comprador bloqueado"],
    routes: ["/vendas"],
    target: { label: "Abrir Vendas", href: "/vendas" }
  },
  {
    id: "venda-permissoes",
    title: "Permissões de vendas",
    questions: [
      "Por que não aparece o botão de excluir venda?",
      "Por que não consigo editar uma venda?",
      "Quem pode excluir ou editar vendas?"
    ],
    answer:
      "As ações de venda dependem das permissões do usuário. Para editar, o perfil precisa da permissão VENDAS_EDITAR; para excluir, precisa de VENDAS_EXCLUIR. Se o botão não aparece, peça a um administrador para conferir o acesso em Equipe e acessos.",
    keywords: ["vendas editar", "vendas excluir", "permissão venda", "botão excluir", "botão editar"],
    routes: ["/vendas", "/equipe"],
    target: { label: "Ver equipe e acessos", href: "/equipe" }
  },
  {
    id: "venda-cadastro",
    title: "Cadastro de venda",
    questions: [
      "Como faço uma venda?",
      "Como cadastro um contrato?",
      "Como vinculo um cliente a uma unidade?"
    ],
    answer:
      "Para registrar uma venda, selecione o cliente/comprador, o empreendimento e a unidade, informe as condições financeiras, corretor e regras aplicáveis e confirme os dados antes de salvar. A venda passa a concentrar o contrato, a composição de pagamento e as parcelas geradas.",
    keywords: ["venda", "contrato", "comprador", "unidade", "cadastrar venda"],
    routes: ["/vendas"],
    target: { label: "Abrir Vendas", href: "/vendas" }
  },
  {
    id: "formas-pagamento",
    title: "Formas e composição de pagamento",
    questions: [
      "Quais formas de pagamento posso usar?",
      "Posso registrar sinal e parcelas?",
      "Posso usar um bem como parte do pagamento?"
    ],
    answer:
      "A composição da venda pode incluir pagamento à vista, sinal, sinal parcelado, parcelas, parcelas personalizadas, acordo, bem material, venda sem sinal ou outros itens. Cada item pode ter valor, quantidade de parcelas, primeiro vencimento e observações.",
    keywords: ["pagamento", "sinal", "parcelas", "bem", "entrada", "avista", "composição"],
    routes: ["/vendas"]
  },
  {
    id: "parcelas",
    title: "Parcelas",
    questions: [
      "Onde vejo as parcelas?",
      "O que significam os status das parcelas?",
      "Como acompanho parcelas pendentes?"
    ],
    answer:
      "A área Parcelas reúne as parcelas da operação. Elas podem ficar pendentes, pagas, vencidas, em acordo ou canceladas. Use essa tela para consultar vencimentos, valores e a situação financeira ligada a cada venda.",
    keywords: ["parcela", "parcelas", "pendente", "paga", "vencida", "acordo", "cancelada"],
    routes: ["/parcelas"],
    target: { label: "Abrir Parcelas", href: "/parcelas" }
  },
  {
    id: "recebimento-baixa",
    title: "Baixa de recebimento",
    questions: [
      "Como dou baixa em uma parcela?",
      "Como registro um recebimento?",
      "Onde recebo uma parcela?"
    ],
    answer:
      "Na Central de Recebimentos, localize a parcela pelo cliente, empreendimento ou venda, abra a baixa e informe o valor e a data efetiva do pagamento. O sistema usa esse registro para atualizar a parcela e as movimentações financeiras relacionadas.",
    keywords: ["baixa", "receber", "recebimento", "pagar", "pagamento", "central"],
    routes: ["/recebimentos"],
    target: { label: "Abrir Central de Recebimentos", href: "/recebimentos" }
  },
  {
    id: "pagamento-retroativo",
    title: "Pagamento feito em data anterior",
    questions: [
      "Como baixo uma parcela paga em outra data?",
      "Como registrar um pagamento antigo?",
      "A baixa usa a data de hoje ou a data do pagamento?"
    ],
    answer:
      "Informe a data em que o pagamento realmente aconteceu. Para uma baixa retroativa, os cálculos e registros devem considerar a data efetiva do pagamento, e não apenas o dia em que você está lançando a informação no sistema.",
    keywords: ["retroativo", "antigo", "data", "pagamento", "baixa", "data efetiva"],
    routes: ["/recebimentos", "/parcelas"]
  },
  {
    id: "inadimplencia-calculo",
    title: "Juros, multa e inadimplência",
    questions: [
      "Por que a parcela está com juros?",
      "Como funciona a multa por atraso?",
      "Como o sistema calcula uma parcela vencida?"
    ],
    answer:
      "As regras de inadimplência podem considerar correção, juros, multa e tolerância. Elas são configuradas para a operação e aplicadas às parcelas vencidas conforme as regras vigentes do contrato. Antes de alterar um valor, confira a regra do empreendimento ou da venda.",
    keywords: ["juros", "multa", "mora", "atraso", "inadimplencia", "vencida", "correção"],
    routes: ["/recebimentos", "/parcelas", "/inadimplencia", "/configuracoes"],
    target: { label: "Abrir Inadimplência", href: "/inadimplencia" }
  },
  {
    id: "reajuste-anual",
    title: "Correção e reajuste contratual",
    questions: [
      "Como funciona a correção anual?",
      "Onde configuro o reajuste do contrato?",
      "O sistema aceita índice de correção?"
    ],
    answer:
      "O ImobControl possui regras de reajuste contratual que podem trabalhar com percentual fixo, índice de referência ou outras modalidades previstas na operação. A periodicidade pode ser configurada, inclusive em ciclos anuais de 12 meses. Sempre confira a regra definida para o contrato antes de interpretar o valor atualizado.",
    keywords: ["correção anual", "reajuste", "indice", "índice", "percentual", "12 meses", "contrato"],
    routes: ["/configuracoes", "/empreendimentos", "/vendas"]
  },
  {
    id: "acordos",
    title: "Acordos",
    questions: [
      "Como funciona um acordo?",
      "O que acontece com as parcelas antigas no acordo?",
      "As parcelas originais são apagadas?"
    ],
    answer:
      "Ao formalizar um acordo, as parcelas originais não devem desaparecer do histórico. Elas permanecem identificadas como parcelas em acordo, preservando a rastreabilidade, enquanto a nova composição do acordo passa a representar as condições renegociadas.",
    keywords: ["acordo", "renegociação", "renegociar", "parcelas antigas", "em acordo"],
    routes: ["/parcelas", "/recebimentos", "/vendas"]
  },
  {
    id: "inadimplencia-tela",
    title: "Acompanhamento da inadimplência",
    questions: [
      "Onde vejo clientes em atraso?",
      "Como acompanho parcelas vencidas?",
      "Onde vejo a inadimplência?"
    ],
    answer:
      "Use a área Inadimplência para concentrar a visão das obrigações vencidas. Ela ajuda a separar o que está em atraso da operação regular e facilita a conferência antes de uma cobrança, baixa ou negociação.",
    keywords: ["inadimplencia", "atraso", "vencidas", "cobrança", "devedor"],
    routes: ["/inadimplencia"],
    target: { label: "Abrir Inadimplência", href: "/inadimplencia" }
  },
  {
    id: "comissoes",
    title: "Comissões de corretores",
    questions: [
      "Como funciona a comissão do corretor?",
      "Onde vejo comissão a receber?",
      "Como sei quanto já foi repassado ao corretor?"
    ],
    answer:
      "A comissão é vinculada às regras da venda e aos recebimentos. O sistema consegue acompanhar comissão total, valores já repassados e saldo a receber. O relatório de comissões a receber por corretor consolida essas informações por profissional.",
    keywords: ["comissão", "comissoes", "corretor", "repasse", "saldo", "a receber"],
    routes: ["/recebedores", "/relatorios", "/vendas"],
    target: { label: "Abrir Relatórios", href: "/relatorios" }
  },
  {
    id: "socios-distribuicao",
    title: "Sócios e distribuição financeira",
    questions: [
      "Como acompanho o valor do sócio?",
      "Onde vejo quanto foi destinado ao sócio?",
      "Como funciona a divisão entre empresa e sócio?"
    ],
    answer:
      "As regras da operação podem definir sócio, percentual do sócio e percentual da empresa. Quando um recebimento é registrado, a movimentação financeira preserva os valores destinados a cada parte, permitindo conferência posterior nos relatórios.",
    keywords: ["socio", "sócio", "empresa", "percentual", "distribuição", "destinado"],
    routes: ["/financeiro", "/recebedores", "/relatorios"]
  },
  {
    id: "relatorios-geral",
    title: "Relatórios disponíveis",
    questions: [
      "Quais relatórios existem?",
      "Qual relatório devo usar?",
      "Como filtro um relatório?"
    ],
    answer:
      "A área Relatórios reúne visões de Recebimentos, Vendas, Comissões a receber por corretor, Sócios, Parcelas pagas por cliente e Carteira por empreendimento. Você pode combinar filtros de empreendimento e período; alguns relatórios também oferecem filtro específico de cliente.",
    keywords: ["relatorio", "relatórios", "filtro", "vendas", "recebimentos", "carteira", "socios"],
    routes: ["/relatorios"],
    target: { label: "Abrir Relatórios", href: "/relatorios" }
  },
  {
    id: "relatorio-socios",
    title: "Relatório de sócios",
    questions: [
      "Como gero o relatório de sócios?",
      "O que mostra o relatório de sócios?",
      "Onde vejo os recebimentos destinados aos sócios?"
    ],
    answer:
      "Em Relatórios, escolha o tipo Sócios. O relatório consolida o sócio, os empreendimentos relacionados, a quantidade de recebimentos, o bruto recebido e o valor destinado ao sócio. Use os filtros de empreendimento e período para reduzir a consulta.",
    keywords: ["relatorio socios", "sócios", "bruto", "destinado", "empreendimentos"],
    routes: ["/relatorios"],
    target: { label: "Abrir Relatórios", href: "/relatorios" }
  },
  {
    id: "relatorio-parcelas-cliente",
    title: "Parcelas pagas por cliente",
    questions: [
      "Como vejo as parcelas pagas de um cliente?",
      "Onde vejo o histórico de pagamentos do cliente?",
      "Como gero parcelas pagas por cliente?"
    ],
    answer:
      "Em Relatórios, escolha Parcelas pagas por cliente. Você pode filtrar por empreendimento, cliente e período. A tabela mostra pagamento, cliente, empreendimento, número da parcela, vencimento, valor original, juros/multa e valor pago.",
    keywords: ["parcelas pagas", "cliente", "historico", "pagamentos", "relatorio cliente"],
    routes: ["/relatorios"],
    target: { label: "Abrir Relatórios", href: "/relatorios" }
  },
  {
    id: "exportar-relatorio",
    title: "Exportação de relatórios",
    questions: [
      "Como exporto um relatório?",
      "Posso gerar PDF ou Excel?",
      "Como imprimo um relatório?"
    ],
    answer:
      "Depois de escolher o tipo de relatório e aplicar os filtros, use as ações disponíveis no topo para exportar ou imprimir. Sempre confira os filtros e os dados exibidos antes de gerar o arquivo final.",
    keywords: ["exportar", "pdf", "excel", "imprimir", "download", "relatorio"],
    routes: ["/relatorios"]
  },
  {
    id: "financeiro",
    title: "Financeiro",
    questions: [
      "O que encontro na área Financeiro?",
      "Onde acompanho as movimentações?",
      "Como vejo a distribuição dos recebimentos?"
    ],
    answer:
      "A área Financeiro concentra a visão das movimentações geradas pela operação. Use-a para conferir valores recebidos e sua distribuição conforme impostos, comissão, empresa e sócio, respeitando as regras registradas.",
    keywords: ["financeiro", "movimentação", "movimentos", "imposto", "empresa", "socio", "comissão"],
    routes: ["/financeiro"],
    target: { label: "Abrir Financeiro", href: "/financeiro" }
  },
  {
    id: "recebedores",
    title: "Corretores e recebedores",
    questions: [
      "Onde cadastro um corretor?",
      "Onde ficam os recebedores?",
      "Como consulto dados de corretor ou sócio?"
    ],
    answer:
      "A área Corretores e recebedores concentra os cadastros auxiliares de pessoas ligadas aos repasses, como corretor, sócio e empresa. Dependendo do perfil, essa área pode exigir permissão de configuração.",
    keywords: ["corretor", "recebedor", "socio", "empresa", "cadastro", "repasse"],
    routes: ["/recebedores"],
    target: { label: "Abrir Corretores e recebedores", href: "/recebedores" }
  },
  {
    id: "equipe",
    title: "Equipe e acessos",
    questions: [
      "Como crio um usuário?",
      "Como redefino o acesso de alguém?",
      "Como altero as permissões da equipe?"
    ],
    answer:
      "Em Equipe e acessos, administradores podem gerenciar usuários da empresa, seus perfis e permissões. Para alguém que já possui conta e não consegue entrar, prefira redefinir o acesso existente em vez de criar um usuário duplicado.",
    keywords: ["equipe", "usuario", "usuário", "acesso", "permissão", "redefinir", "senha"],
    routes: ["/equipe"],
    target: { label: "Abrir Equipe e acessos", href: "/equipe" }
  },
  {
    id: "minha-conta",
    title: "Minha conta",
    questions: [
      "Onde altero meus dados?",
      "Onde fica minha conta?",
      "Como troco minha senha depois de entrar?"
    ],
    answer:
      "Use Minha conta para consultar e ajustar os dados do seu próprio acesso quando essa opção estiver disponível. Senhas temporárias devem ser substituídas por uma senha definitiva do próprio usuário.",
    keywords: ["minha conta", "senha", "dados", "perfil", "conta"],
    routes: ["/conta"],
    target: { label: "Abrir Minha conta", href: "/conta" }
  },
  {
    id: "auditoria",
    title: "Auditoria administrativa",
    questions: [
      "Onde vejo alterações feitas no sistema?",
      "Existe histórico de ações?",
      "Como consultar a auditoria?"
    ],
    answer:
      "O ambiente administrativo possui uma área de auditoria para apoiar a rastreabilidade das ações e alterações registradas. O acesso depende do perfil administrativo.",
    keywords: ["auditoria", "historico", "histórico", "alterações", "ações", "admin"],
    routes: ["/admin/auditoria"],
    target: { label: "Abrir Auditoria", href: "/admin/auditoria" }
  },
  {
    id: "seguranca-assistente",
    title: "O que o assistente pode fazer",
    questions: [
      "Você consegue alterar dados por mim?",
      "O robô pode dar baixa em uma parcela?",
      "O assistente pode excluir uma venda?"
    ],
    answer:
      "Nesta versão, eu sou um guia do ImobControl. Posso explicar telas, regras e caminhos, mas não altero dados financeiros, não excluo registros e não faço baixas sozinho. Isso evita ações acidentais e mantém as operações críticas sob confirmação humana.",
    keywords: ["robo", "robô", "assistente", "alterar", "excluir", "baixa", "segurança", "fazer por mim"]
  }
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function routeMatches(topic: HelpTopic, currentPath: string) {
  return topic.routes?.some((route) =>
    route === "/" ? currentPath === "/" : currentPath.startsWith(route)
  );
}

export function getContextSuggestions(currentPath: string, limit = 5) {
  const contextual = helpTopics
    .filter((topic) => routeMatches(topic, currentPath))
    .flatMap((topic) => topic.questions);

  const fallback = [
    "Por onde eu começo?",
    "Como faço uma venda?",
    "Como dou baixa em uma parcela?",
    "Como funciona a correção anual?",
    "Qual relatório devo usar?"
  ];

  return [...new Set([...contextual, ...fallback])].slice(0, limit);
}

export function findHelpAnswer(query: string, currentPath: string) {
  const normalizedQuery = normalize(query);
  const words = normalizedQuery.split(/\s+/).filter((word) => word.length > 2);

  const ranked = helpTopics
    .map((topic) => {
      const title = normalize(topic.title);
      const questions = normalize(topic.questions.join(" "));
      const keywords = normalize(topic.keywords.join(" "));
      const answer = normalize(topic.answer);
      let score = 0;

      if (title.includes(normalizedQuery)) score += 12;
      if (questions.includes(normalizedQuery)) score += 14;
      if (keywords.includes(normalizedQuery)) score += 10;

      for (const word of words) {
        if (title.includes(word)) score += 4;
        if (questions.includes(word)) score += 5;
        if (keywords.includes(word)) score += 6;
        if (answer.includes(word)) score += 1;
      }

      if (routeMatches(topic, currentPath)) score += 3;
      return { topic, score };
    })
    .sort((a, b) => b.score - a.score);

  if (!normalizedQuery || !ranked[0] || ranked[0].score < 4) {
    return {
      title: "Ainda não encontrei essa dúvida",
      answer:
        "Não encontrei uma orientação segura para essa pergunta na base do ImobControl. Tente explicar com outras palavras ou escolha uma das perguntas sugeridas. Se for uma regra específica da sua operação, confirme com o responsável antes de alterar dados.",
      target: undefined as HelpTarget | undefined
    };
  }

  return {
    title: ranked[0].topic.title,
    answer: ranked[0].topic.answer,
    target: ranked[0].topic.target
  };
}
