import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const habilitado = process.env.TEST_MYSQL_INTEGRATION === '1';
const DDL = [
  "CREATE TABLE empresas (id BIGINT PRIMARY KEY, nome VARCHAR(160) NOT NULL, slug VARCHAR(120) NOT NULL, ativa TINYINT(1) NOT NULL, razao_social VARCHAR(200), cnpj VARCHAR(14), email VARCHAR(200), telefone VARCHAR(30), criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE usuarios (id BIGINT PRIMARY KEY, empresa_id BIGINT NULL, nome VARCHAR(160) NOT NULL, email VARCHAR(200) NOT NULL, telefone VARCHAR(30), senha_hash VARCHAR(100) NOT NULL, perfil VARCHAR(30) NOT NULL, ativo TINYINT(1) NOT NULL, senha_definida TINYINT(1) NOT NULL, email_verificado TINYINT(1) NOT NULL, versao BIGINT NOT NULL DEFAULT 0, convite_enviado_em DATETIME, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE usuario_permissoes (usuario_id BIGINT NOT NULL, permissao VARCHAR(80) NOT NULL)",
  "CREATE TABLE node_sessoes (token_hash CHAR(64) PRIMARY KEY, usuario_id BIGINT NOT NULL, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, expira_em DATETIME NOT NULL)",
  "CREATE TABLE tokens_acesso_node (id BIGINT PRIMARY KEY AUTO_INCREMENT, usuario_id BIGINT NOT NULL, tipo VARCHAR(30) NOT NULL, token_hash CHAR(64) NOT NULL, expira_em DATETIME NOT NULL, usado_em DATETIME, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE clientes (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, nome VARCHAR(160) NOT NULL, cpf VARCHAR(11), email VARCHAR(200), telefone VARCHAR(30), cep VARCHAR(8), logradouro VARCHAR(200), numero VARCHAR(30), complemento VARCHAR(120), bairro VARCHAR(120), cidade VARCHAR(120), uf VARCHAR(2), estado_civil VARCHAR(40), profissao VARCHAR(120), versao BIGINT NOT NULL, criado_por_usuario_id BIGINT NOT NULL, atualizado_por_usuario_id BIGINT NOT NULL, criado_em DATETIME NOT NULL, atualizado_em DATETIME NOT NULL, UNIQUE KEY uq_empresa_cpf (empresa_id, cpf))",
  "CREATE TABLE auditoria_operacional (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, usuario_id BIGINT NOT NULL, entidade VARCHAR(60) NOT NULL, entidade_id BIGINT NOT NULL, acao VARCHAR(40) NOT NULL, detalhes LONGTEXT, criado_em DATETIME NOT NULL)",
  "CREATE TABLE empreendimentos (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, nome VARCHAR(160) NOT NULL, spe VARCHAR(160), cnpj VARCHAR(14), area_total DECIMAL(19,4) NOT NULL, tipo VARCHAR(30) NOT NULL, unidades_previstas INT NOT NULL, valor_total DECIMAL(19,2) NOT NULL, socio_nome VARCHAR(160), socio_pct DECIMAL(9,4) NOT NULL, empresa_pct DECIMAL(9,4) NOT NULL, corretor_pct DECIMAL(9,4) NOT NULL, aliquota_tributaria DECIMAL(9,4) NOT NULL, repasse_comissao_pct DECIMAL(9,4) NOT NULL, comissao_sobre_acrescimos TINYINT(1) NOT NULL, inadimplencia_json LONGTEXT, reajuste_contratual_json LONGTEXT, observacoes LONGTEXT, status VARCHAR(30) NOT NULL, versao BIGINT NOT NULL, criado_por_usuario_id BIGINT NOT NULL, atualizado_por_usuario_id BIGINT NOT NULL, criado_em DATETIME NOT NULL, atualizado_em DATETIME NOT NULL)"
];
const DDL_FINANCEIRO = [
  "CREATE TABLE fechamento_mensal_lancamentos (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, empreendimento_id BIGINT NOT NULL, data_lancamento DATE NOT NULL, tipo VARCHAR(35) NOT NULL, descricao VARCHAR(240) NOT NULL, valor DECIMAL(19,2) NOT NULL, criado_por_usuario_id BIGINT NOT NULL, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, estornado_por_usuario_id BIGINT, estornado_em DATETIME)",
  "CREATE TABLE fechamento_mensal_arquivos (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, empreendimento_id BIGINT NOT NULL, mes VARCHAR(7) NOT NULL, relatorio_json LONGTEXT NOT NULL, criado_por_usuario_id BIGINT NOT NULL, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_fechamento_arquivado (empresa_id,empreendimento_id,mes))",
  "CREATE TABLE corretores_empresa (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, nome VARCHAR(160) NOT NULL, documento VARCHAR(30), creci VARCHAR(80), email VARCHAR(200), telefone VARCHAR(30), chave_pix VARCHAR(200), versao BIGINT NOT NULL DEFAULT 0, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_corretor_nome (empresa_id,nome))",
  "CREATE TABLE dividendos_terceiros (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, imovel VARCHAR(200) NOT NULL, valor_base DECIMAL(19,2) NOT NULL, observacoes TEXT, versao BIGINT NOT NULL DEFAULT 0, criado_por_usuario_id BIGINT NOT NULL, atualizado_por_usuario_id BIGINT NOT NULL, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE dividendos_terceiros_participantes (dividendo_id BIGINT NOT NULL, ordem INT NOT NULL, nome VARCHAR(160) NOT NULL, percentual DECIMAL(7,4) NOT NULL, PRIMARY KEY (dividendo_id,ordem), FOREIGN KEY (dividendo_id) REFERENCES dividendos_terceiros(id) ON DELETE CASCADE)",
  "CREATE TABLE acordos (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, venda_id BIGINT NOT NULL, cliente_id BIGINT NOT NULL, data_acordo DATE NOT NULL, valor_original DECIMAL(19,2) NOT NULL, valor_acordo DECIMAL(19,2) NOT NULL, entrada_valor DECIMAL(19,2) NOT NULL, quantidade_parcelas INT NOT NULL, primeiro_vencimento DATE NOT NULL, observacoes LONGTEXT, status VARCHAR(30) NOT NULL, criado_por_usuario_id BIGINT NOT NULL, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE reajustes_venda (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, venda_id BIGINT NOT NULL, data_referencia DATE NOT NULL, percentual_aplicado DECIMAL(9,4) NOT NULL, indice_referencia VARCHAR(80), criado_por_usuario_id BIGINT NOT NULL, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uk_reajustes (empresa_id,venda_id,data_referencia))",
  "CREATE TABLE revisoes_financeiras_vendas (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, venda_id BIGINT NOT NULL, usuario_id BIGINT NOT NULL, justificativa VARCHAR(1000) NOT NULL, versao_anterior BIGINT NOT NULL, versao_nova BIGINT NOT NULL, resumo_anterior TEXT NOT NULL, resumo_novo TEXT NOT NULL, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE unidades (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, empreendimento_id BIGINT NOT NULL, quadra_id BIGINT NULL, numero VARCHAR(80) NOT NULL, unidade VARCHAR(120) NOT NULL, unidade_tipo VARCHAR(30), descricao LONGTEXT, area DECIMAL(19,4) NOT NULL DEFAULT 0, valor_venda DECIMAL(19,2) NOT NULL DEFAULT 0, status VARCHAR(30) NOT NULL, regras_json LONGTEXT, versao BIGINT NOT NULL DEFAULT 0, criado_por_usuario_id BIGINT NOT NULL DEFAULT 1, atualizado_por_usuario_id BIGINT NOT NULL DEFAULT 1, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE vendas (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, empreendimento_id BIGINT NOT NULL, unidade_id BIGINT NOT NULL, cliente_id BIGINT NOT NULL, valor_total DECIMAL(19,2) NOT NULL, data_contrato DATE NOT NULL, corretor_nome VARCHAR(160), corretor_pct DECIMAL(9,4) NOT NULL, repasse_comissao_pct DECIMAL(9,4) NOT NULL, comissao_sobre_acrescimos TINYINT(1) NOT NULL, corretagem_compoe_valor_contrato TINYINT(1), valor_imovel DECIMAL(19,2), corretagem_valor DECIMAL(19,2), corretagem_forma_pagamento VARCHAR(40), observacoes LONGTEXT, status VARCHAR(30) NOT NULL, regras_json LONGTEXT NOT NULL, versao BIGINT NOT NULL, criado_por_usuario_id BIGINT NOT NULL, atualizado_por_usuario_id BIGINT NOT NULL, atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE parcelas (id BIGINT PRIMARY KEY AUTO_INCREMENT, empresa_id BIGINT NOT NULL, venda_id BIGINT NOT NULL, empreendimento_id BIGINT NOT NULL, unidade_id BIGINT NOT NULL, cliente_id BIGINT NOT NULL, origem_tipo VARCHAR(40) NOT NULL, origem_descricao VARCHAR(240), numero INT NOT NULL, total_parcelas INT NOT NULL, vencimento DATE NOT NULL, valor DECIMAL(19,2) NOT NULL, valor_pago DECIMAL(19,2) NOT NULL DEFAULT 0, valor_original DECIMAL(19,2) NOT NULL, reajustes_aplicados INT NOT NULL DEFAULT 0, acordo_id BIGINT, acordo_papel VARCHAR(20), criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, data_pagamento DATE, status VARCHAR(30) NOT NULL, regras_inadimplencia_json LONGTEXT, versao BIGINT NOT NULL DEFAULT 0, atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP)",
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
    for (const table of ['fechamento_mensal_arquivos','fechamento_mensal_lancamentos','dividendos_terceiros_participantes','dividendos_terceiros','corretores_empresa','revisoes_financeiras_vendas','reajustes_venda','acordos','movimentos','parcelas','pagamento_itens','vendas','unidades','auditoria_operacional','clientes','empreendimentos','tokens_acesso_node','node_sessoes','usuario_permissoes','usuarios','empresas']) {
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

    await conn.execute(
      "INSERT INTO unidades (id,empresa_id,empreendimento_id,numero,unidade,area,valor_venda,status) VALUES (5,1,?,'005','Lote Teste',100,600,'disponivel')",
      [empBody.id]
    );
    const criarVenda = await fetch(url + '/api/vendas', {
      method:'POST', headers:csrfHeaders, body:JSON.stringify({
        empreendimentoId: empBody.id, unidadeId:5, clienteId: criado.id,
        valorTotal:'600.00', valorImovel:'570.00', corretagemValor:'30.00',
        corretagemCompoeValorContrato:true,
        corretagemFormaPagamento:'repasse_recebimentos',
        dataContrato:'2026-10-01', corretorNome:'Corretor Teste',
        corretorPct:5, repasseComissaoPct:50, comissaoSobreAcrescimos:false,
        composicao:[
          {tipo:'sinal', descricao:'Entrada', valor:'100.00', parcelas:1, primeiroVencimento:'2026-10-01', status:'pendente'},
          {tipo:'parcelas', descricao:'Mensais', valor:'250.00', parcelas:2, primeiroVencimento:'2026-10-31', status:'pendente'}
        ]
      })
    });
    assert.equal(criarVenda.status,201,'falha ao criar venda: ' + criarVenda.status);
    const vendaCriada = await criarVenda.json();
    assert.equal(vendaCriada.valorTotal,'600.00');
    assert.equal(vendaCriada.composicao.length,2);
    const [parcelasVenda] = await conn.execute('SELECT vencimento, valor FROM parcelas WHERE venda_id = ? ORDER BY vencimento', [vendaCriada.id]);
    assert.equal(parcelasVenda.length,3);
    assert.equal(parcelasVenda[2].valor,'250.00');
    const [unitStatus] = await conn.execute('SELECT status FROM unidades WHERE id = 5');
    assert.equal(unitStatus[0].status,'vendido');
    const repetirVenda = await fetch(url + '/api/vendas', {
      method:'POST', headers:csrfHeaders, body:JSON.stringify({
        empreendimentoId: empBody.id, unidadeId:5, clienteId: criado.id,
        valorTotal:'600.00', valorImovel:'570.00', corretagemValor:'30.00',
        corretagemCompoeValorContrato:true,
        dataContrato:'2026-10-01', corretorPct:5, repasseComissaoPct:50,
        comissaoSobreAcrescimos:false,
        composicao:[{tipo:'avista',valor:'600.00',parcelas:1,primeiroVencimento:'2026-10-01'}]
      })
    });
    assert.equal(repetirVenda.status,409);

    const editarVenda = await fetch(url + '/api/vendas/' + vendaCriada.id, {
      method:'PUT', headers:csrfHeaders, body:JSON.stringify({
        empreendimentoId: empBody.id, unidadeId:5, clienteId: criado.id,
        valorTotal:'600.00', valorImovel:'570.00', corretagemValor:'30.00',
        corretagemCompoeValorContrato:true, corretagemFormaPagamento:'repasse_recebimentos',
        dataContrato:'2026-10-01', corretorNome:'Corretor Teste',
        corretorPct:5, repasseComissaoPct:50, comissaoSobreAcrescimos:false,
        observacoes:'Conferido na integracao MySQL', versao:0,
        composicao:[
          {tipo:'sinal', descricao:'Entrada', valor:'100.00', parcelas:1, primeiroVencimento:'2026-10-01', status:'pendente'},
          {tipo:'parcelas', descricao:'Mensais', valor:'250.00', parcelas:2, primeiroVencimento:'2026-10-31', status:'pendente'}
        ]
      })
    });
    assert.equal(editarVenda.status,200,'editar venda: ' + editarVenda.status);
    const editada = await editarVenda.json();
    assert.equal(editada.versao,1);
    assert.equal(editada.observacoes,'Conferido na integracao MySQL');
    const [recriadas] = await conn.execute('SELECT COUNT(*) AS total FROM parcelas WHERE venda_id=?',[vendaCriada.id]);
    assert.equal(recriadas[0].total,3);

    // Unidade da venda de teste historica: evitar referencia ficticia sem unidade.
    await conn.execute(
      "INSERT INTO unidades (id,empresa_id,empreendimento_id,numero,unidade,area,valor_venda,status) "+
      "VALUES (1,1,?,'001','Lote Historico',100,1000,'vendido')",
      [empBody.id]
    );

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

    const vendaComHistorico = await fetch(url + '/api/vendas/25', {
      method:'DELETE', headers:csrfHeaders
    });
    assert.equal(vendaComHistorico.status,409);
    const [audit] = await conn.query('SELECT COUNT(*) AS total FROM auditoria_operacional');
    assert.equal(audit[0].total, 7);

    // Corretor: CRUD, bloqueio de duplicidade e preservacao de historico em vendas.
    const corrCriado = await fetch(url + '/api/corretores', {
      method:'POST',headers:csrfHeaders,
      body:JSON.stringify({nome:'Corretor Teste',creci:'MG-100',chavePix:'chave teste'})
    });
    assert.equal(corrCriado.status,201,'cadastro corretor: '+corrCriado.status);
    const corretor=await corrCriado.json();
    assert.equal(corretor.versao,0);
    const corrDup=await fetch(url + '/api/corretores', {
      method:'POST',headers:csrfHeaders,body:JSON.stringify({nome:'CORRETOR TESTE'})
    });
    assert.equal(corrDup.status,409,'duplicado por nome deve ser barrado');
    const corrEditado=await fetch(url + '/api/corretores/'+corretor.id, {
      method:'PUT',headers:csrfHeaders,body:JSON.stringify({nome:'Corretor Teste',telefone:'31988887777',versao:0})
    });
    assert.equal(corrEditado.status,200);
    assert.equal((await corrEditado.json()).versao,1);
    const corrStale=await fetch(url + '/api/corretores/'+corretor.id, {
      method:'PUT',headers:csrfHeaders,body:JSON.stringify({nome:'Novo Nome',versao:0})
    });
    assert.equal(corrStale.status,409);
    const corrRenomear=await fetch(url + '/api/corretores/'+corretor.id, {
      method:'PUT',headers:csrfHeaders,body:JSON.stringify({nome:'Renomeado',versao:1})
    });
    assert.equal(corrRenomear.status,409,'vendas historicas nao podem perder nome do corretor');
    const corrExcluir=await fetch(url + '/api/corretores/'+corretor.id,{method:'DELETE',headers:csrfHeaders});
    assert.equal(corrExcluir.status,409,'corretor historico nao pode ser excluido');
    const corrListar=await fetch(url + '/api/corretores',{headers:{cookie:cookies}});
    assert.equal(corrListar.status,200);
    assert.equal((await corrListar.json()).length,1);

    // Dividendos: participantes totalizam 100%, transacao e versao otimista.
    const divInvalido=await fetch(url+'/api/dividendos-terceiros',{
      method:'POST',headers:csrfHeaders,body:JSON.stringify({
        imovel:'Imovel QA',valorBase:100,participantes:[{nome:'A',percentual:90}]
      })
    });
    assert.equal(divInvalido.status,400);
    const divCriado=await fetch(url+'/api/dividendos-terceiros',{
      method:'POST',headers:csrfHeaders,body:JSON.stringify({
        imovel:'Imovel QA',valorBase:1234.56,
        participantes:[{nome:'A',percentual:60},{nome:'B',percentual:40}]
      })
    });
    assert.equal(divCriado.status,201,'cadastro dividendo: '+divCriado.status);
    const dividendo=await divCriado.json();
    assert.equal(dividendo.valorBase,'1234.56');
    assert.equal(dividendo.participantes.length,2);
    assert.equal(dividendo.participantes[0].percentual,'60.0000');
    const divStale=await fetch(url+'/api/dividendos-terceiros/'+dividendo.id,{
      method:'PUT',headers:csrfHeaders,body:JSON.stringify({
        imovel:'Imovel QA',valorBase:1234.56,versao:2,
        participantes:[{nome:'A',percentual:100}]
      })
    });
    assert.equal(divStale.status,409);
    const divEditado=await fetch(url+'/api/dividendos-terceiros/'+dividendo.id,{
      method:'PUT',headers:csrfHeaders,body:JSON.stringify({
        imovel:'Imovel Atualizado',valorBase:350.20,versao:0,
        participantes:[{nome:'A',percentual:35},{nome:'B',percentual:65}]
      })
    });
    assert.equal(divEditado.status,200);
    assert.equal((await divEditado.json()).versao,1);
    const divLista=await fetch(url+'/api/dividendos-terceiros',{headers:{cookie:cookies}});
    assert.equal(divLista.status,200);
    assert.equal((await divLista.json())[0].participantes.length,2);
    const divExcluir=await fetch(url+'/api/dividendos-terceiros/'+dividendo.id,{
      method:'DELETE',headers:csrfHeaders
    });
    assert.equal(divExcluir.status,204);
    const [restantesDiv]=await conn.execute(
      'SELECT COUNT(*) AS total FROM dividendos_terceiros_participantes WHERE dividendo_id=?',[dividendo.id]);
    assert.equal(restantesDiv[0].total,0);


    // Fechamento mensal: estornos excluidos, competencia de pagamento real,
    // lancamentos de caixa e snapshot congelado em mes encerrado.
    const resumoAntes=await fetch(url+'/api/fechamento-mensal?mes=2026-10&empreendimentoId='+empBody.id,{
      headers:{cookie:cookies}
    });
    assert.equal(resumoAntes.status,200);
    assert.equal((await resumoAntes.json()).recebidoParcelas,'0.00',
      'movimento historico estornado nao deve entrar no fechamento');
    const recebimentoValido=await fetch(url+'/api/parcelas/31/receber',{
      method:'POST',headers:csrfHeaders,body:JSON.stringify({data:'2026-10-31'})
    });
    assert.equal(recebimentoValido.status,201);
    const resumoComRecebimento=await fetch(url+'/api/fechamento-mensal?mes=2026-10&empreendimentoId='+empBody.id,{
      headers:{cookie:cookies}
    });
    assert.equal(resumoComRecebimento.status,200);
    const fechamento=await resumoComRecebimento.json();
    assert.equal(fechamento.recebidoParcelas,'103.00');
    assert.equal(fechamento.valorTotalRecebido,'103.00');
    assert.equal(fechamento.glebasComPagamentoMes,1);
    const resumoNovembro=await fetch(url+'/api/fechamento-mensal?mes=2026-11&empreendimentoId='+empBody.id,{
      headers:{cookie:cookies}
    });
    assert.equal((await resumoNovembro.json()).recebidoParcelas,'0.00');
    const despesa=await fetch(url+'/api/fechamento-mensal/lancamentos',{
      method:'POST',headers:csrfHeaders,body:JSON.stringify({
        empreendimentoId:empBody.id,data:'2026-10-15',tipo:'CUSTO_EMPREENDIMENTO',
        descricao:'Custo de teste',valor:'30.00'
      })
    });
    assert.equal(despesa.status,201);
    const lancamento=await despesa.json();
    const comDespesa=await fetch(url+'/api/fechamento-mensal?mes=2026-10&empreendimentoId='+empBody.id,{
      headers:{cookie:cookies}
    });
    const resumoDespesa=await comDespesa.json();
    assert.equal(resumoDespesa.custoEmpreendimento,'30.00');
    assert.equal(resumoDespesa.saldoDisponivelEstimado,'73.00');
    const arquivar=await fetch(url+'/api/fechamento-mensal/arquivos',{
      method:'POST',headers:csrfHeaders,body:JSON.stringify({mes:'2026-10',empreendimentoId:empBody.id})
    });
    assert.equal(arquivar.status,201,'arquivar fechamento: '+arquivar.status);
    const snapshot=await arquivar.json();
    assert.equal(snapshot.relatorio.saldoDisponivelEstimado,'73.00');
    const repetido=await fetch(url+'/api/fechamento-mensal/arquivos',{
      method:'POST',headers:csrfHeaders,body:JSON.stringify({mes:'2026-10',empreendimentoId:empBody.id})
    });
    assert.equal(repetido.status,409);
    const estornarLancamento=await fetch(url+'/api/fechamento-mensal/lancamentos/'+lancamento.id+'/estornar',{
      method:'POST',headers:csrfHeaders,body:'{}'
    });
    assert.equal(estornarLancamento.status,204);
    const estornar2=await fetch(url+'/api/fechamento-mensal/lancamentos/'+lancamento.id+'/estornar',{
      method:'POST',headers:csrfHeaders,body:'{}'
    });
    assert.equal(estornar2.status,409);
    const fechamentoAtualizado=await fetch(url+'/api/fechamento-mensal?mes=2026-10&empreendimentoId='+empBody.id,{
      headers:{cookie:cookies}
    });
    assert.equal((await fechamentoAtualizado.json()).saldoDisponivelEstimado,'103.00');
    const arquivoAntigo=await fetch(url+'/api/fechamento-mensal/arquivos/'+snapshot.id,{
      headers:{cookie:cookies}
    });
    assert.equal(arquivoAntigo.status,200);
    assert.equal((await arquivoAntigo.json()).relatorio.saldoDisponivelEstimado,'73.00',
      'snapshot arquivado deve permanecer imutavel apos estorno');

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
