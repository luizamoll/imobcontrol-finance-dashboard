// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "node_server",
    // O arquivo iniciado pela Hostinger e o Nitro gerado em .output/server/index.mjs.
    // Registre a API Node nele, com handlers de formato Node que executam o Express
    // no MESMO processo e sem chamar um segundo servidor.
    routes: {
      "/api/**": { handler: "./backend-node/src/index.js", format: "node" },
      "/health": { handler: "./backend-node/src/index.js", format: "node" },
      "/actuator/health": { handler: "./backend-node/src/index.js", format: "node" },
    },
    output: { dir: ".output" },
  },
});
