import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const url = 'http://127.0.0.1:31821';
const child = spawn(process.execPath, ['.output/server/index.mjs'], {
  env: {
    ...process.env,
    NODE_ENV: 'test', PORT: '31821',
    DB_HOST: '127.0.0.1', DB_PORT: '3306',
    DB_USER: 'teste', DB_PASSWORD: 'ficticia',
    DB_NAME: 'imob_qa',
    SESSION_SECRET: 'Chave-local-para-testes-0123456789abcdef',
    COOKIE_SECURE: 'false'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
let logs = '';
for (const stream of [child.stdout, child.stderr]) {
  stream.on('data', data => { logs += String(data).slice(0, 4000); });
}
async function waitForServer() {
  for(let i = 0; i < 90; i++) {
    if(child.exitCode !== null) throw new Error('Servidor parou: ' + logs);
    try {
      const res = await fetch(url + '/api/auth/csrf');
      if (res.status === 200) return res;
    } catch {}
    await delay(300);
  }
  throw new Error('Servidor unico nao iniciou: ' + logs);
}

try {
  const csrf = await waitForServer();
  assert.equal(csrf.status, 200);
  const body = await csrf.json();
  assert.equal(body.headerName, 'X-CSRF-TOKEN');
  assert.ok(csrf.headers.get('set-cookie')?.includes('imob_csrf'));

  // Regressao principal: o deploy Nitro NAO pode devolver 404 HTML em /api/auth/login.
  const login = await fetch(url + '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: '', senha: '' })
  });
  assert.equal(login.status, 401,
    'POST /api/auth/login precisa existir no Nitro; se 404, nao chegou ao Express.');
  assert.match(login.headers.get('content-type') || '', /application\/json/);
  assert.match((await login.json()).erro, /E-mail ou senha invalidos/);

  const unauthorized = await fetch(url + '/api/clientes');
  assert.equal(unauthorized.status, 401, 'Express precisa atender /api/clientes');

  const missing = await fetch(url + '/api/rota-inexistente');
  assert.equal(missing.status, 501, 'Rotas API nao podem cair no HTML do Nitro');

  const home = await fetch(url + '/login');
  const html = await home.text();
  assert.equal(home.status, 200, 'SSR falhou: ' + home.status + ' ' + html.slice(0, 300) + logs.slice(-800));
  assert.match(home.headers.get('content-type')||'', /text\/html/);
  assert.match(html, /<html/i);

  console.log('PASSOU: Nitro server/index.mjs serviu 1 porta, POST /api/auth/login = 401 JSON, API e SSR /login.');
} finally {
  child.kill('SIGTERM');
}
