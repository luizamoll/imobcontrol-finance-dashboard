import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiJson } from "@/lib/api";
import { useAuth, type EmpresaResumo } from "@/lib/auth";

type TenantContextValue = {
  empresas: EmpresaResumo[];
  empresaAtual: EmpresaResumo | null;
  empresaAtualId: number | null;
  carregando: boolean;
  modoCliente: boolean;
  selecionarEmpresa: (id: number) => void;
  entrarModoCliente: (id: number) => void;
  sairModoCliente: () => void;
};

const TenantContext = createContext<TenantContextValue | null>(null);
const STORAGE_KEY = "imobcontrol.superadmin.empresa";
const CLIENT_MODE_KEY = "imobcontrol.superadmin.client-mode";

export function TenantProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [empresas, setEmpresas] = useState<EmpresaResumo[]>([]);
  const [empresaAtualId, setEmpresaAtualId] = useState<number | null>(
    usuario?.empresa?.id ?? null,
  );
  const [carregando, setCarregando] = useState(usuario?.perfil === "SUPER_ADMIN");
  const [modoCliente, setModoCliente] = useState(() => {
    try {
      return window.sessionStorage.getItem(CLIENT_MODE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!usuario) {
      setEmpresas([]);
      setEmpresaAtualId(null);
      setModoCliente(false);
      setCarregando(false);
      return;
    }

    if (usuario.perfil !== "SUPER_ADMIN") {
      const lista = usuario.empresa ? [usuario.empresa] : [];
      setEmpresas(lista);
      setEmpresaAtualId(usuario.empresa?.id ?? null);
      setModoCliente(false);
      setCarregando(false);
      return;
    }

    let cancelado = false;
    setCarregando(true);

    void apiJson<EmpresaResumo[]>("/api/super-admin/empresas")
      .then((lista) => {
        if (cancelado) return;
        setEmpresas(lista);

        let salva: number | null = null;
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          const parsed = raw ? Number(raw) : NaN;
          salva = Number.isFinite(parsed) ? parsed : null;
        } catch {
          salva = null;
        }

        const valida = salva != null && lista.some((empresa) => empresa.id === salva);
        setEmpresaAtualId(valida ? salva : lista[0]?.id ?? null);
      })
      .catch(() => {
        if (cancelado) return;
        setEmpresas([]);
        setEmpresaAtualId(null);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [usuario]);

  const selecionarEmpresa = (id: number) => {
    if (!empresas.some((empresa) => empresa.id === id)) return;
    setEmpresaAtualId(id);
    if (usuario?.perfil === "SUPER_ADMIN") {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(id));
      } catch {
        // Persistência local da preferência é opcional.
      }
    }
  };

  const entrarModoCliente = (id: number) => {
    if (usuario?.perfil !== "SUPER_ADMIN") return;
    if (!empresas.some((empresa) => empresa.id === id)) return;
    selecionarEmpresa(id);
    setModoCliente(true);
    try {
      window.sessionStorage.setItem(CLIENT_MODE_KEY, "1");
    } catch {
      // A simulação continua funcionando mesmo sem persistência.
    }
  };

  const sairModoCliente = () => {
    setModoCliente(false);
    try {
      window.sessionStorage.removeItem(CLIENT_MODE_KEY);
    } catch {
      // Sem impacto funcional.
    }
  };

  const empresaAtual =
    empresas.find((empresa) => empresa.id === empresaAtualId) ?? null;

  const value = useMemo(
    () => ({
      empresas,
      empresaAtual,
      empresaAtualId,
      carregando,
      modoCliente,
      selecionarEmpresa,
      entrarModoCliente,
      sairModoCliente,
    }),
    [empresas, empresaAtual, empresaAtualId, carregando, modoCliente],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant deve ser usado dentro de TenantProvider");
  }
  return context;
}
