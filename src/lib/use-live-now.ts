import { useEffect, useState } from "react";

export function useLiveNow(intervalMs = 60_000) {
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    const atualizar = () => setAgora(new Date());
    const timer = window.setInterval(atualizar, intervalMs);
    window.addEventListener("focus", atualizar);
    document.addEventListener("visibilitychange", atualizar);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", atualizar);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, [intervalMs]);

  return agora;
}
