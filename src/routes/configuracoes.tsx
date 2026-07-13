import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/configuracoes")({
  component: () => (
    <PlaceholderPage
      eyebrow="Sistema"
      title="Configurações"
      description="Gerencie usuários, permissões, integrações e preferências da sua imobiliária."
      icon={Settings}
    />
  ),
  head: () => ({ meta: [{ title: "Configurações · ImobControl" }] }),
});
