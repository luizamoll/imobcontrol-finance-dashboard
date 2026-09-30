import type { AuthUsuario } from "@/lib/auth";

export type PermissaoUsuario =
  | "CLIENTES_VISUALIZAR"
  | "CLIENTES_GERENCIAR"
  | "EMPREENDIMENTOS_VISUALIZAR"
  | "EMPREENDIMENTOS_GERENCIAR"
  | "VENDAS_VISUALIZAR"
  | "VENDAS_CRIAR"
  | "VENDAS_EDITAR"
  | "VENDAS_EXCLUIR"
  | "VENDAS_GERENCIAR"
  | "RECEBIMENTOS_VISUALIZAR"
  | "RECEBIMENTOS_REGISTRAR"
  | "RECEBIMENTOS_ESTORNAR"
  | "FINANCEIRO_VISUALIZAR"
  | "RELATORIOS_VISUALIZAR"
  | "CONFIGURACOES_GERENCIAR"
  | "EQUIPE_GERENCIAR";

export const TODAS_PERMISSOES: PermissaoUsuario[] = [
  "CLIENTES_VISUALIZAR",
  "CLIENTES_GERENCIAR",
  "EMPREENDIMENTOS_VISUALIZAR",
  "EMPREENDIMENTOS_GERENCIAR",
  "VENDAS_VISUALIZAR",
  "VENDAS_CRIAR",
  "VENDAS_EDITAR",
  "VENDAS_EXCLUIR",
  "RECEBIMENTOS_VISUALIZAR",
  "RECEBIMENTOS_REGISTRAR",
  "RECEBIMENTOS_ESTORNAR",
  "FINANCEIRO_VISUALIZAR",
  "RELATORIOS_VISUALIZAR",
  "CONFIGURACOES_GERENCIAR",
  "EQUIPE_GERENCIAR",
];

export const GRUPOS_PERMISSOES: Array<{
  titulo: string;
  descricao: string;
  itens: Array<{ id: PermissaoUsuario; label: string }>;
}> = [
  {
    titulo: "Clientes",
    descricao: "Consulta e manutenção da carteira de clientes.",
    itens: [
      { id: "CLIENTES_VISUALIZAR", label: "Visualizar clientes" },
      { id: "CLIENTES_GERENCIAR", label: "Cadastrar e editar clientes" },
    ],
  },
  {
    titulo: "Empreendimentos",
    descricao: "Projetos, quadras, unidades e regras da operação.",
    itens: [
      { id: "EMPREENDIMENTOS_VISUALIZAR", label: "Visualizar empreendimentos" },
      { id: "EMPREENDIMENTOS_GERENCIAR", label: "Cadastrar e editar empreendimentos e unidades" },
    ],
  },
  {
    titulo: "Vendas",
    descricao: "Contratos, compradores e composição das vendas.",
    itens: [
      { id: "VENDAS_VISUALIZAR", label: "Visualizar vendas" },
      { id: "VENDAS_CRIAR", label: "Cadastrar novas vendas" },
      { id: "VENDAS_EDITAR", label: "Editar vendas" },
      { id: "VENDAS_EXCLUIR", label: "Excluir vendas" },
    ],
  },
  {
    titulo: "Recebimentos",
    descricao: "Parcelas, baixas e correções de lançamentos.",
    itens: [
      { id: "RECEBIMENTOS_VISUALIZAR", label: "Visualizar parcelas e recebimentos" },
      { id: "RECEBIMENTOS_REGISTRAR", label: "Registrar recebimentos" },
      { id: "RECEBIMENTOS_ESTORNAR", label: "Estornar recebimentos" },
    ],
  },
  {
    titulo: "Gestão",
    descricao: "Visões financeiras, relatórios e configurações.",
    itens: [
      { id: "FINANCEIRO_VISUALIZAR", label: "Visualizar financeiro" },
      { id: "RELATORIOS_VISUALIZAR", label: "Visualizar relatórios" },
      { id: "CONFIGURACOES_GERENCIAR", label: "Alterar configurações e dados da empresa" },
    ],
  },
  {
    titulo: "Equipe e acessos",
    descricao: "Usuários, convites e permissões da empresa.",
    itens: [
      { id: "EQUIPE_GERENCIAR", label: "Gerenciar colaboradores e permissões" },
    ],
  },
];

export const PRESETS_PERMISSOES: Record<string, PermissaoUsuario[]> = {
  comercial: [
    "CLIENTES_VISUALIZAR",
    "CLIENTES_GERENCIAR",
    "EMPREENDIMENTOS_VISUALIZAR",
    "VENDAS_VISUALIZAR",
    "VENDAS_CRIAR",
    "VENDAS_EDITAR",
    "VENDAS_EXCLUIR",
  ],
  financeiro: [
    "CLIENTES_VISUALIZAR",
    "EMPREENDIMENTOS_VISUALIZAR",
    "VENDAS_VISUALIZAR",
    "RECEBIMENTOS_VISUALIZAR",
    "RECEBIMENTOS_REGISTRAR",
    "FINANCEIRO_VISUALIZAR",
    "RELATORIOS_VISUALIZAR",
  ],
  consulta: [
    "CLIENTES_VISUALIZAR",
    "EMPREENDIMENTOS_VISUALIZAR",
    "VENDAS_VISUALIZAR",
    "RECEBIMENTOS_VISUALIZAR",
    "FINANCEIRO_VISUALIZAR",
    "RELATORIOS_VISUALIZAR",
  ],
  gestor: TODAS_PERMISSOES.filter((permissao) => permissao !== "EQUIPE_GERENCIAR"),
  administradorDelegado: TODAS_PERMISSOES,
};

export function temPermissao(
  usuario: AuthUsuario | null | undefined,
  permissao: PermissaoUsuario,
) {
  if (!usuario) return false;
  if (usuario.perfil === "SUPER_ADMIN" || usuario.perfil === "ADMIN") return true;

  const permissoes = usuario.permissoes ?? [];
  if (permissoes.includes(permissao)) return true;

  // Compatibilidade temporária com sessões antigas que ainda carregam
  // a permissão ampla anterior à separação entre criar/editar/excluir.
  if (
    permissoes.includes("VENDAS_GERENCIAR")
    && ["VENDAS_CRIAR", "VENDAS_EDITAR", "VENDAS_EXCLUIR"].includes(permissao)
  ) {
    return true;
  }

  return false;
}

export function temAlgumaPermissao(
  usuario: AuthUsuario | null | undefined,
  permissoes: PermissaoUsuario[],
) {
  return permissoes.some((permissao) => temPermissao(usuario, permissao));
}
