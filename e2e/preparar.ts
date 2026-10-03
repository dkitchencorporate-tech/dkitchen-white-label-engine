// Preparación de las pruebas de punta a punta: base de datos limpia con la
// marca demo, horario abierto y un administrador con contraseña aleatoria.
import { mkdirSync, writeFileSync } from 'node:fs';
import pg from 'pg';
import { migrar } from '../scripts/db-migrar.js';
import { sembrar } from '../scripts/db-semilla.js';
import { crearAdmin } from '../scripts/crear-admin.js';

export const E2E_OWNER_URL = process.env.E2E_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/motor_e2e';
export const ADMIN_EMAIL = 'admin@e2e.example';
export const ARCHIVO_CREDENCIALES = 'test-results/.e2e-admin.json';

export default async function preparar(): Promise<void> {
  const owner = new pg.Client({ connectionString: E2E_OWNER_URL });
  await owner.connect();
  await owner.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await owner.end();
  await migrar(E2E_OWNER_URL, () => undefined);
  await sembrar(E2E_OWNER_URL, 'demo');
  const c = new pg.Client({ connectionString: E2E_OWNER_URL });
  await c.connect();
  await c.query("UPDATE store_hours SET is_open = true, open_time = '00:00', close_time = '23:59'");
  await c.end();
  const password = await crearAdmin(E2E_OWNER_URL, ADMIN_EMAIL, 'Admin E2E');
  mkdirSync('test-results', { recursive: true });
  writeFileSync(ARCHIVO_CREDENCIALES, JSON.stringify({ email: ADMIN_EMAIL, password }));
}
