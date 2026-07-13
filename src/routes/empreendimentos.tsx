import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/empreendimentos")({
  component: () => (
    <PlaceholderPage
      eyebrow="Portfólio"
      title="Empreendimentos"
      description="Cadastre e acompanhe cada empreendimento, unidades, VGV e status de comercialização."
      icon={Building2}
    />
  ),
  head: () => ({ meta: [{ title: "Empreendimentos · ImobControl" }] }),
});
