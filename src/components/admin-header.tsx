import { Building2, LogOut, ShieldCheck } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";

function iniciais(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

export function AdminHeader() {
  const navigate = useNavigate();
  const { usuario, sair } = useAuth();
  const { empresaAtual } = useTenant();

  async function handleLogout() {
    await sair();
    toast.success("Sessão encerrada.");
    await navigate({ to: "/login", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />

      <div className="flex min-w-0 items-center gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <div className="text-sm font-medium">Administração ImobControl</div>
          <div className="truncate text-xs text-muted-foreground">
            Controle da plataforma, empresas e acessos
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {empresaAtual && (
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex"
            onClick={() => void navigate({ to: "/" })}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Abrir {empresaAtual.nome}
          </Button>
        )}

        <Separator orientation="vertical" className="mx-1 h-6" />

        <div className="flex items-center gap-2.5 rounded-xl px-1.5 py-1">
          <Avatar className="h-9 w-9 border border-border/70 shadow-sm">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {iniciais(usuario?.nome ?? "Admin")}
            </AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <span className="max-w-36 truncate text-sm font-medium text-foreground">
              {usuario?.nome ?? "Administradora"}
            </span>
            <span className="shrink-0 rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Super Admin
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
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
