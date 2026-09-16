import { Bell, Search, HelpCircle, LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";

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

  async function handleLogout() {
    await sair();
    toast.success("Sessão encerrada.");
    await navigate({ to: "/login", replace: true });
  }

  const nome = usuario?.nome ?? "Usuário";
  const perfil = usuario?.perfil ? perfilLegivel(usuario.perfil) : "";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />

      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar empreendimentos, clientes ou parcelas..."
          className="h-9 border-transparent bg-muted/40 pl-9 focus-visible:bg-background"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9" title="Ajuda">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" title="Notificações">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </Button>
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
