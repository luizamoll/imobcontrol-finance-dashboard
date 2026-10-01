import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/vendas")({
  component: () => <Outlet />,
  head: () => ({ meta: [{ title: "Vendas · ImobControl" }] }),
});
