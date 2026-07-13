import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/relatorios")({
  component: () => (
    <PlaceholderPage
      eyebrow="Análises"
      title="Relatórios"
      description="Extraia relatórios gerenciais de vendas, recebimentos, inadimplência e comissões."
      icon={FileBarChart}
    />
  ),
  head: () => ({ meta: [{ title: "Relatórios · ImobControl" }] }),
});
