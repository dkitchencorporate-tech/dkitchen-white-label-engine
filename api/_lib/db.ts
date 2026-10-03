import pg from 'pg';
import { env } from './env.js';

// Conexión con el rol de la API (miembro de motor_app): sin BYPASSRLS y sin
// ser dueño de las tablas, así que las políticas RLS se aplican siempre.
const { Pool, types } = pg;

// NUMERIC llega como texto; el frontend opera con números. Los importes se
// calculan en SQL con NUMERIC exacto, aquí solo se presentan.
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: env().APP_DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    });
  }
  return pool;
}

export type Db = pg.PoolClient;

/**
 * Ejecuta `fn` en una transacción. `userId` (del JWT ya verificado) se fija en
 * `app.user_id` para que RLS y las funciones SQL sepan quién llama.
 */
export async function conTx<T>(fn: (db: Db) => Promise<T>, userId: string | null = null): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    if (userId) await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    const r = await fn(client);
    await client.query('COMMIT');
    return r;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** Solo para pruebas. */
export async function cerrarPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
