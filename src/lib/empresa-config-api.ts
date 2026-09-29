import { apiJson } from "@/lib/api";
import {
  DEFAULT_REGRAS_INADIMPLENCIA,
  type RegrasOperacao,
} from "@/lib/store";

export type DadosEmpresaConfig = {
  cnpj: string;
  email: string;
  telefone: string;
};

export type ConfiguracaoEmpresa = {
  dadosEmpresa: DadosEmpresaConfig;
  padroesEmpreendimento: RegrasOperacao;
  onboardingConcluido: boolean;
};

export type ConfiguracaoEmpresaResponse = {
  empresaId: number;
  config: Partial<ConfiguracaoEmpresa> | null;
  versao: number | null;
  atualizadoEm: string | null;
};

export const CONFIG_EMPRESA_PADRAO: ConfiguracaoEmpresa = {
  dadosEmpresa: {
    cnpj: "",
    email: "",
    telefone: "",
  },
  padroesEmpreendimento: {
    socioPct: 0,
    empresaPct: 100,
    corretorPct: 5,
    entradaPctCorretor: 5,
    parcelasPctCorretor: 5,
    aliquotaTributaria: 0,
    repasseComissaoPct: 50,
    comissaoSobreAcrescimos: false,
    inadimplencia: { ...DEFAULT_REGRAS_INADIMPLENCIA },
  },
  onboardingConcluido: false,
};

export function normalizarConfiguracaoEmpresa(
  response: ConfiguracaoEmpresaResponse,
): ConfiguracaoEmpresaResponse & { config: ConfiguracaoEmpresa } {
  const recebida = response.config ?? {};
  const regras = recebida.padroesEmpreendimento ?? {};
  return {
    ...response,
    config: {
      dadosEmpresa: {
        ...CONFIG_EMPRESA_PADRAO.dadosEmpresa,
        ...(recebida.dadosEmpresa ?? {}),
      },
      padroesEmpreendimento: {
        ...CONFIG_EMPRESA_PADRAO.padroesEmpreendimento,
        ...regras,
        inadimplencia: {
          ...DEFAULT_REGRAS_INADIMPLENCIA,
          ...(regras.inadimplencia ?? {}),
        },
      },
      onboardingConcluido: recebida.onboardingConcluido ?? false,
    },
  };
}

export async function carregarConfiguracaoEmpresa(empresaId: number) {
  const response = await apiJson<ConfiguracaoEmpresaResponse>(
    "/api/configuracao-empresa",
    { empresaId },
  );
  return normalizarConfiguracaoEmpresa(response);
}

export async function salvarConfiguracaoEmpresa(
  empresaId: number,
  config: ConfiguracaoEmpresa,
  versao: number | null,
) {
  const response = await apiJson<ConfiguracaoEmpresaResponse>(
    "/api/configuracao-empresa",
    {
      method: "PUT",
      empresaId,
      body: JSON.stringify({ config, versao }),
    },
  );
  return normalizarConfiguracaoEmpresa(response);
}
