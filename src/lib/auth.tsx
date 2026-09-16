import { useNavigate } from "@tanstack/react-router";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type EmpresaResumo = {
  id: number;
  nome: string;
  slug: string;
};

export type AuthUsuario = {
  id: number;
  nome: string;
  email: string;
  perfil: "SUPER_ADMIN" | "ADMIN" | "USUARIO";
  empresa: EmpresaResumo | null;
};

type AuthContextValue = {
  usuario: AuthUsuario | null;
  carregando: boolean;
  recarregar: () => Promise<void>;
  sair: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function carregarUsuarioAtual(): Promise<AuthUsuario | null> {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Falha ao validar sessão");
  }

  return (await response.json()) as AuthUsuario;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<AuthUsuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const atual = await carregarUsuarioAtual();
      setUsuario(atual);
    } catch {
      setUsuario(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  const sair = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUsuario(null);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const value = useMemo(
    () => ({ usuario, carregando, recarregar, sair }),
    [usuario, carregando, recarregar, sair],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { usuario, carregando } = useAuth();

  useEffect(() => {
    if (!carregando && !usuario) {
      void navigate({ to: "/login", replace: true });
    }
  }, [carregando, navigate, usuario]);

  if (carregando || !usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Validando acesso...</p>
        </div>
      </div>
    );
  }

  return children;
}
