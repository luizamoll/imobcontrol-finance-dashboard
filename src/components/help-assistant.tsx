import { useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ArrowRight, Send, Sparkles, X } from "lucide-react";

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
  relatedQuestions?: string[];
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
      title: "Oi! Posso ajudar?",
      text:
        "Eu sou o assistente do ImobControl. Conheço os principais fluxos, regras e telas do sistema e posso te guiar passo a passo. Escolha uma pergunta sugerida ou escreva do seu jeito.",
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
        relatedQuestions: result.relatedQuestions,
      },
    ]);
    setInput("");
  };

  return (
    <div className="fixed bottom-3 right-3 z-[80] overflow-visible print:hidden sm:bottom-5 sm:right-5">
      {open ? (
        <div className="mb-3 flex h-[620px] max-h-[calc(100vh-7rem)] w-[390px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between border-b border-border/70 bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                <img
                  src="/imobcontrol-assistant-v3.webp"
                  alt="Mascote do ImobControl"
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
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

                {message.role === "assistant" &&
                  message.relatedQuestions &&
                  message.relatedQuestions.length > 0 && (
                    <div className="mt-3 border-t border-border/70 pt-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Talvez você queira saber também
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {message.relatedQuestions.map((question) => (
                          <button
                            type="button"
                            key={question}
                            onClick={() => ask(question)}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background px-2.5 py-2 text-left text-xs text-foreground transition-colors hover:bg-accent"
                          >
                            <span>{question}</span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ))}

            {messages.length === 1 && (
              <div className="pt-1">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Você pode começar por aqui
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
            )}
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
        className="group relative ml-auto flex h-[158px] w-[118px] items-end justify-center bg-transparent p-0 outline-none"
        aria-label="Abrir assistente do ImobControl"
      >
        {!open && (
          <span className="pointer-events-none absolute right-1 top-0 rounded-2xl rounded-br-sm border border-border/80 bg-background px-3 py-2 text-xs font-semibold leading-tight text-foreground shadow-lg">
            Posso ajudar?
          </span>
        )}

        <span className="imob-mascot-character relative block h-[142px] w-[104px] transition-transform duration-300 group-hover:scale-[1.04]">
          <img
            src="/imobcontrol-assistant-character.webp"
            alt="Assistente do ImobControl"
            className="h-full w-full object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.20)]"
          />
        </span>
      </button>

      <style>{`
        @keyframes imob-mascot-float {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-7px) rotate(1.5deg); }
        }
        .imob-mascot-character {
          animation: imob-mascot-float 3.2s ease-in-out infinite;
          transform-origin: 50% 100%;
        }
        @media (prefers-reduced-motion: reduce) {
          .imob-mascot-character { animation: none; }
        }
      `}</style>
    </div>
  );
}
