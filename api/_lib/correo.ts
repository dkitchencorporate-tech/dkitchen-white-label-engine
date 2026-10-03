import nodemailer from 'nodemailer';
import type { Db } from './db.js';
import { env, appUrl } from './env.js';

// Correo transaccional. La identidad (nombre de la marca) sale de
// store_settings, nunca del código. Todo valor dinámico se escapa.

export const escapar = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export function correoConfigurado(): boolean {
  const e = env();
  return Boolean(e.SMTP_HOST && e.SMTP_USER && e.SMTP_PASS);
}

export async function datosMarca(db: Db): Promise<{ nombre: string; email: string | null }> {
  const r = await db.query<{ business_name: string | null; business_email: string | null }>(
    'SELECT business_name, business_email FROM store_settings WHERE id = 1'
  );
  return { nombre: r.rows[0]?.business_name || 'Nuestro local', email: r.rows[0]?.business_email || null };
}

export function plantilla(marca: string, titulo: string, cuerpoHtml: string): string {
  return `<div style="background:#f4f4f5;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <tr><td style="background:#18181b;padding:20px 24px;text-align:center;">
      <div style="font-size:18px;font-weight:800;color:#ffffff;">${escapar(marca)}</div>
      <div style="font-size:12px;color:#a1a1aa;margin-top:4px;">${escapar(titulo)}</div>
    </td></tr>
    <tr><td style="padding:24px;color:#27272a;font-size:14px;line-height:1.6;">${cuerpoHtml}</td></tr>
  </table>
</div>`;
}

export function boton(texto: string, url: string): string {
  return `<p style="text-align:center;margin:24px 0;"><a href="${escapar(url)}" style="display:inline-block;background:#18181b;color:#ffffff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">${escapar(texto)}</a></p>`;
}

interface Envio {
  to: string | string[];
  bcc?: string[];
  subject: string;
  html: string;
  marca: string;
}

/** Envía y nunca lanza: un fallo de correo no debe romper un pedido o un registro. */
export async function enviar({ to, bcc, subject, html, marca }: Envio): Promise<boolean> {
  if (!correoConfigurado()) return false;
  const e = env();
  try {
    const t = nodemailer.createTransport({
      host: e.SMTP_HOST,
      port: e.SMTP_PORT ?? 587,
      secure: (e.SMTP_PORT ?? 587) === 465,
      auth: { user: e.SMTP_USER, pass: e.SMTP_PASS }
    });
    const envio = t.sendMail({ from: `"${marca.replace(/"/g, '')}" <${e.SMTP_FROM || e.SMTP_USER}>`, to, bcc, subject, html });
    await Promise.race([envio, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))]);
    return true;
  } catch {
    console.error('Correo no enviado (SMTP).');
    return false;
  }
}

export function enlaceVerificacion(token: string): string {
  return `${appUrl()}/verificar-email?token=${encodeURIComponent(token)}`;
}
