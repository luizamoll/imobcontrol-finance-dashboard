// Port fiel das regras de recebimento do FinanceiroService Java.
// Os calculos usam Decimal.js (nunca Number para montantes), sem expor dados fora do tenant.
import Decimal from 'decimal.js';

Decimal.set({ precision: 36, rounding: Decimal.ROUND_HALF_UP });
const D = value => new Decimal(value == null ? 0 : value);
const Z = () => D(0);
const moeda = v => D(v).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
const maxZero = v => moeda(D(v).isNeg() ? 0 : v);
const txt = v => v == null ? null : String(v).trim() || null;
const pct = (base, valorPct) =>
  moeda(D(base).times(D(valorPct)).div(100).toDecimalPlaces(8, Decimal.ROUND_HALF_UP));

function parseJSON(texto) {
  if (!texto) return {};
  const j = typeof texto === 'string' ? JSON.parse(texto) : texto;
  return j && typeof j === 'object' && !Array.isArray(j) ? j : {};
}
function isoDia(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const [ano, mes, dia] = texto.split('-').map(Number);
  const dt = new Date(Date.UTC(ano, mes - 1, dia));
  return dt.toISOString().slice(0, 10) === texto ? texto : null;
}
function diasEntre(inicio, fim) {
  return Math.round((Date.parse(fim + 'T00:00:00Z') - Date.parse(inicio + 'T00:00:00Z')) / 86400000);
}
function hojeBrasil() {
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const v = Object.fromEntries(partes.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return v.year + '-' + v.month + '-' + v.day;
}

// Mesma regra do Java: corrigir pelo intervalo ate a DATA EFETIVA (nao hoje).
export function valorCorrigido(parcela, regras, data) {
  const base = moeda(parcela.valor);
  const vencimento = parcela.vencimento;
  if (!data || data <= vencimento) return base.toFixed(2);
  const r = regras || {};
  const diasAtraso = Math.max(0, diasEntre(vencimento, data));
  const tolerancia = r.toleranciaAtiva === true ? Math.max(0, Number(r.diasTolerancia ?? 0)) : 0;
  let diasEfetivos;
  if (diasAtraso <= tolerancia) diasEfetivos = 0;
  else if ((r.inicioJuros ?? 'vencimento') === 'vencimento') diasEfetivos = diasAtraso;
  else diasEfetivos = diasAtraso - tolerancia;
  const meses = D(diasEfetivos).div(30).toDecimalPlaces(8, Decimal.ROUND_HALF_UP);
  const correcao = r.correcaoAtiva === true
    ? pct(base, r.correcaoPctMes ?? 0).times(meses) : Z();
  const juros = r.jurosAtivo === true
    ? (r.jurosTipo === 'diario'
      ? pct(base, r.jurosPctDia ?? 0).times(diasEfetivos)
      : pct(base, r.jurosPctMes ?? 0).times(meses)) : Z();
  const mora = r.moraAtiva === true && diasEfetivos > 0 ? pct(base, r.moraPct ?? 0) : Z();
  return moeda(base.plus(correcao).plus(juros).plus(mora)).toFixed(2);
}

export function calcularDistribuicao({ parcela, venda, empreendimento, recebido, comissaoJaPaga }) {
  const regras = parseJSON(venda.regras_json);
  const r = regras;
  const aliquota = D(r.aliquotaTributaria ?? 0);
  const empresaPct = D(empreendimento.empresa_pct ?? r.empresaPct ?? 0);
  const socioPct = D(empreendimento.socio_pct ?? r.socioPct ?? 0);
  const imposto = pct(recebido, aliquota);
  const comissaoTotal = pct(venda.valor_total, venda.corretor_pct);
  const saldoComissaoAntes = maxZero(comissaoTotal.minus(D(comissaoJaPaga)));
  const acrescimos = maxZero(D(recebido).minus(D(parcela.valor)));
  const corretagemExterna = venda.corretagem_compoe_valor_contrato === 0
    || venda.corretagem_compoe_valor_contrato === false;
  const baseComissao = corretagemExterna ? Z() :
    Number(venda.comissao_sobre_acrescimos) === 1
      ? moeda(recebido)
      : moeda(Decimal.min(D(recebido), D(parcela.valor)));
  const comissaoTeorica = corretagemExterna ? Z() : pct(baseComissao, venda.repasse_comissao_pct);
  let comissao = Decimal.min(comissaoTeorica, saldoComissaoAntes);
  const limiteDepoisImposto = maxZero(D(recebido).minus(imposto));
  comissao = Decimal.min(comissao, limiteDepoisImposto);
  const restante = maxZero(D(recebido).minus(imposto).minus(comissao));
  const totalSplit = empresaPct.plus(socioPct);
  const empresaValor = totalSplit.gt(0)
    ? moeda(restante.times(empresaPct).div(totalSplit).toDecimalPlaces(8, Decimal.ROUND_HALF_UP)) : Z();
  const socioValor = totalSplit.gt(0) ? moeda(restante.minus(empresaValor)) : Z();
  const out = {
    impostoReservado: imposto.toFixed(2),
    comissaoPaga: comissao.toFixed(2),
    empresaValor: empresaValor.toFixed(2),
    socioValor: socioValor.toFixed(2),
    aliquotaTributariaAplicada: aliquota.toFixed(4),
    empresaPctAplicada: empresaPct.toFixed(4),
    socioPctAplicada: socioPct.toFixed(4),
    comissaoBaseCalculo: baseComissao.toFixed(2),
    comissaoRepassePctAplicado: D(venda.repasse_comissao_pct).toFixed(4),
    comissaoSobreAcrescimosAplicada: Number(venda.comissao_sobre_acrescimos) === 1 ? 1 : 0,
    acrescimosRecebidos: acrescimos.toFixed(2),
    comissaoTeorica: comissaoTeorica.toFixed(2),
    saldoComissaoApos: maxZero(saldoComissaoAntes.minus(comissao)).toFixed(2)
  };
  if (!empresaValor.plus(socioValor).plus(imposto).plus(comissao).eq(moeda(recebido))) {
    // Se os percentuais sao nulos/zero, Java deixa o restante sem alocacao.
    if (totalSplit.gt(0)) throw new Error('Inconsistencia na distribuicao do recebimento');
  }
  return out;
}
const idValido = (raw, bad) => {
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n <= 0) throw bad(400, 'ID de parcela invalido');
  return n;
};
const paraMovimento = m => ({
  id: m.id, parcelaId: m.parcela_id, vendaId: m.venda_id,
  empreendimentoId: m.empreendimento_id, unidadeId: m.unidade_id,
  clienteId: m.cliente_id, compradorNome: m.comprador_nome,
  corretorNome: m.corretor_nome, socioNome: m.socio_nome,
  origem: m.origem, origemDescricao: m.origem_descricao,
  data: m.data_movimento, usuario: m.usuario_nome,
  valorRecebido: m.valor_recebido, impostoReservado: m.imposto_reservado,
  comissaoPaga: m.comissao_paga, empresaValor: m.empresa_valor,
  socioValor: m.socio_valor,
  aliquotaTributariaAplicada: m.aliquota_tributaria_aplicada,
  empresaPctAplicada: m.empresa_pct_aplicada,
  socioPctAplicada: m.socio_pct_aplicada,
  comissaoBaseCalculo: m.comissao_base_calculo,
  comissaoRepassePctAplicado: m.comissao_repasse_pct_aplicado,
  comissaoSobreAcrescimosAplicada: m.comissao_sobre_acrescimos_aplicada == null
    ? null : Boolean(m.comissao_sobre_acrescimos_aplicada),
  acrescimosRecebidos: m.acrescimos_recebidos,
  comissaoTeorica: m.comissao_teorica, saldoComissaoApos: m.saldo_comissao_apos
});

export function registerRecebimentos(app, { db, exigirLogin, empresaAutorizada, exigirPermissao, handler, bad }) {
  async function abrirTransacao(req, names, parcelaId, run) {
    await exigirPermissao(req, names);
    const empresa = await empresaAutorizada(req);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      // Ordem fixa de bloqueios: venda primeiro, parcela depois. Isto impede
      // ultrapassar o teto da comissao em baixas simultaneas de parcelas distintas.
      const [pre] = await conn.execute(
        'SELECT venda_id FROM parcelas WHERE id = ? AND empresa_id = ? LIMIT 1',
        [parcelaId, empresa]
      );
      if (!pre.length) throw bad(404, 'Parcela nao encontrada');
      const [vend] = await conn.execute(
        'SELECT * FROM vendas WHERE id = ? AND empresa_id = ? FOR UPDATE',
        [pre[0].venda_id, empresa]
      );
      if (!vend.length) throw bad(404, 'Venda nao encontrada');
      const [pars] = await conn.execute(
        'SELECT * FROM parcelas WHERE id = ? AND empresa_id = ? FOR UPDATE',
        [parcelaId, empresa]
      );
      if (!pars.length || Number(pars[0].venda_id) !== Number(vend[0].id)) {
        throw bad(409, 'Parcela foi alterada. Atualize a tela.');
      }
      const result = await run(conn, empresa, pars[0], vend[0]);
      await conn.commit();
      return result;
    } catch (e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  }
  app.post('/api/parcelas/:id/receber', exigirLogin, handler(async (req, res) => {
    const id = idValido(req.params.id, bad);
    const body = req.body ?? {};
    let data = body.data == null ? hojeBrasil() : isoDia(body.data);
    if (!data || data > hojeBrasil()) throw bad(400, 'Data do recebimento invalida');
    const movimento = await abrirTransacao(req, ['RECEBIMENTOS_REGISTRAR'], id,
      async (conn, empresa, parcela, venda) => {
        if (parcela.status === 'paga') throw bad(409, 'Esta parcela ja esta paga');
        if (parcela.status === 'cancelada') throw bad(409, 'Parcela cancelada');
        if (parcela.status === 'em_acordo') throw bad(409, 'Parcela substituida por acordo');
        const [emps] = await conn.execute(
          'SELECT * FROM empreendimentos WHERE id = ? AND empresa_id = ?',
          [venda.empreendimento_id, empresa]
        );
        if (!emps.length) throw bad(404, 'Empreendimento nao encontrado');
        const regraVenda = parseJSON(venda.regras_json);
        const correcao = valorCorrigido(parcela, regraVenda.inadimplencia ?? {}, data);
        let recebido = correcao;
        if (body.valorRecebido != null) {
          const v = body.valorRecebido;
          if (!['string','number'].includes(typeof v) || !/^\d+(\.\d{1,2})?$/.test(String(v))) {
            throw bad(400, 'Valor recebido invalido');
          }
          recebido = moeda(v).toFixed(2);
        }
        if (D(recebido).lte(0)) throw bad(400, 'Valor recebido deve ser positivo');
        const [pagos] = await conn.execute(
          'SELECT COALESCE(SUM(comissao_paga),0) AS total FROM movimentos '
          + 'WHERE venda_id = ? AND empresa_id = ? AND estornado = FALSE',
          [venda.id, empresa]
        );
        const distribuicao = calcularDistribuicao({
          parcela, venda, empreendimento: emps[0],
          recebido, comissaoJaPaga: pagos[0].total
        });
        const socioNome = txt(emps[0].socio_nome) ?? txt(regraVenda.socioNome);
        const cols = [
          'empresa_id','parcela_id','venda_id','empreendimento_id','unidade_id','cliente_id',
          'corretor_nome','socio_nome','origem','origem_descricao','data_movimento','usuario_id',
          'valor_recebido','imposto_reservado','comissao_paga','empresa_valor','socio_valor',
          'aliquota_tributaria_aplicada','empresa_pct_aplicada','socio_pct_aplicada',
          'comissao_base_calculo','comissao_repasse_pct_aplicado',
          'comissao_sobre_acrescimos_aplicada','acrescimos_recebidos','comissao_teorica','saldo_comissao_apos'
        ];
        const vals = [
          empresa,parcela.id,venda.id,parcela.empreendimento_id,parcela.unidade_id,parcela.cliente_id,
          venda.corretor_nome,socioNome,parcela.origem_tipo,parcela.origem_descricao,data,req.usuario.id,
          recebido,distribuicao.impostoReservado,distribuicao.comissaoPaga,
          distribuicao.empresaValor,distribuicao.socioValor,
          distribuicao.aliquotaTributariaAplicada,distribuicao.empresaPctAplicada,
          distribuicao.socioPctAplicada,distribuicao.comissaoBaseCalculo,
          distribuicao.comissaoRepassePctAplicado,distribuicao.comissaoSobreAcrescimosAplicada,
          distribuicao.acrescimosRecebidos,distribuicao.comissaoTeorica,distribuicao.saldoComissaoApos
        ];
        const sql = 'INSERT INTO movimentos (' + cols.join(', ') + ') VALUES (' +
          cols.map(() => '?').join(', ') + ')';
        const [insert] = await conn.execute(sql, vals);
        await conn.execute(
          "UPDATE parcelas SET valor_pago = ?, data_pagamento = ?, status = 'paga', "
          + 'versao = versao + 1, atualizado_em = CURRENT_TIMESTAMP '
          + 'WHERE id = ? AND empresa_id = ?',
          [recebido, data, parcela.id, empresa]
        );
        const [pendentes] = await conn.execute(
          "SELECT COUNT(*) AS total FROM parcelas WHERE venda_id = ? AND empresa_id = ? "
          + "AND LOWER(status) NOT IN ('paga','cancelada','em_acordo')",
          [venda.id, empresa]
        );
        if (Number(pendentes[0].total) === 0) await conn.execute(
          "UPDATE vendas SET status = 'quitada', versao = versao + 1, "
          + 'atualizado_por_usuario_id = ?, atualizado_em = CURRENT_TIMESTAMP '
          + 'WHERE id = ? AND empresa_id = ?',
          [req.usuario.id, venda.id, empresa]
        );
        await conn.execute(
          "INSERT INTO auditoria_operacional (empresa_id, usuario_id, entidade, entidade_id, acao, criado_em) "
          + "VALUES (?, ?, 'PARCELA', ?, 'RECEBIMENTO', CURRENT_TIMESTAMP)",
          [empresa, req.usuario.id, parcela.id]
        );
        const [rows] = await conn.execute(
          'SELECT m.*, c.nome AS comprador_nome, u.nome AS usuario_nome FROM movimentos m '
          + 'JOIN clientes c ON c.id = m.cliente_id AND c.empresa_id = m.empresa_id '
          + 'JOIN usuarios u ON u.id = m.usuario_id '
          + 'WHERE m.id = ? AND m.empresa_id = ?', [insert.insertId, empresa]
        );
        if (!rows.length) throw bad(500, 'Movimento nao localizado apos insercao');
        return paraMovimento(rows[0]);
      }
    );
    res.status(201).json(movimento);
  }));

  app.post('/api/parcelas/:id/reverter', exigirLogin, handler(async (req, res) => {
    const id = idValido(req.params.id, bad);
    await abrirTransacao(req, ['RECEBIMENTOS_ESTORNAR'], id,
      async (conn, empresa, parcela, venda) => {
        const [rows] = await conn.execute(
          'SELECT id FROM movimentos WHERE empresa_id = ? AND parcela_id = ? '
          + 'AND estornado = FALSE ORDER BY id DESC LIMIT 1 FOR UPDATE', [empresa,id]
        );
        if (!rows.length) throw bad(404, 'Nenhum recebimento ativo encontrado');
        await conn.execute(
          'UPDATE movimentos SET estornado = TRUE, estornado_em = CURRENT_TIMESTAMP, '
          + 'estornado_por_usuario_id = ? WHERE id = ? AND empresa_id = ? AND estornado = FALSE',
          [req.usuario.id, rows[0].id, empresa]
        );
        await conn.execute(
          'UPDATE parcelas SET valor_pago = 0, data_pagamento = NULL, status = ?, '
          + 'versao = versao + 1, atualizado_em = CURRENT_TIMESTAMP '
          + 'WHERE id = ? AND empresa_id = ?',
          [hojeBrasil() > parcela.vencimento ? 'vencida' : 'pendente', id, empresa]
        );
        if (venda.status === 'quitada') await conn.execute(
          "UPDATE vendas SET status = 'ativa', versao = versao + 1, "
          + 'atualizado_por_usuario_id = ?, atualizado_em = CURRENT_TIMESTAMP '
          + 'WHERE id = ? AND empresa_id = ?', [req.usuario.id,venda.id,empresa]
        );
        await conn.execute(
          "INSERT INTO auditoria_operacional (empresa_id,usuario_id,entidade,entidade_id,acao,criado_em) "
          + "VALUES (?, ?, 'PARCELA', ?, 'RECEBIMENTO_ESTORNADO', CURRENT_TIMESTAMP)",
          [empresa,req.usuario.id,id]
        );
      }
    );
    res.status(204).end();
  }));
}
