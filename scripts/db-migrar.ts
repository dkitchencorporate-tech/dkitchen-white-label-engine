// Aplica en orden las migraciones de db/migraciones/*.sql que falten.
// Uso: MIGRATIONS_DATABASE_URL=postgres://dueño@host/db npm run db:migrar
// Cada archivo va en su propia transacción y queda registrado con su checksum:
// si alguien edita una migración ya aplicada, el script se detiene.
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import pg from 'pg';

const DIR = join(process.cwd(), 'db', 'migraciones');

export async function migrar(connectionString: string, log = console.log): Promise<string[]> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  const aplicadas: string[] = [];
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    const { rows } = await client.query<{ version: string; checksum: string }>('SELECT version, checksum FROM schema_migrations');
    const hechas = new Map(rows.map((r) => [r.version, r.checksum]));

    const archivos = readdirSync(DIR).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
    for (const archivo of archivos) {
      const sql = readFileSync(join(DIR, archivo), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const previa = hechas.get(archivo);
      if (previa) {
        if (previa !== checksum) throw new Error(`La migración ${archivo} ya aplicada ha cambiado. Crea una migración nueva en su lugar.`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)', [archivo, checksum]);
        await client.query('COMMIT');
        aplicadas.push(archivo);
        log(`✓ ${archivo}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Falló ${archivo}: ${(err as Error).message}`);
      }
    }
    if (aplicadas.length === 0) log('Base de datos al día.');
    return aplicadas;
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.MIGRATIONS_DATABASE_URL;
  if (!url) {
    console.error('Falta MIGRATIONS_DATABASE_URL (conexión con el rol dueño de la base de datos).');
    process.exit(1);
  }
  migrar(url).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
