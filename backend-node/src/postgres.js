import pg from 'pg';

// Interface de transicao: mantem os contratos dos modulos Express que ja foram
// migrados, mas executa EXCLUSIVAMENTE em PostgreSQL (sem MySQL).
const { Pool, types } = pg;
// Preserva DATE e TIMESTAMP como strings ISO/SQL, sem deslocar a competencia.
types.setTypeParser(1082, value => value);
types.setTypeParser(1114, value => value);
types.setTypeParser(1184, value => value);
types.setTypeParser(1700, value => value); // NUMERIC como texto: dinheiro exato.
types.setTypeParser(20, value => {
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : value;
});

const INSERT_WITH_ID = new Set([
  'clientes', 'empreendimentos', 'quadras', 'unidades',
  'vendas', 'movimentos', 'pagamento_itens', 'auditoria_operacional',
  'revisoes_financeiras_vendas'
]);

function bindParams(sql, values) {
  // SQL do proprio servidor: nao aceita SQL externo nem identificadores de request.
  // '?' aqui so representa parametro posicional, nunca operador JSON do PostgreSQL.
  let count = 0;
  const result = sql.replace(/\?/g, () => '$' + (++count));
  if (count !== values.length) {
    throw new Error('Consulta interna com numero incorreto de parametros');
  }
  return result;
}

export function traduzirSql(sql, values = []) {
  if (typeof sql !== 'string' || !Array.isArray(values)) {
    throw new TypeError('SQL e parametros invalidos');
  }
  const s = sql.trim().replace(/;$/, '');
  const match = /^INSERT\s+INTO\s+([a-z_][a-z_0-9]*)\s*\(/i.exec(s);
  const insertId = match != null && INSERT_WITH_ID.has(match[1].toLowerCase());
  let translated = bindParams(s, values);
  if (insertId && !/\bRETURNING\s+\w+/i.test(translated)) {
    translated += ' RETURNING id';
  }
  return translated;
}

function makeExecutor(query) {
  return {
    async execute(sql, values = []) {
      const r = await query(traduzirSql(sql, values), values);
      if (/^\s*SELECT\b/i.test(sql)) return [r.rows];
      if (/^\s*INSERT\b/i.test(sql)) {
        return [{
          insertId: r.rows?.[0]?.id ?? null,
          affectedRows: r.rowCount
        }];
      }
      return [{ affectedRows: r.rowCount }];
    },
    async query(sql, values = []) {
      return query(traduzirSql(sql, values), values);
    }
  };
}

export function createDatabase() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url && (!process.env.PGHOST || !process.env.PGUSER || !process.env.PGDATABASE)) {
    throw new Error('Configure DATABASE_URL ou PGHOST, PGUSER e PGDATABASE');
  }
  const pool = new Pool({
    ...(url ? { connectionString: url } : {
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE
    }),
    ...(process.env.PGSSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {}),
    max: 8,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    application_name: 'imobcontrol-node'
  });
  pool.on('error', err => console.error('Erro na conexao PostgreSQL:', err.message));
  const clientExec = makeExecutor((sql, params) => pool.query(sql, params));
  return {
    ...clientExec,
    async getConnection() {
      const client = await pool.connect();
      const exec = makeExecutor((sql, params) => client.query(sql, params));
      return {
        ...exec,
        beginTransaction: () => client.query('BEGIN'),
        commit: () => client.query('COMMIT'),
        rollback: () => client.query('ROLLBACK'),
        release: () => client.release()
      };
    },
    close: () => pool.end()
  };
}
