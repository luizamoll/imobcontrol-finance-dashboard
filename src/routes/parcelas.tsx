import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/parcelas")({
  component: () => (
    <PlaceholderPage
      eyebrow="Cobrança"
      title="Parcelas"
      description="Controle o cronograma de parcelas, reajustes, boletos e status de cada recebimento."
      icon={CalendarClock}
    />
  ),
  head: () => ({ meta: [{ title: "Parcelas · ImobControl" }] }),
});
