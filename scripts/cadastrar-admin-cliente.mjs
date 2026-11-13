/**
 * Cadastro pontual de ADMIN pela API existente do Imob Control.
 *
 * Uso (Windows, Node 22+):
 *   node scripts/cadastrar-admin-cliente.mjs
 *
 * Segurança:
 * - Executa localmente, NÃO roda no deploy ou na inicialização do servidor.
 * - Exige credenciais válidas de SUPER_ADMIN.
 * - Nunca salva senhas, cookies ou dados do cliente em arquivos.
 * - Confirma a empresa, verifica e-mail duplicado e exige "CRIAR" antes do POST.
 * - Usa o endpoint oficial, preservando trilha de auditoria e convites.
 */

import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import process from 'node:process';

if (!process.stdin.isTTY) {
  console.error('Execute em um terminal interativo (PowerShell ou terminal do VS Code).');
  process.exitCode = 1;
} else {
  await main();
}

async function perguntar(mensagem, ocultar = false) {
  if (!ocultar) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      return (await rl.question(mensagem)).trim();
    } finally {
      rl.close();
    }
  }

  // Com terminal no modo readline, a saída dos caracteres é descartada.
  // A senha não aparece na tela nem precisa ser passada por argumento.
  process.stdout.write(mensagem);
  const sink = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  const rl = createInterface({ input: process.stdin, output: sink, terminal: true });
  try {
    return await rl.question('');
  } finally {
    rl.close();
    process.stdout.write('\n');
  }
}

async function main() {
  const cookies = new Map();
  let raiz = '';

  function guardarCookies(headers) {
    const linhas = typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : [headers.get('set-cookie')].filter(Boolean);
    for (const linha of linhas) {
      const par = linha.split(';', 1)[0];
      const separador = par.indexOf('=');
      if (separador > 0) cookies.set(par.slice(0, separador), par.slice(separador + 1));
    }
  }

  async function requisitar(caminho, { method = 'GET', body, csrf } = {}) {
    const headers = { Accept: 'application/json' };
    if (cookies.size) headers.Cookie = [...cookies].map(([k, v]) => k + '=' + v).join('; ');
    if (body) headers['Content-Type'] = 'application/json';
    if (csrf) headers['X-CSRF-TOKEN'] = csrf;

    const resposta = await fetch(raiz + caminho, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
    });
    guardarCookies(resposta.headers);

    const texto = await resposta.text();
    let dados;
    try {
      dados = texto ? JSON.parse(texto) : null;
    } catch {
      throw new Error('Resposta inesperada do servidor (' + resposta.status + ').');
    }
    if (!resposta.ok) {
      throw new Error('HTTP ' + resposta.status + ': ' +
        (dados?.erro || dados?.detail || dados?.message || 'Operação não concluída'));
    }
    return dados;
  }

  console.log('\nIMOB CONTROL | Cadastro manual de administrador');
  console.log('O banco só será alterado após sua confirmação explícita.\n');

  const entrada = await perguntar('Endereço HTTPS do Imob Control (ex.: https://seu-dominio.com): ');
  try {
    const url = new URL(entrada);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error('Use apenas a origem HTTPS do sistema, sem caminhos, usuário ou senha.');
    }
    raiz = url.origin;
  } catch (error) {
    throw new Error('URL inválida. ' + error.message);
  }

  const emailAdmin = (await perguntar('E-mail do seu usuário SUPER_ADMIN: ')).toLowerCase();
  const senhaAdmin = await perguntar('Senha do SUPER_ADMIN (não será exibida): ', true);
  if (!emailAdmin || !senhaAdmin) throw new Error('Credenciais obrigatórias.');

  try {
    await requisitar('/api/auth/csrf');
    await requisitar('/api/auth/login', {
      method: 'POST',
      body: { email: emailAdmin, senha: senhaAdmin },
    });
    const conta = await requisitar('/api/auth/me');
    if (conta?.perfil !== 'SUPER_ADMIN') {
      throw new Error('Conta autenticada sem o perfil SUPER_ADMIN. Nenhuma alteração realizada.');
    }

    const empresas = await requisitar('/api/super-admin/empresas');
    if (!Array.isArray(empresas) || empresas.length === 0) {
      throw new Error('Não há empresas ativas disponíveis. Nenhuma alteração realizada.');
    }
    console.log('\nEmpresas ativas:');
    for (const empresa of empresas) {
      console.log('  [' + empresa.id + '] ' + empresa.nome);
    }

    const idTexto = await perguntar('\nID da empresa do cliente: ');
    const empresaId = Number(idTexto);
    if (!/^[1-9]\d*$/.test(idTexto) || !Number.isSafeInteger(empresaId)) {
      throw new Error('ID da empresa inválido.');
    }
    const empresa = empresas.find((e) => Number(e.id) === empresaId);
    if (!empresa) throw new Error('Empresa não encontrada na lista de empresas ativas.');

    const nome = await perguntar('Nome completo do novo administrador: ');
    const email = (await perguntar('E-mail do novo administrador: ')).toLowerCase();
    if (!nome || nome.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
      throw new Error('Nome ou e-mail inválidos.');
    }

    const filtro = encodeURIComponent(email);
    const encontrados = await requisitar('/api/super-admin/usuarios?pagina=0&tamanho=200&busca=' + filtro);
    const existente = encontrados?.content?.find((u) => u.email?.toLowerCase() === email);
    if (existente) {
      console.log('\nO e-mail já está cadastrado: ID ' + existente.id +
        ', perfil ' + existente.perfil + ', empresa ' + (existente.empresa?.nome || 'Sistema') + '.');
      console.log('Nenhum cadastro foi criado. Verifique esse usuário no painel.');
      return;
    }

    console.log('\nConfira antes de gravar:');
    console.log('  Empresa: ' + empresa.nome + ' (ID ' + empresaId + ')');
    console.log('  Nome: ' + nome);
    console.log('  E-mail: ' + email);
    console.log('  Permissão: ADMIN (acesso administrativo à empresa selecionada)');
    const confirmacao = await perguntar('\nDigite CRIAR para confirmar a inclusão: ');
    if (confirmacao !== 'CRIAR') {
      console.log('Operação cancelada. Nenhuma alteração realizada.');
      return;
    }

    const csrf = await requisitar('/api/auth/csrf');
    const criado = await requisitar('/api/super-admin/usuarios', {
      method: 'POST',
      csrf: csrf.token,
      body: { nome, email, empresaId, perfil: 'ADMIN' },
    });
    console.log('\nAdministrador criado com sucesso. ID: ' + criado.id);
    console.log('Empresa: ' + (criado.empresa?.nome || empresa.nome));
    console.log('Verifique o envio do convite na tela Administração > Usuários e acessos.');
    console.log('Se o SMTP não estiver configurado, use a opção Definir acesso no painel.');
  } finally {
    if (cookies.has('imob_session')) {
      try {
        await requisitar('/api/auth/logout', { method: 'POST' });
      } catch {
        // Não oculta o erro original; o servidor expira sessões automaticamente.
      }
    }
  }
}
