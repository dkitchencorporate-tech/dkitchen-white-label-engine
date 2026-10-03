import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { env } from './env.js';
import { conTx } from './db.js';
import { HttpError, type Req } from './http.js';

// JWT firmado con HS256 que incluye la versión de token del perfil: al
// cambiar la contraseña o retirar el rol de admin se incrementa en la BD y
// todos los tokens anteriores dejan de valer al instante.
const EMISOR = 'motor-marca-blanca';
const DURACION_CLIENTE = '30d';
const DURACION_ADMIN = '12h';

export interface Auth {
  userId: string;
  isAdmin: boolean;
}

export function firmarToken(userId: string, tokenVersion: number, isAdmin: boolean): string {
  return jwt.sign({ ver: tokenVersion }, env().APP_JWT_SECRET, {
    algorithm: 'HS256',
    issuer: EMISOR,
    subject: userId,
    expiresIn: isAdmin ? DURACION_ADMIN : DURACION_CLIENTE
  });
}

function leerBearer(req: Req): string | null {
  const h = req.headers.authorization;
  const v = Array.isArray(h) ? h[0] : h;
  return v && v.startsWith('Bearer ') ? v.slice(7) : null;
}

/** Devuelve el usuario autenticado o null. Nunca lanza por token inválido. */
export async function obtenerAuth(req: Req): Promise<Auth | null> {
  const token = leerBearer(req);
  if (!token) return null;
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, env().APP_JWT_SECRET, { algorithms: ['HS256'], issuer: EMISOR }) as jwt.JwtPayload;
  } catch {
    return null;
  }
  if (!payload.sub || typeof payload.ver !== 'number') return null;
  const estado = await conTx(async (db) => {
    const r = await db.query<{ token_version: number; is_admin: boolean }>('SELECT * FROM auth_token_state($1)', [payload.sub]);
    return r.rows[0] ?? null;
  });
  if (!estado || estado.token_version !== payload.ver) return null;
  return { userId: payload.sub, isAdmin: estado.is_admin };
}

export async function exigirUsuario(req: Req): Promise<Auth> {
  const a = await obtenerAuth(req);
  if (!a) throw new HttpError(401, 'Inicia sesión para continuar.');
  return a;
}

export async function exigirAdmin(req: Req): Promise<Auth> {
  const a = await exigirUsuario(req);
  if (!a.isAdmin) throw new HttpError(403, 'Requiere permisos de administrador.');
  return a;
}

export const hashContrasena = (plano: string) => bcrypt.hash(plano, 12);

// Hash ficticio para igualar tiempos cuando el usuario no existe.
const HASH_FICTICIO = '$2a$12$9zzTZpFk7M/dRpP57Vcyv.eK.MKOuASHi4O/BWLKDmdNbDyAc9mdG';

export async function comprobarContrasena(plano: string, hash: string | null): Promise<boolean> {
  const ok = await bcrypt.compare(plano, hash ?? HASH_FICTICIO);
  return hash !== null && ok;
}

/** Token de un solo uso: se envía en claro por correo y se guarda solo su hash. */
export function nuevoTokenVerificacion(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  return { token, hash: hashToken(token) };
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
