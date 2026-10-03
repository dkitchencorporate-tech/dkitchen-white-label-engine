// Carga una semilla de db/semilla/<nombre>.sql (por defecto «demo»).
// Uso: MIGRATIONS_DATABASE_URL=... npm run db:semilla -- demo
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

export async function sembrar(connectionString: string, nombre = 'demo'): Promise<void> {
  if (!/^[a-z0-9-]+$/.test(nombre)) throw new Error('Nombre de semilla no válido.');
  const sql = readFileSync(join(process.cwd(), 'db', 'semilla', `${nombre}.sql`), 'utf8');
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.MIGRATIONS_DATABASE_URL;
  if (!url) {
    console.error('Falta MIGRATIONS_DATABASE_URL.');
    process.exit(1);
  }
  const nombre = process.argv[2] || 'demo';
  sembrar(url, nombre)
    .then(() => console.log(`✓ Semilla «${nombre}» cargada.`))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
