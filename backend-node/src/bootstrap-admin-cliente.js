import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

// Cadastro pontual solicitado pela proprietaria do Imob Control.
// Apenas conta pendente: a senha e a confirmacao do e-mail sao definidas
// pelo titular via convite (SMTP) ou pela administracao autenticada.
export const ADMIN_SOLICITADO = Object.freeze({
  nome: 'João Paulo',
  email: 'joaopaulo.18@hotmail.com',
  perfil: 'ADMIN',
});

const MIGRACAO = 'admin_cliente_joao_paulo_20261113';
const LOCK = 'imob_adm_joao_paulo_20261113';

export async function cadastrarAdminSolicitadoNoDeploy(
  db,
  { solicitarConvite, emailConfig, logger = console, ambiente = process.env.NODE_ENV,
    empresaIdPreferido = process.env.IMOB_ADMIN_CLIENTE_EMPRESA_ID } = {},
) {
  if (ambiente !== 'production') return { status: 'fora_de_producao' };

  const c = await db.getConnection();
  let bloqueado = false;
  let transacao = false;
  let usuarioCriado = null;

  try {
    // Serializa startups simultaneos, evitando criacao dupla em varios workers.
    const [locks] = await c.query('SELECT GET_LOCK(?, 10) AS adquirido', [LOCK]);
    if (Number(locks[0]?.adquirido) !== 1) {
      logger.warn('[Cadastro de administrador] Outro processo esta aplicando a migracao.');
      return { status: 'ocupado' };
    }
    bloqueado = true;

    await c.query(
      'CREATE TABLE IF NOT EXISTS bootstrap_execucoes (' +
      'codigo VARCHAR(100) NOT NULL PRIMARY KEY, ' +
      'executado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP' +
      ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );

    await c.beginTransaction();
    transacao = true;
    const [marcador] = await c.execute(
      'SELECT codigo FROM bootstrap_execucoes WHERE codigo = ? FOR UPDATE',
      [MIGRACAO],
    );
    if (marcador.length) {
      await c.commit();
      transacao = false;
      return { status: 'ja_executado' };
    }

    // Nunca elevar silenciosamente os privilegios de um usuario preexistente.
    const [usuarios] = await c.execute(
      'SELECT id, perfil, empresa_id FROM usuarios WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [ADMIN_SOLICITADO.email],
    );
    if (usuarios.length) {
      await c.commit();
      transacao = false;
      logger.warn('[Cadastro de administrador] E-mail ja cadastrado; nenhuma permissao foi alterada.');
      return { status: 'ja_cadastrado', perfil: usuarios[0].perfil };
    }

    const empresaId = empresaIdPreferido == null || String(empresaIdPreferido).trim() === ''
      ? null : Number(empresaIdPreferido);
    if (empresaId != null && (!Number.isSafeInteger(empresaId) || empresaId < 1)) {
      await c.commit();
      transacao = false;
      logger.error('[Cadastro de administrador] ID da empresa configurado e invalido.');
      return { status: 'empresa_invalida' };
    }
    // Com mais de uma empresa, exige o ID explicito para evitar acesso cruzado.
    const [empresas] = await c.execute(
      empresaId == null
        ? 'SELECT id, nome FROM empresas WHERE ativa = 1 ORDER BY id LIMIT 2'
        : 'SELECT id, nome FROM empresas WHERE ativa = 1 AND id = ? LIMIT 1',
      empresaId == null ? [] : [empresaId],
    );
    if (empresas.length !== 1) {
      await c.commit();
      transacao = false;
      logger.error(
        '[Cadastro de administrador] Nao foi possivel identificar com seguranca a empresa: ' +
        'existem ' + (empresas.length === 0 ? 'zero' : 'varias') + ' empresas ativas. ' +
        'Nenhum cadastro foi criado.'
      );
      return { status: 'empresa_ambigua' };
    }

    const empresa = empresas[0];
    const senhaAleatoriaNaoCompartilhada = await bcrypt.hash(randomUUID(), 12);
    const [resultado] = await c.execute(
      'INSERT INTO usuarios ' +
      '(empresa_id,nome,email,telefone,senha_hash,perfil,ativo,senha_definida,' +
      'email_verificado,versao,criado_em,atualizado_em) ' +
      'VALUES (?,?,?,?,?,?,1,0,0,0,UTC_TIMESTAMP(),UTC_TIMESTAMP())',
      [empresa.id, ADMIN_SOLICITADO.nome, ADMIN_SOLICITADO.email, null,
        senhaAleatoriaNaoCompartilhada, ADMIN_SOLICITADO.perfil],
    );
    await c.execute(
      'INSERT INTO auditoria_operacional ' +
      '(empresa_id,usuario_id,entidade,entidade_id,acao,criado_em) ' +
      "VALUES (?,?,'USUARIO',?,'ADMIN_CRIADO_DEPLOY',UTC_TIMESTAMP())",
      [empresa.id, resultado.insertId, resultado.insertId],
    );
    await c.execute(
      'INSERT INTO bootstrap_execucoes (codigo) VALUES (?)',
      [MIGRACAO],
    );
    await c.commit();
    transacao = false;
    usuarioCriado = {
      id: resultado.insertId, nome: ADMIN_SOLICITADO.nome,
      email: ADMIN_SOLICITADO.email,
    };
    logger.info('[Cadastro de administrador] Conta pendente criada para ' + empresa.nome + '.');
  } catch (error) {
    if (transacao) {
      try { await c.rollback(); } catch (rollbackError) { logger.error(rollbackError); }
    }
    logger.error('[Cadastro de administrador] Falha; nenhum outro modulo foi alterado:', error.message);
    return { status: 'erro' };
  } finally {
    if (bloqueado) {
      try { await c.query('SELECT RELEASE_LOCK(?)', [LOCK]); }
      catch (error) { logger.warn('[Cadastro de administrador] Falha ao liberar lock:', error.message); }
    }
    c.release();
  }

  if (usuarioCriado && emailConfig?.() && typeof solicitarConvite === 'function') {
    try {
      const enviado = await solicitarConvite(usuarioCriado);
      logger.info('[Cadastro de administrador] Convite ' + (enviado ? 'enviado.' : 'nao enviado.'));
    } catch (error) {
      logger.warn('[Cadastro de administrador] Cadastro criado, convite nao enviado:', error.message);
    }
  } else if (usuarioCriado) {
    logger.warn('[Cadastro de administrador] Conta criada sem senha definida. ' +
      'Configure SMTP para envio de convite ou use Definir acesso no painel SUPER_ADMIN.');
  }
  return { status: 'criado', id: usuarioCriado.id };
}
