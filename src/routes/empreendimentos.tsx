import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/empreendimentos")({
  component: () => <Outlet />,
  head: () => ({ meta: [{ title: "Empreendimentos · ImobControl" }] }),
});
