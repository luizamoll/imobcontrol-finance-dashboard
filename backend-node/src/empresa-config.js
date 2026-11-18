// Perfil e configuracao de empresa; isolados por tenant, com auditoria.
const toPerfil = p => ({
  id: p.id, nome: p.nome, razaoSocial: p.razao_social,
  cnpj: p.cnpj, email: p.email, telefone: p.telefone,
  ativa: Boolean(p.ativa), atualizadoEm: p.atualizado_em?.replace(' ', 'T')
});
function erroConfig(body, bad) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
      || !body.config || typeof body.config !== 'object' || Array.isArray(body.config)) {
    throw bad(400, 'Configuracao invalida');
  }
  const p = body.config.padroesEmpreendimento;
  if (p != null) {
    if (typeof p !== 'object' || Array.isArray(p)) throw bad(400, 'Padroes invalidos');
    const c = ['socioPct','empresaPct','corretorPct','aliquotaTributaria','repasseComissaoPct'];
    for (const campo of c) {
      if (p[campo] == null) continue;
      if (typeof p[campo] !== 'number' || !Number.isFinite(p[campo]) || p[campo] < 0 || p[campo] > 100) {
        throw bad(400, campo + ' invalido');
      }
    }
    if (p.socioPct != null && p.empresaPct != null && Math.abs(p.socioPct + p.empresaPct - 100) > 1e-9) {
      throw bad(400, 'Socio e empresa devem totalizar 100%');
    }
    const inad = p.inadimplencia;
    if (inad != null) {
      if (typeof inad !== 'object' || Array.isArray(inad)) throw bad(400, 'Inadimplencia invalida');
      for (const campo of ['correcaoPctMes','jurosPctMes','jurosPctDia','moraPct']) {
        if (inad[campo] == null) continue;
        if (typeof inad[campo] !== 'number' || !Number.isFinite(inad[campo]) || inad[campo] < 0) {
          throw bad(400, campo + ' invalido');
        }
      }
    }
  }
  return JSON.stringify(body.config);
}
export function registerEmpresaConfig(app, {db, exigirLogin, empresaAutorizada, exigirPermissao, handler, bad}) {
  const obterEmpresa = async id => {
    const [rows] = await db.execute(
      'SELECT id, nome, razao_social, cnpj, email, telefone, ativa, atualizado_em FROM empresas WHERE id = ?',
      [id]
    );
    if (!rows.length) throw bad(404, 'Empresa nao encontrada');
    return toPerfil(rows[0]);
  };
  app.get('/api/empresa/perfil', exigirLogin, handler(async (req, res) => {
    await exigirPermissao(req, ['CONFIGURACOES_GERENCIAR']);
    const id = await empresaAutorizada(req);
    res.json(await obterEmpresa(id));
  }));
  app.put('/api/empresa/perfil', exigirLogin, handler(async (req,res) => {
    await exigirPermissao(req, ['CONFIGURACOES_GERENCIAR']);
    const id = await empresaAutorizada(req);
    const b = req.body;
    if (!b || typeof b.nome !== 'string' || b.nome.trim().length < 1 || b.nome.trim().length > 160) {
      throw bad(400, 'Nome da empresa invalido');
    }
    const valor = (key,max) => {
      const x=b[key]; if (x==null || x==='') return null;
      if (typeof x!=='string' || x.trim().length > max) throw bad(400, key + ' invalido');
      return x.trim() || null;
    };
    let cnpj=valor('cnpj',18);
    if (cnpj) {
      cnpj=cnpj.replace(/\D/g,'');
      if (cnpj.length !== 14) throw bad(400, 'CNPJ invalido');
    }
    let email=valor('email',200);
    if (email) {
      email=email.toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw bad(400, 'E-mail invalido');
    }
    const conn=await db.getConnection();
    try {
      await conn.beginTransaction();
      const [rows]=await conn.execute('SELECT id FROM empresas WHERE id = ? FOR UPDATE', [id]);
      if (!rows.length) throw bad(404, 'Empresa nao encontrada');
      if (cnpj) {
        const [duplicates]=await conn.execute('SELECT id FROM empresas WHERE cnpj = ? AND id <> ?', [cnpj,id]);
        if (duplicates.length) throw bad(409, 'CNPJ ja cadastrado');
      }
      await conn.execute(
        'UPDATE empresas SET nome = ?, razao_social = ?, cnpj = ?, email = ?, telefone = ?, atualizado_em = UTC_TIMESTAMP() WHERE id = ?',
        [b.nome.trim(), valor('razaoSocial',200),cnpj,email,valor('telefone',30),id]
      );
      await conn.execute(
        "INSERT INTO auditoria_operacional (empresa_id, usuario_id, entidade, entidade_id, acao, criado_em) VALUES (?, ?, 'EMPRESA', ?, 'DADOS_CADASTRAIS_ATUALIZADOS', UTC_TIMESTAMP())",
        [id, req.usuario.id, id]
      );
      await conn.commit();
    } catch(e) { await conn.rollback(); throw e; } finally {conn.release();}
    res.json(await obterEmpresa(id));
  }));
  app.get('/api/configuracao-empresa', exigirLogin, handler(async(req,res) => {
    await exigirPermissao(req, ['CONFIGURACOES_GERENCIAR','EMPREENDIMENTOS_GERENCIAR']);
    const id=await empresaAutorizada(req);
    const [rows]=await db.execute('SELECT empresa_id, config_json, versao, atualizado_em FROM configuracoes_empresa WHERE empresa_id = ?', [id]);
    const row=rows[0];
    res.json({
      empresaId:id, config:row?.config_json ? JSON.parse(row.config_json) : {},
      versao:row?.versao ?? null, atualizadoEm:row?.atualizado_em?.replace(' ', 'T') ?? null
    });
  }));
  app.put('/api/configuracao-empresa', exigirLogin, handler(async(req,res) => {
    await exigirPermissao(req, ['CONFIGURACOES_GERENCIAR']);
    const id=await empresaAutorizada(req);
    const json=erroConfig(req.body,bad);
    const versao=req.body.versao;
    if (versao != null && (!Number.isSafeInteger(versao) || versao < 0)) throw bad(400,'Versao invalida');
    const conn=await db.getConnection();
    let atualizado;
    try {
      await conn.beginTransaction();
      const [rows]=await conn.execute('SELECT versao FROM configuracoes_empresa WHERE empresa_id = ? FOR UPDATE', [id]);
      if (rows.length) {
        if (versao == null || Number(rows[0].versao) !== versao) throw bad(409,'Configuracao alterada por outra sessao');
        await conn.execute(
          'UPDATE configuracoes_empresa SET config_json = ?, versao = versao + 1, atualizado_por_usuario_id = ?, atualizado_em = UTC_TIMESTAMP() WHERE empresa_id = ?',
          [json,req.usuario.id,id]
        );
      } else {
        if (versao != null) throw bad(409,'Configuracao ainda nao existe');
        await conn.execute(
          'INSERT INTO configuracoes_empresa (empresa_id,config_json,versao,atualizado_por_usuario_id,atualizado_em) VALUES (?,?,0,?,UTC_TIMESTAMP())',
          [id,json,req.usuario.id]
        );
      }
      await conn.execute(
        "INSERT INTO auditoria_operacional (empresa_id,usuario_id,entidade,entidade_id,acao,criado_em) VALUES (?,?,'CONFIGURACAO_EMPRESA',?,'ATUALIZACAO',UTC_TIMESTAMP())",
        [id,req.usuario.id,id]
      );
      const [salvo]=await conn.execute('SELECT versao,atualizado_em FROM configuracoes_empresa WHERE empresa_id = ?', [id]);
      atualizado={empresaId:id,config:req.body.config,versao:salvo[0].versao,atualizadoEm:salvo[0].atualizado_em?.replace(' ','T')};
      await conn.commit();
    } catch(e) { await conn.rollback(); throw e; } finally {conn.release();}
    res.json(atualizado);
  }));
}
