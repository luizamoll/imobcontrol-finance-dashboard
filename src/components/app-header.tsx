import { Bell, Building2, HelpCircle, LogOut, Search } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { brl0, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useTenant } from "@/lib/tenant";

function iniciais(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

function perfilLegivel(perfil: string) {
  switch (perfil) {
    case "SUPER_ADMIN":
      return "Super administradora";
    case "ADMIN":
      return "Administradora";
    default:
      return "Usuária";
  }
}

export function AppHeader() {
  const navigate = useNavigate();
  const { usuario, sair } = useAuth();
  const { state } = useStore();
  const { empresas, empresaAtualId, carregando: carregandoEmpresas, selecionarEmpresa } =
    useTenant();
  const [busca, setBusca] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [notificacoesLidas, setNotificacoesLidas] = useState<Set<string>>(() => new Set());

  async function handleLogout() {
    await sair();
    toast.success("Sessão encerrada.");
    await navigate({ to: "/login", replace: true });
  }

  const nome = usuario?.nome ?? "Usuário";
  const perfil = usuario?.perfil ? perfilLegivel(usuario.perfil) : "";
  const termo = busca.trim().toLowerCase();

  const resultados = useMemo(() => {
    if (termo.length < 2) return [];

    const itens: Array<{
      id: string;
      titulo: string;
      detalhe: string;
      abrir: () => void;
    }> = [];

    state.empreendimentos
      .filter((e) =>
        [e.nome, e.spe, e.cnpj].some((valor) =>
          valor?.toLowerCase().includes(termo),
        ),
      )
      .slice(0, 4)
      .forEach((e) =>
        itens.push({
          id: `emp-${e.id}`,
          titulo: e.nome,
          detalhe: `Empreendimento · ${e.spe}`,
          abrir: () =>
            void navigate({ to: "/empreendimentos/$id", params: { id: e.id } }),
        }),
      );

    state.vendas
      .filter((v) =>
        [v.compradorNome, v.corretorNome].some((valor) =>
          valor?.toLowerCase().includes(termo),
        ),
      )
      .slice(0, 4)
      .forEach((v) => {
        const emp = state.empreendimentos.find((e) => e.id === v.empreendimentoId);
        itens.push({
          id: `venda-${v.id}`,
          titulo: v.compradorNome,
          detalhe: `Venda${emp ? ` · ${emp.nome}` : ""}`,
          abrir: () => void navigate({ to: "/vendas/$id", params: { id: v.id } }),
        });
      });

    state.matriculas
      .filter((m) =>
        [m.numero, m.unidade, m.compradorNome ?? ""].some((valor) =>
          valor.toLowerCase().includes(termo),
        ),
      )
      .slice(0, 4)
      .forEach((m) => {
        const emp = state.empreendimentos.find((e) => e.id === m.empreendimentoId);
        itens.push({
          id: `unidade-${m.id}`,
          titulo: `${m.numero} · ${m.unidade}`,
          detalhe: `Unidade${emp ? ` · ${emp.nome}` : ""}`,
          abrir: () =>
            void navigate({
              to: "/empreendimentos/$id",
              params: { id: m.empreendimentoId },
            }),
        });
      });

    return itens.slice(0, 8);
  }, [state, termo, navigate]);

  const notificacoes = useMemo(() => {
    const agora = new Date();
    const limite = new Date();
    limite.setDate(limite.getDate() + 7);

    return state.parcelas
      .filter((p) => p.status !== "paga" && p.status !== "cancelada")
      .map((p) => {
        const vencimento = new Date(`${p.vencimento}T23:59:59`);
        const vencida = vencimento < agora;
        const proxima = !vencida && vencimento <= limite;
        if (!vencida && !proxima) return null;

        const venda = state.vendas.find((v) => v.id === p.vendaId);
        const emp = state.empreendimentos.find((e) => e.id === p.empreendimentoId);
        const mat = state.matriculas.find((m) => m.id === p.matriculaId);
        const categoria = vencida ? "vencida" : "proxima";

        return {
          id: `${categoria}:${p.id}:${p.vencimento}`,
          categoria,
          vendaId: p.vendaId,
          titulo: `${p.compradorNome} · ${p.origemDescricao || "Parcela"} ${p.numero}/${p.totalParcelas}`,
          detalhe: [
            vencida ? `Venceu em ${formatDate(p.vencimento)}` : `Vence em ${formatDate(p.vencimento)}`,
            brl0(p.valor),
            emp?.nome,
            mat?.unidade ? `Unidade ${mat.unidade}` : undefined,
            venda?.corretorNome ? `Corretor: ${venda.corretorNome}` : undefined,
          ]
            .filter(Boolean)
            .join(" · "),
          vencimento: p.vencimento,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => {
        if (a.categoria === "vencida" && b.categoria !== "vencida") return -1;
        if (a.categoria !== "vencida" && b.categoria === "vencida") return 1;
        return a.vencimento.localeCompare(b.vencimento);
      });
  }, [state.parcelas, state.vendas, state.empreendimentos, state.matriculas]);

  const chaveNotificacoes = usuario ? `imobcontrol.notifications.read.${usuario.id}` : "";

  useEffect(() => {
    if (!chaveNotificacoes) {
      setNotificacoesLidas(new Set());
      return;
    }
    try {
      const salvas = JSON.parse(window.localStorage.getItem(chaveNotificacoes) || "[]");
      setNotificacoesLidas(new Set(Array.isArray(salvas) ? salvas : []));
    } catch {
      setNotificacoesLidas(new Set());
    }
  }, [chaveNotificacoes]);

  const notificacoesNaoLidas = notificacoes.filter((item) => !notificacoesLidas.has(item.id));

  const marcarNotificacoesComoLidas = () => {
    if (!chaveNotificacoes || notificacoes.length === 0) return;
    const proximas = new Set(notificacoesLidas);
    notificacoes.forEach((item) => proximas.add(item.id));
    setNotificacoesLidas(proximas);
    try {
      window.localStorage.setItem(chaveNotificacoes, JSON.stringify([...proximas]));
    } catch {
      // Falha local não deve impedir o uso das notificações.
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />

      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(event) => {
            setBusca(event.target.value);
            setBuscaAberta(true);
          }}
          onFocus={() => setBuscaAberta(true)}
          onBlur={() => window.setTimeout(() => setBuscaAberta(false), 150)}
          placeholder="Buscar empreendimento, cliente ou unidade..."
          className="h-9 border-transparent bg-muted/40 pl-9 focus-visible:bg-background"
        />
        {buscaAberta && termo.length >= 2 && (
          <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
            {resultados.length === 0 ? (
              <div className="px-4 py-5 text-center text-sm text-muted-foreground">
                Nenhum resultado encontrado.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto py-1">
                {resultados.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="block w-full px-4 py-2.5 text-left hover:bg-muted/60"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setBusca("");
                      setBuscaAberta(false);
                      item.abrir();
                    }}
                  >
                    <div className="text-sm font-medium text-foreground">{item.titulo}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{item.detalhe}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {usuario?.perfil === "SUPER_ADMIN" && (
          <div className="hidden min-w-48 lg:block">
            <Select
              value={empresaAtualId != null ? String(empresaAtualId) : ""}
              onValueChange={(value) => selecionarEmpresa(Number(value))}
              disabled={carregandoEmpresas || empresas.length === 0}
            >
              <SelectTrigger className="h-9 border-border/70 bg-background">
                <div className="flex min-w-0 items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <SelectValue
                    placeholder={
                      carregandoEmpresas
                        ? "Carregando empresas..."
                        : empresas.length === 0
                          ? "Nenhuma empresa"
                          : "Selecionar empresa"
                    }
                  />
                </div>
              </SelectTrigger>
              <SelectContent>
                {empresas.map((empresa) => (
                  <SelectItem key={empresa.id} value={String(empresa.id)}>
                    {empresa.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" title="Ajuda" aria-label="Ajuda">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-3">
            <div>
              <p className="text-sm font-semibold">Ajuda rápida</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                O fluxo recomendado é cadastrar o empreendimento, incluir as unidades e depois registrar a venda.
              </p>
            </div>
            <div className="space-y-2 text-xs">
              <button
                type="button"
                className="w-full rounded-md border border-border/70 p-3 text-left hover:bg-muted/40"
                onClick={() => void navigate({ to: "/empreendimentos" })}
              >
                <strong className="block text-foreground">1. Empreendimentos e unidades</strong>
                <span className="text-muted-foreground">Cadastre SPE, unidades, lotes e valores.</span>
              </button>
              <button
                type="button"
                className="w-full rounded-md border border-border/70 p-3 text-left hover:bg-muted/40"
                onClick={() => void navigate({ to: "/vendas" })}
              >
                <strong className="block text-foreground">2. Vendas</strong>
                <span className="text-muted-foreground">Escolha uma unidade disponível e monte o contrato.</span>
              </button>
              <button
                type="button"
                className="w-full rounded-md border border-border/70 p-3 text-left hover:bg-muted/40"
                onClick={() => void navigate({ to: "/recebimentos" })}
              >
                <strong className="block text-foreground">3. Recebimentos</strong>
                <span className="text-muted-foreground">Registre pagamentos e acompanhe a distribuição.</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover onOpenChange={(open) => open && marcarNotificacoesComoLidas()}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9"
              title="Notificações"
              aria-label="Notificações"
            >
              <Bell className="h-4 w-4" />
              {notificacoesNaoLidas.length > 0 && (
                <span className="absolute right-1.5 top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold leading-none text-destructive-foreground">
                  {notificacoesNaoLidas.length > 9 ? "9+" : notificacoesNaoLidas.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[380px] max-w-[calc(100vw-2rem)]">
            <div className="mb-3">
              <p className="text-sm font-semibold">Notificações</p>
              <p className="text-xs text-muted-foreground">
                {notificacoes.length === 0
                  ? "Nenhuma pendência ativa."
                  : `${notificacoes.length} pendência${notificacoes.length === 1 ? "" : "s"} ativa${notificacoes.length === 1 ? "" : "s"} · ${notificacoesNaoLidas.length} nova${notificacoesNaoLidas.length === 1 ? "" : "s"}`}
              </p>
            </div>
            {notificacoes.length === 0 ? (
              <div className="rounded-md bg-muted/30 px-3 py-5 text-center text-sm text-muted-foreground">
                Nenhuma pendência no momento.
              </div>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {notificacoes.slice(0, 12).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={
                      item.categoria === "vencida"
                        ? "w-full rounded-md border border-destructive/20 bg-destructive/5 p-3 text-left hover:bg-destructive/10"
                        : "w-full rounded-md border border-border/70 p-3 text-left hover:bg-muted/40"
                    }
                    onClick={() =>
                      void navigate({ to: "/vendas/$id", params: { id: item.vendaId } })
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{item.titulo}</div>
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">
                          {item.detalhe}
                        </div>
                      </div>
                      <span
                        className={
                          item.categoria === "vencida"
                            ? "shrink-0 rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive"
                            : "shrink-0 rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground"
                        }
                      >
                        {item.categoria === "vencida" ? "Atrasada" : "Próxima"}
                      </span>
                    </div>
                  </button>
                ))}
                {notificacoes.length > 12 && (
                  <div className="px-2 py-1 text-center text-xs text-muted-foreground">
                    Mais {notificacoes.length - 12} pendências ativas.
                  </div>
                )}
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="mx-1 h-6" />
        <div className="flex items-center gap-2 pr-1">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-xs text-primary-foreground">
              {iniciais(nome)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left leading-tight sm:block">
            <div className="max-w-40 truncate text-sm font-medium">{nome}</div>
            <div className="text-xs text-muted-foreground">{perfil}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            title="Sair"
            aria-label="Sair"
            onClick={() => void handleLogout()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
