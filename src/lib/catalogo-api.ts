import { apiJson } from "@/lib/api";
import type {
  Empreendimento,
  Matricula,
  Quadra,
  RegrasOperacao,
} from "@/lib/store";

type Pagina<T> = {
  content: T[];
  totalElements: number;
};

type EmpreendimentoApi = {
  id: number;
  empresaId: number;
  nome: string;
  spe: string | null;
  cnpj: string | null;
  areaTotal: number;
  tipo: string;
  unidadesPrevistas: number;
  valorTotal: number;
  socioPct: number;
  empresaPct: number;
  corretorPct: number;
  aliquotaTributaria: number;
  repasseComissaoPct: number;
  comissaoSobreAcrescimos: boolean;
  inadimplencia: RegrasOperacao["inadimplencia"] | null;
  observacoes: string | null;
  status: string;
  versao: number;
};

type QuadraApi = {
  id: number;
  empresaId: number;
  empreendimentoId: number;
  nome: string;
  descricao: string | null;
  regras: RegrasOperacao | null;
  versao: number;
};

type UnidadeApi = {
  id: number;
  empresaId: number;
  empreendimentoId: number;
  quadraId: number | null;
  numero: string;
  unidade: string;
  unidadeTipo: string | null;
  descricao: string | null;
  area: number;
  valorVenda: number;
  status: string;
  regras: RegrasOperacao | null;
  versao: number;
};

export type EmpreendimentoRemoto = Empreendimento & { versao?: number };
export type QuadraRemota = Quadra & { versao?: number };
export type MatriculaRemota = Matricula & { versao?: number };

function empFromApi(e: EmpreendimentoApi): EmpreendimentoRemoto {
  return {
    id: String(e.id),
    nome: e.nome,
    spe: e.spe ?? "",
    cnpj: e.cnpj ?? "",
    areaTotal: Number(e.areaTotal ?? 0),
    tipo: e.tipo as Empreendimento["tipo"],
    matriculasCount: e.unidadesPrevistas ?? 0,
    valorTotal: Number(e.valorTotal ?? 0),
    socioPct: Number(e.socioPct ?? 0),
    empresaPct: Number(e.empresaPct ?? 0),
    corretorPct: Number(e.corretorPct ?? 0),
    aliquotaTributaria: Number(e.aliquotaTributaria ?? 0),
    repasseComissaoPct: Number(e.repasseComissaoPct ?? 50),
    comissaoSobreAcrescimos: Boolean(e.comissaoSobreAcrescimos),
    inadimplencia: e.inadimplencia ?? undefined,
    observacoes: e.observacoes ?? undefined,
    status: e.status as Empreendimento["status"],
    versao: e.versao,
  };
}

function quadraFromApi(q: QuadraApi): QuadraRemota {
  return {
    id: String(q.id),
    empreendimentoId: String(q.empreendimentoId),
    nome: q.nome,
    descricao: q.descricao ?? undefined,
    regras: q.regras ?? undefined,
    versao: q.versao,
  };
}

function unidadeFromApi(u: UnidadeApi): MatriculaRemota {
  return {
    id: String(u.id),
    empreendimentoId: String(u.empreendimentoId),
    quadraId: u.quadraId == null ? undefined : String(u.quadraId),
    numero: u.numero,
    unidade: u.unidade,
    unidadeTipo: (u.unidadeTipo ?? undefined) as Matricula["unidadeTipo"],
    descricao: u.descricao ?? undefined,
    area: Number(u.area ?? 0),
    valorVenda: Number(u.valorVenda ?? 0),
    status: u.status as Matricula["status"],
    regras: u.regras ?? undefined,
    versao: u.versao,
  };
}

function empBody(e: Omit<Empreendimento, "id"> | EmpreendimentoRemoto) {
  return {
    nome: e.nome,
    spe: e.spe || null,
    cnpj: e.cnpj || null,
    areaTotal: e.areaTotal ?? 0,
    tipo: e.tipo,
    unidadesPrevistas: e.matriculasCount ?? 0,
    valorTotal: e.valorTotal ?? 0,
    socioPct: e.socioPct ?? 0,
    empresaPct: e.empresaPct ?? 0,
    corretorPct: e.corretorPct ?? 0,
    aliquotaTributaria: e.aliquotaTributaria ?? 0,
    repasseComissaoPct: e.repasseComissaoPct ?? 50,
    comissaoSobreAcrescimos: e.comissaoSobreAcrescimos ?? false,
    inadimplencia: e.inadimplencia ?? null,
    observacoes: e.observacoes ?? null,
    status: e.status,
    versao: "versao" in e ? e.versao ?? null : null,
  };
}

function quadraBody(q: Omit<Quadra, "id"> | QuadraRemota) {
  return {
    empreendimentoId: Number(q.empreendimentoId),
    nome: q.nome,
    descricao: q.descricao ?? null,
    regras: q.regras ?? null,
    versao: "versao" in q ? q.versao ?? null : null,
  };
}

function unidadeBody(u: Omit<Matricula, "id"> | MatriculaRemota) {
  return {
    empreendimentoId: Number(u.empreendimentoId),
    quadraId: u.quadraId ? Number(u.quadraId) : null,
    numero: u.numero,
    unidade: u.unidade,
    unidadeTipo: u.unidadeTipo ?? null,
    descricao: u.descricao ?? null,
    area: u.area ?? 0,
    valorVenda: u.valorVenda ?? 0,
    status: u.status,
    regras: u.regras ?? null,
    versao: "versao" in u ? u.versao ?? null : null,
  };
}

export async function carregarCatalogo(empresaId: number) {
  const pagina = await apiJson<Pagina<EmpreendimentoApi>>(
    "/api/empreendimentos?pagina=0&tamanho=100",
    { empresaId },
  );

  const empreendimentos = pagina.content.map(empFromApi);
  const conjuntos = await Promise.all(
    empreendimentos.map(async (emp) => {
      const [quadras, unidades] = await Promise.all([
        apiJson<QuadraApi[]>(`/api/empreendimentos/${emp.id}/quadras`, { empresaId }),
        apiJson<UnidadeApi[]>(`/api/empreendimentos/${emp.id}/unidades`, { empresaId }),
      ]);
      return {
        quadras: quadras.map(quadraFromApi),
        unidades: unidades.map(unidadeFromApi),
      };
    }),
  );

  return {
    empreendimentos,
    quadras: conjuntos.flatMap((x) => x.quadras),
    matriculas: conjuntos.flatMap((x) => x.unidades),
  };
}

export async function criarEmpreendimentoRemoto(
  empresaId: number,
  e: Omit<Empreendimento, "id">,
) {
  const criado = await apiJson<EmpreendimentoApi>("/api/empreendimentos", {
    method: "POST",
    empresaId,
    body: JSON.stringify(empBody(e)),
  });
  return empFromApi(criado);
}

export async function atualizarEmpreendimentoRemoto(
  empresaId: number,
  atual: EmpreendimentoRemoto,
  patch: Partial<Empreendimento>,
) {
  const proximo: EmpreendimentoRemoto = { ...atual, ...patch };
  const salvo = await apiJson<EmpreendimentoApi>(`/api/empreendimentos/${atual.id}`, {
    method: "PUT",
    empresaId,
    body: JSON.stringify(empBody(proximo)),
  });
  return empFromApi(salvo);
}

export async function criarQuadraRemota(
  empresaId: number,
  q: Omit<Quadra, "id">,
) {
  const criada = await apiJson<QuadraApi>("/api/quadras", {
    method: "POST",
    empresaId,
    body: JSON.stringify(quadraBody(q)),
  });
  return quadraFromApi(criada);
}

export async function atualizarQuadraRemota(
  empresaId: number,
  atual: QuadraRemota,
  patch: Partial<Quadra>,
) {
  const proxima: QuadraRemota = { ...atual, ...patch };
  const salva = await apiJson<QuadraApi>(`/api/quadras/${atual.id}`, {
    method: "PUT",
    empresaId,
    body: JSON.stringify(quadraBody(proxima)),
  });
  return quadraFromApi(salva);
}

export async function criarUnidadeRemota(
  empresaId: number,
  u: Omit<Matricula, "id">,
) {
  const criada = await apiJson<UnidadeApi>("/api/unidades", {
    method: "POST",
    empresaId,
    body: JSON.stringify(unidadeBody(u)),
  });
  return unidadeFromApi(criada);
}

export async function atualizarUnidadeRemota(
  empresaId: number,
  atual: MatriculaRemota,
  patch: Partial<Matricula>,
) {
  const proxima: MatriculaRemota = { ...atual, ...patch };
  const salva = await apiJson<UnidadeApi>(`/api/unidades/${atual.id}`, {
    method: "PUT",
    empresaId,
    body: JSON.stringify(unidadeBody(proxima)),
  });
  return unidadeFromApi(salva);
}
