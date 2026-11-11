// Hostinger: uma unica aplicacao Node.js, uma unica porta.
// Express atende /api e /health; Nitro/TanStack SSR atende todas as paginas.
// As credenciais MySQL devem estar no ambiente da aplicacao, nunca no Git.
import express from 'express';
import apiApp from '../backend-node/src/index.js';
import { middleware as nitroMiddleware } from '../.output/server/index.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, '.output', 'public');

// A pasta .output/public e gerada pelo Vite. Serve somente assets publicados;
// nenhuma pasta de banco, backend ou arquivo privado fica exposta.
apiApp.use(express.static(publicDir, {
  fallthrough: true,
  index: false,
  dotfiles: 'deny',
  etag: true,
  maxAge: '1h'
}));

// O middleware Nitro recebe os mesmos req/res do Express (sem fetch,
// sem segunda porta, sem round-trip HTTP, sem API_UPSTREAM).
apiApp.use((req, res, next) => {
  Promise.resolve(nitroMiddleware(req, res)).catch(next);
});

const port = Number(process.env.PORT || 3000);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT deve ser uma porta TCP valida');
}
apiApp.listen(port, '0.0.0.0', () => {
  console.log('Imob Control (Express + Nitro SSR + MySQL) em porta ' + port);
});
