import { useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ArrowRight, Bot, Send, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  findHelpAnswer,
  getContextSuggestions,
  type HelpTarget,
} from "@/lib/assistant-knowledge";

type HelpMessage = {
  role: "assistant" | "user";
  text: string;
  title?: string;
  target?: HelpTarget;
};

export function HelpAssistant() {
  const currentPath = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<HelpMessage[]>([
    {
      role: "assistant",
      title: "Posso ajudar?",
      text:
        "Sou o guia do ImobControl. Posso explicar telas, regras, recebimentos, vendas, relatórios e acessos. Escolha uma pergunta ou escreva sua dúvida.",
    },
  ]);

  const suggestions = useMemo(
    () => getContextSuggestions(currentPath),
    [currentPath],
  );

  const ask = (question: string) => {
    const cleaned = question.trim();
    if (!cleaned) return;

    const result = findHelpAnswer(cleaned, currentPath);
    setMessages((current) => [
      ...current,
      { role: "user", text: cleaned },
      {
        role: "assistant",
        title: result.title,
        text: result.answer,
        target: result.target,
      },
    ]);
    setInput("");
  };

  return (
    <div className="fixed bottom-5 right-5 z-[80] print:hidden">
      {open ? (
        <div className="mb-3 flex h-[min(620px,calc(100vh-7rem))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between border-b border-border/70 bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background">
                <Bot className="h-5 w-5 text-foreground" />
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  Assistente ImobControl
                  <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Guia do sistema
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full"
              onClick={() => setOpen(false)}
              aria-label="Fechar assistente"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "ml-10 rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground"
                    : "mr-5 rounded-2xl rounded-bl-md border border-border/70 bg-muted/40 px-3.5 py-3 text-sm text-foreground"
                }
              >
                {message.title && (
                  <p className="mb-1 font-semibold">{message.title}</p>
                )}
                <p className="leading-5">{message.text}</p>
                {message.target && (
                  <a
                    href={message.target.href}
                    className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    {message.target.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}

            <div className="pt-1">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Perguntas sugeridas
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((question) => (
                  <button
                    type="button"
                    key={question}
                    onClick={() => ask(question)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <form
            className="flex gap-2 border-t border-border/70 bg-background p-3"
            onSubmit={(event) => {
              event.preventDefault();
              ask(input);
            }}
          >
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Digite sua dúvida..."
              aria-label="Digite sua dúvida"
              autoComplete="off"
            />
            <Button
              type="submit"
              size="icon"
              className="shrink-0"
              disabled={!input.trim()}
              aria-label="Enviar pergunta"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="ml-auto flex items-center gap-2 rounded-full border border-border bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg shadow-black/15 transition-transform hover:-translate-y-0.5"
        aria-label="Abrir assistente do ImobControl"
      >
        <Bot className="h-5 w-5" />
        <span>Posso ajudar?</span>
      </button>
    </div>
  );
}
