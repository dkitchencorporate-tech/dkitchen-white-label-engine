import { z } from 'zod';

// Variables de entorno validadas una sola vez. Ninguna tiene valor por defecto
// secreto: si falta algo obligatorio, la función falla de forma explícita.
const esquema = z.object({
  APP_DATABASE_URL: z.string().min(1, 'Falta APP_DATABASE_URL'),
  APP_JWT_SECRET: z.string().min(32, 'APP_JWT_SECRET debe tener al menos 32 caracteres'),
  APP_URL: z.string().url().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_JWK: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional()
});

export type Env = z.infer<typeof esquema>;

let cache: Env | null = null;

export function env(): Env {
  if (!cache) {
    const r = esquema.safeParse(process.env);
    if (!r.success) {
      throw new Error(`Configuración incompleta: ${r.error.issues.map((i) => i.message).join('; ')}`);
    }
    cache = r.data;
  }
  return cache;
}

export function appUrl(): string {
  const e = env();
  if (e.APP_URL) return e.APP_URL.replace(/\/$/, '');
  if (e.VERCEL_PROJECT_PRODUCTION_URL) return `https://${e.VERCEL_PROJECT_PRODUCTION_URL}`;
  return '';
}

/** Solo para pruebas: fuerza a releer process.env. */
export function reiniciarEnv(): void {
  cache = null;
}
