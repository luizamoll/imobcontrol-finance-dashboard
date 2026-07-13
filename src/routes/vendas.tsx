import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/vendas")({
  component: () => (
    <PlaceholderPage
      eyebrow="Comercial"
      title="Vendas"
      description="Registre novas vendas, contratos, sinal, condições de pagamento e comissionamento."
      icon={ShoppingCart}
    />
  ),
  head: () => ({ meta: [{ title: "Vendas · ImobControl" }] }),
});
