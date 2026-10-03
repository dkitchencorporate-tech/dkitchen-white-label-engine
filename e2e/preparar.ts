// Preparación de las pruebas de punta a punta: base de datos limpia con la
// marca demo, horario abierto y un administrador con contraseña aleatoria.
import { mkdirSync, writeFileSync } from 'node:fs';
import pg from 'pg';
import { migrar } from '../scripts/db-migrar.js';
import { sembrar } from '../scripts/db-semilla.js';
import { crearAdmin } from '../scripts/crear-admin.js';

export const E2E_OWNER_URL = process.env.E2E_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/motor_e2e';
export const E2E_TIENDA_OWNER_URL = process.env.E2E_TIENDA_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/motor_e2e_tienda';
export const ADMIN_EMAIL = 'admin@e2e.example';
export const ARCHIVO_CREDENCIALES = 'test-results/.e2e-admin.json';
export const ARCHIVO_CREDENCIALES_TIENDA = 'test-results/.e2e-admin-tienda.json';

async function prepararBase(url: string, marca: string, archivo: string): Promise<void> {
  const owner = new pg.Client({ connectionString: url });
  await owner.connect();
  await owner.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await owner.end();
  await migrar(url, () => undefined);
  await sembrar(url, marca);
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  // Abierto todo el día y sin franja de alcohol: las pruebas no dependen de la hora.
  await c.query("UPDATE store_hours SET is_open = true, open_time = '00:00', close_time = '23:59'");
  await c.query('UPDATE store_settings SET alcohol_sale_start = NULL, alcohol_sale_end = NULL');
  await c.end();
  const password = await crearAdmin(url, ADMIN_EMAIL, 'Admin E2E');
  mkdirSync('test-results', { recursive: true });
  writeFileSync(archivo, JSON.stringify({ email: ADMIN_EMAIL, password }));
}

export default async function preparar(): Promise<void> {
  await prepararBase(E2E_OWNER_URL, 'demo', ARCHIVO_CREDENCIALES);
  await prepararBase(E2E_TIENDA_OWNER_URL, 'alacena-expres', ARCHIVO_CREDENCIALES_TIENDA);
}
