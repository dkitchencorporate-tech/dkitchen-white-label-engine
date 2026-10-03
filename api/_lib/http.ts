import { randomUUID } from 'node:crypto';
import { ZodError, type ZodType } from 'zod';
import { conTx } from './db.js';

// Tipos mínimos compatibles con las funciones de Vercel (Node).
export interface Req {
  method?: string;
  url?: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

export interface Res {
  status(code: number): Res;
  json(body: unknown): void;
  setHeader(name: string, value: string | number): void;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface Ctx {
  req: Req;
  res: Res;
  ip: string;
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Fn = (ctx: Ctx) => Promise<unknown>;
export type Acciones = Record<string, Partial<Record<Metodo, Fn>>>;

function cabecera(req: Req, nombre: string): string | undefined {
  const v = req.headers[nombre];
  return Array.isArray(v) ? v[0] : v;
}

/** IP del cliente. En Vercel, x-real-ip / x-forwarded-for los fija la plataforma. */
export function ipCliente(req: Req): string {
  return (
    cabecera(req, 'x-real-ip') ||
    cabecera(req, 'x-forwarded-for')?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'desconocida'
  );
}

export function parsear<T>(esquema: ZodType<T>, datos: unknown): T {
  return esquema.parse(datos);
}

export function param(req: Req, nombre: string): string | undefined {
  const v = req.query[nombre];
  return Array.isArray(v) ? v[0] : v;
}

/** Límite de peticiones compartido entre instancias (tabla rate_limits). */
export async function limitar(ctx: Ctx, clave: string, limite: number, ventanaSeg: number, sujeto?: string): Promise<void> {
  const k = `${clave}:${sujeto ?? ctx.ip}`;
  const ok = await conTx(async (db) => {
    const r = await db.query<{ ok: boolean }>('SELECT rate_limit_hit($1, $2, $3) AS ok', [k, limite, ventanaSeg]);
    return r.rows[0]?.ok ?? false;
  });
  if (!ok) {
    ctx.res.setHeader('Retry-After', ventanaSeg);
    throw new HttpError(429, 'Demasiadas solicitudes. Espera un momento antes de volver a intentarlo.');
  }
}

interface PgError {
  code?: string;
  message?: string;
  constraint?: string;
}

function traducirError(err: unknown): { status: number; body: Record<string, unknown> } {
  if (err instanceof HttpError) return { status: err.status, body: { error: err.message } };
  if (err instanceof ZodError) {
    return {
      status: 400,
      body: { error: 'Datos no válidos.', campos: err.issues.map((i) => ({ campo: i.path.join('.'), motivo: i.message })) }
    };
  }
  const pg = err as PgError;
  // P0001: errores de negocio redactados en SQL para el cliente.
  if (pg?.code === 'P0001' && pg.message) return { status: 400, body: { error: pg.message } };
  if (pg?.code === '23505') return { status: 409, body: { error: 'Ya existe un registro con esos datos.' } };
  if (pg?.code === '23503') return { status: 409, body: { error: 'No se puede completar: hay elementos relacionados.' } };
  if (pg?.code === '23514' || pg?.code === '22P02') return { status: 400, body: { error: 'Datos no válidos.' } };
  if (pg?.code === '42501') return { status: 403, body: { error: 'No tienes permiso para esta acción.' } };
  return { status: 500, body: { error: 'Error interno. Inténtalo de nuevo en unos minutos.' } };
}

/**
 * Crea el manejador de una función consolidada (`?action=` → acción).
 * Centraliza métodos permitidos, errores sin filtrar detalles internos y
 * registros sin datos personales.
 */
export function crearManejador(acciones: Acciones, accionPorDefecto?: string) {
  return async function handler(req: Req, res: Res): Promise<void> {
    const id = randomUUID().slice(0, 8);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Request-Id', id);
    const accion = param(req, 'action') ?? accionPorDefecto ?? '';
    const def = acciones[accion];
    if (!def) {
      res.status(404).json({ error: 'Acción desconocida.' });
      return;
    }
    const metodo = (req.method ?? 'GET').toUpperCase() as Metodo;
    const fn = def[metodo];
    if (!fn) {
      res.setHeader('Allow', Object.keys(def).join(', '));
      res.status(405).json({ error: 'Método no permitido.' });
      return;
    }
    try {
      const out = await fn({ req, res, ip: ipCliente(req) });
      res.status(200).json(out ?? { ok: true });
    } catch (err) {
      const { status, body } = traducirError(err);
      if (status >= 500) {
        // Solo código y restricción: los mensajes de Postgres pueden incluir datos personales.
        const pg = err as PgError;
        console.error(`[${id}] ${accion} ${metodo} → ${pg?.code ?? (err as Error)?.name ?? 'error'}${pg?.constraint ? ` (${pg.constraint})` : ''}`);
      }
      res.status(status).json({ ...body, requestId: id });
    }
  };
}
