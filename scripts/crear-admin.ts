// Crea o actualiza un administrador con una contraseña aleatoria segura.
// Uso: MIGRATIONS_DATABASE_URL=... npm run crear-admin -- correo@dominio.es ["Nombre"]
// La contraseña se muestra UNA vez por pantalla; nunca se guarda en el repo.
import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const SIMBOLOS = '!#%*-_+=';

export function generarContrasena(longitud = 24): string {
  const chars = Array.from({ length: longitud - 4 }, () => ALFABETO[randomInt(ALFABETO.length)]);
  const obligatorios = [
    ALFABETO[randomInt(0, 24)], // mayúscula
    ALFABETO[24 + randomInt(0, 25)], // minúscula
    String(randomInt(2, 10)), // dígito
    SIMBOLOS[randomInt(SIMBOLOS.length)] // símbolo
  ];
  for (const c of obligatorios) chars.splice(randomInt(chars.length + 1), 0, c);
  return chars.join('');
}

export async function crearAdmin(connectionString: string, email: string, nombre = 'Administrador'): Promise<string> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Correo no válido.');
  const contrasena = generarContrasena();
  const hash = await bcrypt.hash(contrasena, 12);
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');
    // app.trusted permite fijar is_admin y password_hash (el trigger de perfiles
    // los protege frente a cambios desde la API).
    await client.query("SELECT set_config('app.trusted', 'on', true)");
    await client.query(
      `INSERT INTO profiles (email, password_hash, full_name, is_admin, is_email_verified)
       VALUES (lower($1), $2, $3, true, true)
       ON CONFLICT ((lower(email))) DO UPDATE
         SET password_hash = EXCLUDED.password_hash, is_admin = true,
             token_version = profiles.token_version + 1`,
      [email, hash, nombre]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
  return contrasena;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.MIGRATIONS_DATABASE_URL;
  const [email, nombre] = process.argv.slice(2);
  if (!url || !email) {
    console.error('Uso: MIGRATIONS_DATABASE_URL=... npm run crear-admin -- correo@dominio.es ["Nombre"]');
    process.exit(1);
  }
  crearAdmin(url, email, nombre)
    .then((pass) => {
      console.log(`✓ Administrador listo: ${email}`);
      console.log(`  Contraseña (cópiala ahora, no se vuelve a mostrar): ${pass}`);
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
