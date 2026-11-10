import { mapear, empFields, quadraFields, unidadeFields } from './catalogo.js';

// Tabelas e colunas fechadas: jamais interpolar nomes recebidos do navegador.
const config = {
  empreendimentos: {
    entity: 'EMPREENDIMENTO', fields: empFields,
    inputs: {
      nome: ['nome', 'text', 160, true], spe: ['spe','text',160],
      cnpj: ['cnpj', 'cnpj', 14], areaTotal: ['area_total','dec4'],
      tipo: ['tipo','text',30,true], unidadesPrevistas: ['unidades_previstas','integer'],
      valorTotal: ['valor_total','dec2'], socioNome: ['socio_nome','text',160],
      socioPct: ['socio_pct','pct'], empresaPct: ['empresa_pct','pct'],
      corretorPct: ['corretor_pct','pct'], aliquotaTributaria: ['aliquota_tributaria','pct'],
      repasseComissaoPct: ['repasse_comissao_pct','pct'],
      comissaoSobreAcrescimos: ['comissao_sobre_acrescimos','bool'],
      inadimplencia: ['inadimplencia_json','json'],
      reajusteContratual: ['reajuste_contratual_json','json'],
      observacoes: ['observacoes','text',65000], status: ['status','text',30,true]
    }
  },
  quadras: {
    entity: 'QUADRA', fields: quadraFields,
    inputs: {
      empreendimentoId: ['empreendimento_id','id'],
      nome: ['nome','text',120,true], tipoAgrupamento: ['tipo_agrupamento','agrupamento'],
      descricao: ['descricao','text',65000], regras: ['regras_json','json']
    }
  },
  unidades: {
    entity: 'UNIDADE', fields: unidadeFields,
    inputs: {
      empreendimentoId: ['empreendimento_id','id'],
      quadraId: ['quadra_id','optionalId'],
      numero: ['numero','text',80,true], unidade: ['unidade','text',120,true],
      unidadeTipo: ['unidade_tipo','text',30], descricao: ['descricao','text',65000],
      area: ['area','dec4'], valorVenda: ['valor_venda','dec2'],
      status: ['status','text',30,true], regras: ['regras_json','json']
    }
  }
};
const idValido = n => Number.isSafeInteger(n) && n > 0;
const numero = (value, maxDec, maxInteiros, bad, campo) => {
  if (value === null || value === undefined || value === '') throw bad(400, 'Informe ' + campo);
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d+(\.\d+)?$/.test(String(value))) throw bad(400, campo + ' invalido');
  let s = String(value);
  const [inteira, decimal = ''] = s.split('.');
  if (decimal.length > maxDec || inteira.length > maxInteiros) throw bad(400, campo + ' fora da precisao permitida');
  return s;
};
function validarRegras(regras, bad) {
  if (regras == null) return;
  if (typeof regras !== 'object' || Array.isArray(regras)) throw bad(400, 'Regras devem ser um objeto');
  const percentual = campo => {
    if (regras[campo] == null) return null;
    const valor = numero(regras[campo], 4, 3, bad, campo);
    if (Number(valor) > 100) throw bad(400, campo + ' superior a 100');
    return Number(valor);
  };
  const socio = percentual('socioPct'), empresa = percentual('empresaPct');
  percentual('corretorPct');
  percentual('aliquotaTributaria');
  percentual('repasseComissaoPct');
  if (socio != null && empresa != null && Math.abs((socio + empresa) - 100) > 0.000001) {
    throw bad(400, 'Participacoes da empresa e socio devem somar 100%');
  }
  const inad = regras.inadimplencia;
  if (inad != null) {
    if (typeof inad !== 'object' || Array.isArray(inad)) throw bad(400, 'Regra de inadimplencia invalida');
    for (const campo of ['correcaoPctMes','jurosPctMes','jurosPctDia','moraPct']) {
      if (inad[campo] != null) numero(inad[campo], 4, 7, bad, campo);
    }
    if (inad.diasTolerancia != null && (!Number.isSafeInteger(inad.diasTolerancia) || inad.diasTolerancia < 0)) {
      throw bad(400, 'Dias de tolerancia invalidos');
    }
  }
}
function validarReajuste(reajuste, bad) {
  if (reajuste == null) return;
  if (typeof reajuste !== 'object' || Array.isArray(reajuste)) throw bad(400, 'Reajuste invalido');
  for (const campo of ['percentualBase','gatilhoPercentual']) {
    if (reajuste[campo] != null) numero(reajuste[campo],4,7,bad,campo);
  }
  if (reajuste.periodicidadeMeses != null &&
      (!Number.isSafeInteger(reajuste.periodicidadeMeses) || reajuste.periodicidadeMeses < 1)) {
    throw bad(400, 'Periodicidade de reajuste invalida');
  }
}
export function normalizarCatalogo(tipo, body, bad) {
  const cfg = config[tipo];
  if (!cfg || body == null || typeof body !== 'object' || Array.isArray(body)) throw bad(400, 'Dados invalidos');
  const campos = {};
  for (const [input, [column, kind, max = 0, required = false]] of Object.entries(cfg.inputs)) {
    const value = body[input];
    let normalized;
    if (kind === 'text') {
      if (value != null && typeof value !== 'string') throw bad(400, input + ' invalido');
      normalized = value?.trim() || null;
      if (normalized != null && normalized.length > max) throw bad(400, input + ' muito longo');
      if (required && !normalized) throw bad(400, 'Informe ' + input);
    } else if (kind === 'cnpj') {
      if (value != null && typeof value !== 'string') throw bad(400, input + ' invalido');
      normalized = value?.replace(/\D/g,'') || null;
      if (normalized && normalized.length !== 14) throw bad(400, 'CNPJ invalido');
    } else if (kind === 'dec2' || kind === 'dec4' || kind === 'pct') {
      normalized = numero(value, kind === 'dec2' ? 2 : 4, kind === 'pct' ? 3 : (kind === 'dec2' ? 17 : 15), bad, input);
      if (kind === 'pct' && Number(normalized) > 100) throw bad(400, input + ' superior a 100');
    } else if (kind === 'integer') {
      if (!Number.isSafeInteger(value) || value < 0) throw bad(400, input + ' invalido');
      normalized = value;
    } else if (kind === 'id' || kind === 'optionalId') {
      normalized = kind === 'optionalId' && value == null ? null : Number(value);
      if (normalized != null && !idValido(normalized)) throw bad(400, input + ' invalido');
    } else if (kind === 'bool') {
      if (typeof value !== 'boolean') throw bad(400, input + ' invalido');
      normalized = value ? 1 : 0;
    } else if (kind === 'agrupamento') {
      normalized = (value ?? 'quadra');
      if (typeof normalized !== 'string') throw bad(400,'Tipo agrupamento invalido');
      normalized = normalized.trim().toLowerCase();
      if (!['quadra','bloco','setor'].includes(normalized)) throw bad(400, 'Tipo de agrupamento invalido');
    } else if (kind === 'json') {
      if (value != null) {
        if (typeof value !== 'object' || Array.isArray(value)) throw bad(400, input + ' invalido');
        validarRegras(value, bad);
      }
      normalized = value == null ? null : JSON.stringify(value);
    }
    if ((input === 'tipo' || input === 'status') && normalized) normalized = normalized.toLowerCase();
    campos[column] = normalized;
  }
  if (tipo === 'empreendimentos') {
    validarReajuste(body.reajusteContratual, bad);
  }
  return campos;
}
export function registerCatalogoWrites(app, deps) {
  const { db, exigirLogin, empresaAutorizada, exigirPermissao, handler, bad } = deps;
  async function existe(conn, tabela, id, empresaId, forUpdate = false) {
    const [rows] = await conn.execute(
      'SELECT * FROM ' + tabela + ' WHERE id = ? AND empresa_id = ?' + (forUpdate ? ' FOR UPDATE' : ''),
      [id, empresaId]
    );
    return rows[0] || null;
  }
  async function validarLigacoes(conn, tabela, dados, empresaId, anterior) {
    if (tabela !== 'empreendimentos') {
      const emp = await existe(conn, 'empreendimentos', dados.empreendimento_id, empresaId);
      if (!emp) throw bad(404, 'Empreendimento nao encontrado');
      if (anterior && Number(anterior.empreendimento_id) !== Number(dados.empreendimento_id)) {
        throw bad(409, 'Nao e permitido mover para outro empreendimento');
      }
    }
    if (tabela === 'unidades' && dados.quadra_id != null) {
      const quadra = await existe(conn, 'quadras', dados.quadra_id, empresaId);
      if (!quadra || Number(quadra.empreendimento_id) !== Number(dados.empreendimento_id)) {
        throw bad(400, 'Quadra nao pertence ao empreendimento');
      }
    }
    if (tabela === 'unidades' && anterior && dados.status !== 'vendido') {
      const [rows] = await conn.execute(
        "SELECT id FROM vendas WHERE empresa_id = ? AND unidade_id = ? AND status = 'ativa' LIMIT 1",
        [empresaId, anterior.id]
      );
      if (rows.length) throw bad(409, 'Unidade com venda ativa deve permanecer vendida');
    }
  }
  const map = { empreendimentos: '/api/empreendimentos', quadras: '/api/quadras', unidades: '/api/unidades' };
  for (const [table, route] of Object.entries(map)) {
    for (const method of ['post','put']) {
      const path = method === 'post' ? route : route + '/:id';
      app[method](path, exigirLogin, handler(async (req, res) => {
        await exigirPermissao(req, ['EMPREENDIMENTOS_GERENCIAR']);
        const empresaId = await empresaAutorizada(req);
        const dados = normalizarCatalogo(table, req.body, bad);
        const cfg = config[table];
        const conn = await db.getConnection();
        try {
          await conn.beginTransaction();
          let id, novo, acao;
          if (method === 'put') {
            id = Number(req.params.id);
            if (!idValido(id)) throw bad(400, 'ID invalido');
            const versao = req.body.versao;
            if (!Number.isSafeInteger(versao) || versao < 0) throw bad(400, 'Versao invalida');
            const anterior = await existe(conn, table, id, empresaId, true);
            if (!anterior) throw bad(404, 'Cadastro nao encontrado');
            if (Number(anterior.versao) !== versao) throw bad(409, 'Cadastro alterado por outro usuario');
            await validarLigacoes(conn, table, dados, empresaId, anterior);
            const cols = Object.keys(dados);
            const [result] = await conn.execute(
              'UPDATE ' + table + ' SET ' + cols.map(c => c + ' = ?').join(', ') +
              ', versao = versao + 1, atualizado_por_usuario_id = ?, atualizado_em = UTC_TIMESTAMP() ' +
              'WHERE id = ? AND empresa_id = ? AND versao = ?',
              [...Object.values(dados), req.usuario.id, id, empresaId, versao]
            );
            if (result.affectedRows !== 1) throw bad(409, 'Conflito de alteracao');
            acao = 'ATUALIZACAO';
          } else {
            await validarLigacoes(conn, table, dados, empresaId, null);
            const cols = Object.keys(dados);
            const [result] = await conn.execute(
              'INSERT INTO ' + table + ' (empresa_id, ' + cols.join(', ') +
              ', versao, criado_por_usuario_id, atualizado_por_usuario_id, criado_em, atualizado_em) ' +
              'VALUES (?, ' + cols.map(() => '?').join(', ') +
              ', 0, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())',
              [empresaId, ...Object.values(dados), req.usuario.id, req.usuario.id]
            );
            id = result.insertId;
            acao = 'CRIACAO';
          }
          await conn.execute(
            "INSERT INTO auditoria_operacional (empresa_id, usuario_id, entidade, entidade_id, acao, criado_em) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())",
            [empresaId, req.usuario.id, cfg.entity, id, acao]
          );
          const atual = await existe(conn, table, id, empresaId);
          if (!atual) throw bad(500, 'Falha na leitura apos gravacao');
          novo = mapear(atual, cfg.fields);
          await conn.commit();
          res.status(method === 'post' ? 201 : 200).json(novo);
        } catch (err) {
          await conn.rollback();
          throw err;
        } finally {
          conn.release();
        }
      }));
    }
  }
}