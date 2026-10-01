export type ApiRequestOptions = RequestInit & {
  empresaId?: number | null;
};

type CsrfPayload = {
  headerName: string;
  token: string;
};

let csrfPromise: Promise<CsrfPayload> | null = null;

async function csrf(): Promise<CsrfPayload> {
  if (!csrfPromise) {
    csrfPromise = (async () => {
      let ultimaFalha: unknown;

      for (let tentativa = 0; tentativa < 2; tentativa += 1) {
        try {
          const response = await fetch("/api/auth/csrf", {
            credentials: "include",
            headers: { Accept: "application/json" },
          });

          if (!response.ok) {
            throw new Error("Não foi possível preparar a operação segura.");
          }

          return (await response.json()) as CsrfPayload;
        } catch (error) {
          ultimaFalha = error;
          if (tentativa === 0) {
            await new Promise((resolve) => setTimeout(resolve, 350));
          }
        }
      }

      csrfPromise = null;
      throw new Error(
        ultimaFalha instanceof TypeError
          ? "Conexão temporariamente indisponível. Tente novamente."
          : ultimaFalha instanceof Error
            ? ultimaFalha.message
            : "Não foi possível preparar a operação segura.",
      );
    })();
  }

  try {
    return await csrfPromise;
  } catch (error) {
    csrfPromise = null;
    throw error;
  }
}

function metodoSeguro(method: string) {
  return ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

export async function apiJson<T>(
  url: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.empresaId != null) {
    headers.set("X-Empresa-Id", String(options.empresaId));
  }

  if (!metodoSeguro(method)) {
    const token = await csrf();
    headers.set(token.headerName, token.token);
  }

  const executarUmaVez = async (): Promise<T> => {
    let response: Response;

    try {
      response = await fetch(url, {
        ...options,
        method,
        headers,
        credentials: "include",
      });
    } catch {
      throw new Error("Conexão temporariamente indisponível. Tente novamente.");
    }

    if (!response.ok) {
      let mensagem = `Erro ${response.status}`;

      try {
        const body = await response.json();
        mensagem = body?.detail || body?.message || body?.erro || mensagem;
      } catch {
        try {
          const texto = await response.text();
          if (texto.trim()) mensagem = texto.trim();
        } catch {
          // Mantém a mensagem baseada no status HTTP.
        }
      }

      const erro = new Error(mensagem) as Error & { status?: number };
      erro.status = response.status;
      throw erro;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error("A resposta do servidor foi interrompida. Tente novamente.");
      }
      throw error;
    }
  };

  const tentativas = method === "GET" ? 2 : 1;
  let ultimaFalha: unknown;

  for (let tentativa = 0; tentativa < tentativas; tentativa += 1) {
    try {
      return await executarUmaVez();
    } catch (error) {
      ultimaFalha = error;

      if ((error as Error & { status?: number })?.status != null) {
        throw error;
      }

      if (tentativa < tentativas - 1) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }
  }

  if (ultimaFalha instanceof Error) {
    if (ultimaFalha.message === "Failed to fetch") {
      throw new Error("Conexão temporariamente indisponível. Tente novamente.");
    }
    return Promise.reject(ultimaFalha);
  }

  throw new Error("Não foi possível concluir a operação.");
}
