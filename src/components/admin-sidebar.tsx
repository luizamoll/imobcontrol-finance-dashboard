import { useRouterState } from "@tanstack/react-router";
import {
  Building2,
  LayoutDashboard,
  ScrollText,
  Users,
  UserRound,
} from "lucide-react";

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

const itens = [
  { title: "Visão geral", url: "/admin", icon: LayoutDashboard },
  { title: "Empresas", url: "/admin/empresas", icon: Building2 },
  { title: "Usuários e acessos", url: "/admin/usuarios", icon: Users },
  { title: "Auditoria", url: "/admin/auditoria", icon: ScrollText },
  { title: "Minha conta", url: "/admin/conta", icon: UserRound },
] as const;

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (path: string) =>
    path === "/admin" ? currentPath === "/admin" : currentPath.startsWith(path);

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
              <span className="text-xs text-sidebar-foreground/60">
                Administração da plataforma
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="mt-2">
        <SidebarGroup>
          <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {itens.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Ambientes de clientes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Abrir ambiente operacional">
                  <a href="/">
                    <Building2 className="h-4 w-4" />
                    <span>Abrir ambiente operacional</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-2 py-2 text-xs text-sidebar-foreground/60">
            © ImobControl
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
