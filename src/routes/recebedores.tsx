import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/recebedores")({
  component: () => (
    <PlaceholderPage
      eyebrow="Distribuição"
      title="Recebedores"
      description="Configure sócios, corretores e empresa para distribuir automaticamente cada recebimento."
      icon={Users}
    />
  ),
  head: () => ({ meta: [{ title: "Recebedores · ImobControl" }] }),
});
