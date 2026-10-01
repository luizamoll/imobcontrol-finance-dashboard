import { apiJson } from "@/lib/api";

export type EmpresaPerfil = {
  id: number;
  nome: string;
  razaoSocial: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  ativa: boolean;
  atualizadoEm: string | null;
};

export type EmpresaPerfilInput = {
  nome: string;
  razaoSocial: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
};

export async function carregarPerfilEmpresa(empresaId: number) {
  return apiJson<EmpresaPerfil>("/api/empresa/perfil", { empresaId });
}

export async function salvarPerfilEmpresa(
  empresaId: number,
  body: EmpresaPerfilInput,
) {
  return apiJson<EmpresaPerfil>("/api/empresa/perfil", {
    method: "PUT",
    empresaId,
    body: JSON.stringify(body),
  });
}
