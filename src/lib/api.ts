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
    csrfPromise = fetch("/api/auth/csrf", {
      credentials: "include",
      headers: { Accept: "application/json" },
    }).then(async (response) => {
      if (!response.ok) {
        csrfPromise = null;
        throw new Error("Não foi possível preparar a operação segura.");
      }
      return (await response.json()) as CsrfPayload;
    });
  }
  return csrfPromise;
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

  const response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: "include",
  });

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
