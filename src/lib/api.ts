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

  const executar = () =>
    fetch(url, {
      ...options,
      method,
      headers,
      credentials: "include",
    });

  let response: Response;
  try {
    response = await executar();
  } catch (error) {
    if (method === "GET") {
      await new Promise((resolve) => setTimeout(resolve, 350));
      try {
        response = await executar();
      } catch {
        throw new Error("Conexão temporariamente indisponível. Tente novamente.");
      }
    } else {
      throw new Error(
        error instanceof TypeError
          ? "Não foi possível conectar ao servidor. Tente novamente."
          : error instanceof Error
            ? error.message
            : "Não foi possível concluir a operação.",
      );
    }
  }

  if (!response.ok) {
    let mensagem = `Erro ${response.status}`;
    try {
      const body = await response.json();
      mensagem =
        body?.detail ||
        body?.message ||
        body?.erro ||
        mensagem;
    } catch {
      const texto = await response.text().catch(() => "");
      if (texto.trim()) mensagem = texto.trim();
    }

    const erro = new Error(mensagem) as Error & { status?: number };
    erro.status = response.status;
    throw erro;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
