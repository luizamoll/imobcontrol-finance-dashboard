import { createFileRoute } from "@tanstack/react-router";
import { Landmark } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/financeiro")({
  component: () => (
    <PlaceholderPage
      eyebrow="Tesouraria"
      title="Financeiro"
      description="Fluxo de caixa, contas a pagar, conciliação bancária e distribuição financeira."
      icon={Landmark}
    />
  ),
  head: () => ({ meta: [{ title: "Financeiro · ImobControl" }] }),
});
