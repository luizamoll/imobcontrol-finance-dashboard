import { useNavigate } from "@tanstack/react-router";
import type { PermissaoUsuario } from "@/lib/permissoes";
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
  razaoSocial?: string | null;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
};

export type AuthUsuario = {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  emailVerificado: boolean;
  senhaDefinida: boolean;
  perfil: "SUPER_ADMIN" | "ADMIN" | "USUARIO";
  permissoes: PermissaoUsuario[];
  empresa: EmpresaResumo | null;
};

type AuthContextValue = {
  usuario: AuthUsuario | null;
  usuarioReal: AuthUsuario | null;
  simulacaoFuncionario: AuthUsuario | null;
  carregando: boolean;
  recarregar: () => Promise<void>;
  sair: () => Promise<void>;
  simularFuncionario: (usuario: AuthUsuario) => void;
  encerrarSimulacaoFuncionario: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const SIMULACAO_FUNCIONARIO_KEY = "imobcontrol.preview.funcionario";

function lerSimulacaoFuncionario(): AuthUsuario | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(SIMULACAO_FUNCIONARIO_KEY);
    if (!raw) return null;
    const usuario = JSON.parse(raw) as AuthUsuario;
    return usuario?.perfil === "USUARIO" ? usuario : null;
  } catch {
    return null;
  }
}

function persistirSimulacaoFuncionario(usuario: AuthUsuario | null) {
  if (typeof window === "undefined") return;

  try {
    if (usuario) {
      window.sessionStorage.setItem(SIMULACAO_FUNCIONARIO_KEY, JSON.stringify(usuario));
    } else {
      window.sessionStorage.removeItem(SIMULACAO_FUNCIONARIO_KEY);
    }
  } catch {
    // A visualização continua funcionando mesmo sem persistência da sessão.
  }
}

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
  const [usuarioReal, setUsuarioReal] = useState<AuthUsuario | null>(null);
  const [simulacaoFuncionario, setSimulacaoFuncionario] = useState<AuthUsuario | null>(
    () => lerSimulacaoFuncionario(),
  );
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const atual = await carregarUsuarioAtual();
      setUsuarioReal(atual);

      if (!atual || !["SUPER_ADMIN", "ADMIN"].includes(atual.perfil)) {
        setSimulacaoFuncionario(null);
        persistirSimulacaoFuncionario(null);
        return;
      }

      const salva = lerSimulacaoFuncionario();
      if (
        salva
        && salva.perfil === "USUARIO"
        && (
          atual.perfil === "SUPER_ADMIN"
          || (atual.empresa?.id != null && salva.empresa?.id === atual.empresa.id)
        )
      ) {
        setSimulacaoFuncionario(salva);
      } else if (salva) {
        setSimulacaoFuncionario(null);
        persistirSimulacaoFuncionario(null);
      }
    } catch {
      setUsuarioReal(null);
      setSimulacaoFuncionario(null);
      persistirSimulacaoFuncionario(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  const encerrarSimulacaoFuncionario = useCallback(() => {
    setSimulacaoFuncionario(null);
    persistirSimulacaoFuncionario(null);
  }, []);

  const simularFuncionario = useCallback(
    (usuarioSimulado: AuthUsuario) => {
      if (!usuarioReal || !["SUPER_ADMIN", "ADMIN"].includes(usuarioReal.perfil)) {
        return;
      }

      if (usuarioSimulado.perfil !== "USUARIO" || !usuarioSimulado.empresa) {
        return;
      }

      if (
        usuarioReal.perfil === "ADMIN"
        && usuarioReal.empresa?.id !== usuarioSimulado.empresa.id
      ) {
        return;
      }

      setSimulacaoFuncionario(usuarioSimulado);
      persistirSimulacaoFuncionario(usuarioSimulado);
    },
    [usuarioReal],
  );

  const sair = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUsuarioReal(null);
      setSimulacaoFuncionario(null);
      persistirSimulacaoFuncionario(null);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const usuario = simulacaoFuncionario ?? usuarioReal;

  const value = useMemo(
    () => ({
      usuario,
      usuarioReal,
      simulacaoFuncionario,
      carregando,
      recarregar,
      sair,
      simularFuncionario,
      encerrarSimulacaoFuncionario,
    }),
    [
      usuario,
      usuarioReal,
      simulacaoFuncionario,
      carregando,
      recarregar,
      sair,
      simularFuncionario,
      encerrarSimulacaoFuncionario,
    ],
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
  const { usuarioReal, carregando } = useAuth();

  useEffect(() => {
    if (!carregando && !usuarioReal) {
      void navigate({ to: "/login", replace: true });
    }
  }, [carregando, navigate, usuarioReal]);

  if (carregando || !usuarioReal) {
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
