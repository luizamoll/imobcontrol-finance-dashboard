import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const habilitado = process.env.TEST_MYSQL_INTEGRATION === '1';
const DDL = [
  "CREATE TABLE empresas (id BIGINT PRIMARY KEY, nome VARCHAR(160) NOT NULL, slug VARCHAR(120) NOT NULL, ativa TINYINT(1) NOT NULL)",
  "CREATE TABLE usuarios (id BIGINT PRIMARY KEY, empresa_id BIGINT NULL, nome VARCHAR(160) NOT NULL, email VARCHAR(200) NOT NULL, telefone VARCHAR(30), senha_hash VARCHAR(100) NOT NULL, perfil VARCHAR(30) NOT NULL, ativo TINYINT(1) NOT NULL, senha_definida TINYINT(1) NOT NULL, email_verificado TINYINT(1) NOT NULL)",
  "CREATE TABLE usuario_permissoes (usuario_id BIGINT NOT NULL, permissao VARCHAR(80) NOT NULL)",
  "CREATE TABLE node_sessoes (token_hash CHAR(64) PRIMARY KEY, usuario_id BIGINT NOT NULL, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, expira_em DATETIME NOT NULL)",
  "CREATE TABLE clientes (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, nome VARCHAR(160) NOT NULL, cpf VARCHAR(11), email VARCHAR(200), telefone VARCHAR(30), cep VARCHAR(8), logradouro VARCHAR(200), numero VARCHAR(30), complemento VARCHAR(120), bairro VARCHAR(120), cidade VARCHAR(120), uf VARCHAR(2), estado_civil VARCHAR(40), profissao VARCHAR(120), versao BIGINT NOT NULL, criado_por_usuario_id BIGINT NOT NULL, atualizado_por_usuario_id BIGINT NOT NULL, criado_em DATETIME NOT NULL, atualizado_em DATETIME NOT NULL, UNIQUE KEY uq_empresa_cpf (empresa_id, cpf))",
  "CREATE TABLE auditoria_operacional (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, usuario_id BIGINT NOT NULL, entidade VARCHAR(60) NOT NULL, entidade_id BIGINT NOT NULL, acao VARCHAR(40) NOT NULL, criado_em DATETIME NOT NULL)",
  "CREATE TABLE empreendimentos (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, nome VARCHAR(160) NOT NULL, spe VARCHAR(160), cnpj VARCHAR(14), area_total DECIMAL(19,4) NOT NULL, tipo VARCHAR(30) NOT NULL, unidades_previstas INT NOT NULL, valor_total DECIMAL(19,2) NOT NULL, socio_nome VARCHAR(160), socio_pct DECIMAL(9,4) NOT NULL, empresa_pct DECIMAL(9,4) NOT NULL, corretor_pct DECIMAL(9,4) NOT NULL, aliquota_tributaria DECIMAL(9,4) NOT NULL, repasse_comissao_pct DECIMAL(9,4) NOT NULL, comissao_sobre_acrescimos TINYINT(1) NOT NULL, inadimplencia_json LONGTEXT, reajuste_contratual_json LONGTEXT, observacoes LONGTEXT, status VARCHAR(30) NOT NULL, versao BIGINT NOT NULL, criado_por_usuario_id BIGINT NOT NULL, atualizado_por_usuario_id BIGINT NOT NULL, criado_em DATETIME NOT NULL, atualizado_em DATETIME NOT NULL)"
];
const DDL_FINANCEIRO = [
  "CREATE TABLE vendas (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, empreendimento_id BIGINT NOT NULL, unidade_id BIGINT NOT NULL, cliente_id BIGINT NOT NULL, valor_total DECIMAL(19,2) NOT NULL, data_contrato DATE NOT NULL, corretor_nome VARCHAR(160), corretor_pct DECIMAL(9,4) NOT NULL, repasse_comissao_pct DECIMAL(9,4) NOT NULL, comissao_sobre_acrescimos TINYINT(1) NOT NULL, corretagem_compoe_valor_contrato TINYINT(1), status VARCHAR(30) NOT NULL, regras_json LONGTEXT NOT NULL, versao BIGINT NOT NULL, criado_por_usuario_id BIGINT NOT NULL, atualizado_por_usuario_id BIGINT NOT NULL, atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE parcelas (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, venda_id BIGINT NOT NULL, empreendimento_id BIGINT NOT NULL, unidade_id BIGINT NOT NULL, cliente_id BIGINT NOT NULL, origem_tipo VARCHAR(40) NOT NULL, origem_descricao VARCHAR(240), numero INT NOT NULL, total_parcelas INT NOT NULL, vencimento DATE NOT NULL, valor DECIMAL(19,2) NOT NULL, valor_pago DECIMAL(19,2) NOT NULL DEFAULT 0, valor_original DECIMAL(19,2) NOT NULL, data_pagamento DATE, status VARCHAR(30) NOT NULL, regras_inadimplencia_json LONGTEXT, versao BIGINT NOT NULL DEFAULT 0, atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE movimentos (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, parcela_id BIGINT NOT NULL, venda_id BIGINT NOT NULL, empreendimento_id BIGINT NOT NULL, unidade_id BIGINT NOT NULL, cliente_id BIGINT NOT NULL, corretor_nome VARCHAR(160), socio_nome VARCHAR(160), origem VARCHAR(40) NOT NULL, origem_descricao VARCHAR(240), data_movimento DATE NOT NULL, usuario_id BIGINT NOT NULL, valor_recebido DECIMAL(19,2) NOT NULL, imposto_reservado DECIMAL(19,2) NOT NULL, comissao_paga DECIMAL(19,2) NOT NULL, empresa_valor DECIMAL(19,2) NOT NULL, socio_valor DECIMAL(19,2) NOT NULL, aliquota_tributaria_aplicada DECIMAL(9,4), empresa_pct_aplicada DECIMAL(9,4), socio_pct_aplicada DECIMAL(9,4), comissao_base_calculo DECIMAL(19,2), comissao_repasse_pct_aplicado DECIMAL(9,4), comissao_sobre_acrescimos_aplicada TINYINT(1), acrescimos_recebidos DECIMAL(19,2), comissao_teorica DECIMAL(19,2), saldo_comissao_apos DECIMAL(19,2), estornado TINYINT(1) NOT NULL DEFAULT 0, estornado_em DATETIME, estornado_por_usuario_id BIGINT)",
  "CREATE TABLE pagamento_itens (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, venda_id BIGINT NOT NULL, tipo VARCHAR(40), descricao VARCHAR(240), valor DECIMAL(19,2), parcelas INT, primeiro_vencimento DATE, status VARCHAR(40))"
];

test('API Node.js + MySQL 8: login, sessao, clientes, catalogo e auditoria', { skip: !habilitado }, async () => {
  const host = process.env.MYSQL_TEST_HOST || '127.0.0.1';
  const user = process.env.MYSQL_TEST_USER || 'root';
  const password = process.env.MYSQL_TEST_PASSWORD || 'imob-ci-password';
  let conn, child;
  try {
    conn = await mysql.createConnection({ host, user, password, port: 3306 });
    await conn.query('CREATE DATABASE IF NOT EXISTS imob_integration CHARACTER SET utf8mb4');
    await conn.query('USE imob_integration');
    for (const table of ['movimentos','parcelas','pagamento_itens','vendas','auditoria_operacional','clientes','empreendimentos','node_sessoes','usuario_permissoes','usuarios','empresas']) {
      await conn.query('DROP TABLE IF EXISTS ' + table);
    }
    for (const statement of [...DDL, ...DDL_FINANCEIRO]) await conn.query(statement);
    const hash = await bcrypt.hash('SenhaSomenteDeTeste123!', 10);
    await conn.execute("INSERT INTO empresas (id,nome,slug,ativa) VALUES (1,'Empresa de Testes','empresa-testes',1)");
    await conn.execute("INSERT INTO usuarios (id,empresa_id,nome,email,senha_hash,perfil,ativo,senha_definida,email_verificado) VALUES (1,1,'Operador de Testes','testes@example.invalid',?,'ADMIN',1,1,1)", [hash]);
    const port = 31577;
    child = spawn(process.execPath, ['src/index.js'], {
      cwd: new URL('../', import.meta.url).pathname,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        COOKIE_SECURE: 'false',
        PORT: String(port),
        DB_HOST: host, DB_PORT: '3306', DB_USER: user,
        DB_PASSWORD: password, DB_NAME: 'imob_integration',
        SESSION_SECRET: 'TestOnlySecret_0123456789_abcdefghijklmnop'
      },
      stdio: ['ignore','pipe','pipe']
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    const url = 'http://127.0.0.1:' + port;
    let online = false;
    for (let i = 0; i < 45; i++) {
      if (child.exitCode !== null) throw new Error('API encerrou: ' + stderr);
      try {
        const r = await fetch(url + '/health');
        if (r.ok) { online = true; break; }
      } catch {}
      await sleep(200);
    }
    if (!online) throw new Error('API nao iniciou: ' + stderr + stdout);
    const csrf = await fetch(url + '/api/auth/csrf');
    assert.equal(csrf.status, 200);
    const csrfData = await csrf.json();
    assert.equal(csrfData.headerName, 'X-CSRF-TOKEN');
    const csrfCookie = csrf.headers.get('set-cookie')?.split(';')[0];
    assert.ok(csrfCookie);
    const login = await fetch(url + '/api/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json', cookie: csrfCookie },
      body: JSON.stringify({ email: 'testes@example.invalid', senha: 'SenhaSomenteDeTeste123!' })
    });
    assert.equal(login.status, 200);
    const loginData = await login.json();
    assert.equal(loginData.perfil, 'ADMIN');
    const session = login.headers.get('set-cookie')?.split(';')[0];
    assert.ok(session?.startsWith('imob_session='));
    const cookies = csrfCookie + '; ' + session;
    const me = await fetch(url + '/api/auth/me', { headers: { cookie: cookies } });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).empresa.id, 1);
    const csrfHeaders = {
      cookie: cookies,
      'content-type': 'application/json',
      'X-CSRF-TOKEN': csrfData.token
    };
    const criar = await fetch(url + '/api/clientes', {
      method: 'POST', headers: csrfHeaders,
      body: JSON.stringify({ nome: 'Cliente de Teste', cpf: '529.982.247-25' })
    });
    assert.equal(criar.status, 201, 'cadastro de cliente: ' + criar.status);
    const criado = await criar.json();
    assert.equal(criado.cpf,'52998224725');
    assert.equal(criado.versao,0);
    const list = await fetch(url + '/api/clientes?pagina=0&tamanho=20', { headers: { cookie: cookies } });
    assert.equal(list.status, 200);
    assert.equal((await list.json()).totalElements, 1);
    const editar = await fetch(url + '/api/clientes/' + criado.id, {
      method: 'PUT', headers: csrfHeaders,
      body: JSON.stringify({ nome: 'Cliente Atualizado', cpf: criado.cpf, versao: 0 })
    });
    assert.equal(editar.status, 200);
    assert.equal((await editar.json()).versao,1);
    const conflito = await fetch(url + '/api/clientes/' + criado.id, {
      method: 'PUT', headers: csrfHeaders,
      body: JSON.stringify({ nome: 'Edicao fora de versao', cpf: criado.cpf, versao: 0 })
    });
    assert.equal(conflito.status,409);
    const emp = await fetch(url + '/api/empreendimentos', {
      method:'POST', headers: csrfHeaders,
      body: JSON.stringify({
        nome:'Empreendimento Teste', spe:null, cnpj:null,
        areaTotal:10.5, tipo:'loteamento', unidadesPrevistas:1,
        valorTotal:'1500.12', socioNome:null, socioPct:25, empresaPct:75,
        corretorPct:5, aliquotaTributaria:2, repasseComissaoPct:50,
        comissaoSobreAcrescimos:false, inadimplencia:null,
        reajusteContratual:null, observacoes:null, status:'ativo'
      })
    });
    assert.equal(emp.status, 201, 'novo empreendimento: ' + emp.status);
    const empBody = await emp.json();
    assert.equal(empBody.valorTotal, '1500.12');

    // Teste de recebimento real: usa data efetiva de outubro,
    // segundo clique devolve 409 e estorno preserva auditoria.
    await conn.execute(
      'INSERT INTO vendas (id,empresa_id,empreendimento_id,unidade_id,cliente_id,valor_total,data_contrato,corretor_nome,corretor_pct,repasse_comissao_pct,comissao_sobre_acrescimos,corretagem_compoe_valor_contrato,status,regras_json,versao,criado_por_usuario_id,atualizado_por_usuario_id) '
      + 'VALUES (25,1,?,1,?,"1000.00","2026-09-01","Corretor QA",5,50,0,1,"ativa",?,0,1,1)',
      [empBody.id, criado.id,
       JSON.stringify({ aliquotaTributaria: 2, empresaPct: 75, socioPct: 25,
         inadimplencia: {jurosAtivo: true, jurosTipo: 'mensal', jurosPctMes: 2, moraAtiva:true, moraPct:1} })]
    );
    await conn.execute(
      "INSERT INTO parcelas (id,empresa_id,venda_id,empreendimento_id,unidade_id,cliente_id,origem_tipo,origem_descricao,numero,total_parcelas,vencimento,valor,valor_original,status,versao) "
      + "VALUES (31,1,25,?,1,?,'sinal','Entrada',1,1,'2026-10-01',100,100,'pendente',0)",
      [empBody.id, criado.id]
    );
    const pagamento = await fetch(url + '/api/parcelas/31/receber', {
      method: 'POST', headers: csrfHeaders,
      body: JSON.stringify({ valorRecebido: null, data: '2026-10-31' })
    });
    assert.equal(pagamento.status, 201, 'falha ao receber: ' + pagamento.status);
    const pago = await pagamento.json();
    assert.equal(pago.valorRecebido, '103.00');
    assert.equal(pago.comissaoPaga, '50.00');
    assert.equal(pago.data, '2026-10-31');
    const [antesEstorno] = await conn.execute('SELECT data_pagamento, status FROM parcelas WHERE id = 31');
    assert.equal(antesEstorno[0].data_pagamento.toISOString().slice(0, 10), '2026-10-31');
    assert.equal(antesEstorno[0].status, 'paga');
    const segundoClique = await fetch(url + '/api/parcelas/31/receber', {
      method:'POST', headers:csrfHeaders,
      body:JSON.stringify({ data:'2026-10-31' })
    });
    assert.equal(segundoClique.status, 409);
    const [duplos] = await conn.execute('SELECT COUNT(*) AS total FROM movimentos WHERE parcela_id = 31 AND estornado = 0');
    assert.equal(duplos[0].total, 1);
    const estorno = await fetch(url + '/api/parcelas/31/reverter', {
      method:'POST', headers:csrfHeaders, body: '{}'
    });
    assert.equal(estorno.status,204);
    const [movimentoEstornado] = await conn.execute('SELECT estornado, estornado_em FROM movimentos WHERE parcela_id = 31');
    assert.equal(movimentoEstornado[0].estornado,1);
    assert.ok(movimentoEstornado[0].estornado_em);
    const [parcelaEstornada] = await conn.execute('SELECT status, valor_pago, data_pagamento FROM parcelas WHERE id = 31');
    assert.equal(parcelaEstornada[0].status,'vencida');
    assert.equal(parcelaEstornada[0].valor_pago,'0.00');
    assert.equal(parcelaEstornada[0].data_pagamento,null);
    const estornoRepetido = await fetch(url + '/api/parcelas/31/reverter', {
      method:'POST', headers:csrfHeaders, body:'{}'
    });
    assert.equal(estornoRepetido.status, 404);
    const [audit] = await conn.query('SELECT COUNT(*) AS total FROM auditoria_operacional');
    assert.equal(audit[0].total, 5);
    const unauthorized = await fetch(url + '/api/clientes?pagina=0&tamanho=20');
    assert.equal(unauthorized.status,401);
    const invalidCSRF = await fetch(url + '/api/clientes', {
      method: 'POST', headers: { cookie: cookies, 'content-type': 'application/json' },
      body: JSON.stringify({ nome:'Nao pode' })
    });
    assert.equal(invalidCSRF.status,403);
    const logout = await fetch(url + '/api/auth/logout', { method:'POST', headers:{cookie:cookies} });
    assert.equal(logout.status,204);
    const meAfter = await fetch(url + '/api/auth/me', {headers:{cookie:cookies}});
    assert.equal(meAfter.status,401);
  } finally {
    if (child) child.kill();
    if (conn) await conn.end();
  }
});
