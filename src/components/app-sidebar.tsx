import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  ShoppingCart,
  CalendarClock,
  Landmark,
  Users,
  UserCog,
  UserRound,
  FileBarChart,
  Settings,
  ContactRound,
  Inbox,
  AlertOctagon,
  ShieldCheck,
} from "lucide-react";

import { useTenant } from "@/lib/tenant";
import { useAuth } from "@/lib/auth";
import { temPermissao, type PermissaoUsuario } from "@/lib/permissoes";
import { ImobControlMark } from "@/components/imobcontrol-brand";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const principal: Array<{
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  permissao?: PermissaoUsuario;
}> = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Empreendimentos", url: "/empreendimentos", icon: Building2, permissao: "EMPREENDIMENTOS_VISUALIZAR" },
  { title: "Vendas", url: "/vendas", icon: ShoppingCart, permissao: "VENDAS_VISUALIZAR" },
  { title: "Clientes", url: "/clientes", icon: ContactRound, permissao: "CLIENTES_VISUALIZAR" },
  { title: "Central de Recebimentos", url: "/recebimentos", icon: Inbox, permissao: "RECEBIMENTOS_VISUALIZAR" },
  { title: "Parcelas", url: "/parcelas", icon: CalendarClock, permissao: "RECEBIMENTOS_VISUALIZAR" },
  { title: "Inadimplência", url: "/inadimplencia", icon: AlertOctagon, permissao: "FINANCEIRO_VISUALIZAR" },
];

const gestao: Array<{
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  permissao: PermissaoUsuario;
}> = [
  { title: "Financeiro", url: "/financeiro", icon: Landmark, permissao: "FINANCEIRO_VISUALIZAR" },
  { title: "Recebedores", url: "/recebedores", icon: Users, permissao: "CONFIGURACOES_GERENCIAR" },
  { title: "Relatórios", url: "/relatorios", icon: FileBarChart, permissao: "RELATORIOS_VISUALIZAR" },
  { title: "Configurações", url: "/configuracoes", icon: Settings, permissao: "CONFIGURACOES_GERENCIAR" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { empresaAtual, modoCliente } = useTenant();
  const { usuario, usuarioReal, simulacaoFuncionario } = useAuth();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({
    select: (r) => r.location.pathname,
  });

  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] shadow-sm shadow-black/10">
            <ImobControlMark className="h-7 w-7" inverse />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-sidebar-foreground">
                ImobControl
              </span>
              <span className="max-w-40 truncate text-xs text-sidebar-foreground/60">
                {empresaAtual?.nome ?? "Gestão imobiliária"}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="mt-2">
        {usuarioReal?.perfil === "SUPER_ADMIN" && !simulacaoFuncionario && !modoCliente && (
          <SidebarGroup>
            <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/admin")}
                    tooltip="Administração"
                  >
                    <Link to="/admin">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Administração</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {principal.filter((item) => !item.permissao || temPermissao(usuario, item.permissao)).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {gestao.filter((item) => temPermissao(usuario, item.permissao)).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {(
                usuario?.perfil === "ADMIN"
                || (usuario?.perfil === "USUARIO" && temPermissao(usuario, "EQUIPE_GERENCIAR"))
                || (usuario?.perfil === "SUPER_ADMIN" && modoCliente)
              ) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/equipe")}
                    tooltip="Equipe e acessos"
                  >
                    <Link to="/equipe">
                      <UserCog className="h-4 w-4" />
                      <span>Equipe e acessos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/conta")}
                  tooltip="Minha conta"
                >
                  <Link to="/conta">
                    <UserRound className="h-4 w-4" />
                    <span>Minha conta</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed ? (
          <div className="px-2 py-2 text-xs text-sidebar-foreground/60">
            © ImobControl
          </div>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
