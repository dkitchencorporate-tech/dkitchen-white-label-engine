import { createPrivateKey, sign } from 'node:crypto';
import { z } from 'zod';
import { conTx } from './_lib/db.js';
import { exigirAdmin } from './_lib/auth.js';
import { crearManejador, HttpError, limitar, parsear } from './_lib/http.js';
import { campanaSchema, pushSchema, telefono } from './_lib/esquemas.js';
import { boton, correoConfigurado, datosMarca, enviar, escapar, plantilla } from './_lib/correo.js';
import { env } from './_lib/env.js';

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');

// JWT VAPID (RFC 8292) firmado con node:crypto, sin dependencias extra.
function cabeceraVapid(origen: string): string {
  const e = env();
  const clave = createPrivateKey({ key: JSON.parse(e.VAPID_PRIVATE_JWK as string), format: 'jwk' });
  const cuerpo = `${b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))}.${b64url(JSON.stringify({
    aud: origen, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: e.VAPID_SUBJECT || 'mailto:soporte@example.com'
  }))}`;
  const firma = sign('sha256', Buffer.from(cuerpo), { key: clave, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${cuerpo}.${b64url(firma)}, k=${e.VAPID_PUBLIC_KEY}`;
}

export default crearManejador({
  'send-campaign': {
    POST: async (ctx) => {
      const d = parsear(campanaSchema, ctx.req.body);
      const auth = await exigirAdmin(ctx.req);
      if (!correoConfigurado()) throw new HttpError(503, 'El correo saliente no está configurado.');
      return conTx(async (db) => {
        // Destinatarios: solo clientes con correo verificado. Si el panel envía
        // una lista, se usa como filtro, nunca para añadir direcciones ajenas.
        const r = await db.query<{ email: string }>(
          `SELECT email FROM profiles WHERE is_email_verified AND NOT is_admin
             AND ($1::text[] IS NULL OR lower(email) = ANY($1::text[]))`,
          [d.recipients?.length ? d.recipients : null]
        );
        const destinatarios = r.rows.map((x) => x.email);
        if (destinatarios.length === 0) throw new HttpError(400, 'No hay destinatarios con correo verificado.');
        const marca = await datosMarca(db);
        const html = plantilla(
          marca.nombre,
          escapar(d.headline || d.subject),
          `${d.flyerUrl ? `<img src="${escapar(d.flyerUrl)}" alt="" style="width:100%;border-radius:8px;margin-bottom:16px;" />` : ''}
           <div style="white-space:pre-line;">${escapar(d.message)}</div>
           ${d.ctaUrl ? boton(d.ctaText || 'Ver más', d.ctaUrl) : ''}
           <p style="color:#a1a1aa;font-size:11px;margin-top:24px;">Recibes este correo porque eres cliente de ${escapar(marca.nombre)}.
           Si no quieres recibir más comunicaciones, responde a este correo con «BAJA».</p>`
        );
        await enviar({ to: marca.email || (env().SMTP_USER as string), bcc: destinatarios, subject: d.subject, html, marca: marca.nombre });
        return { success: true, sent: destinatarios.length };
      }, auth.userId);
    }
  },

  'send-order-push': {
    POST: async (ctx) => {
      const { phone } = parsear(z.object({ phone: telefono }), ctx.req.body);
      const auth = await exigirAdmin(ctx.req);
      const e = env();
      if (!e.VAPID_PRIVATE_JWK || !e.VAPID_PUBLIC_KEY) throw new HttpError(503, 'Las notificaciones push no están configuradas.');
      const subs = await conTx(async (db) => (await db.query<{ id: string; subscription: { endpoint: string } }>(
        'SELECT id, subscription FROM push_subscriptions WHERE client_phone = $1', [phone]
      )).rows, auth.userId);
      let sent = 0;
      const caducadas: string[] = [];
      for (const s of subs) {
        try {
          const r = await fetch(s.subscription.endpoint, {
            method: 'POST',
            headers: { Authorization: cabeceraVapid(new URL(s.subscription.endpoint).origin), TTL: '86400', 'Content-Length': '0' }
          });
          if (r.ok) sent += 1;
          else if (r.status === 404 || r.status === 410) caducadas.push(s.id);
        } catch {
          /* un endpoint caído no detiene al resto */
        }
      }
      if (caducadas.length) {
        await conTx((db) => db.query('DELETE FROM push_subscriptions WHERE id = ANY($1::uuid[])', [caducadas]), auth.userId);
      }
      return { sent };
    }
  },

  'save-push-subscription': {
    POST: async (ctx) => {
      const d = parsear(pushSchema, ctx.req.body);
      await limitar(ctx, 'push', 5, 3600);
      await conTx((db) => db.query('SELECT save_push_subscription($1, $2, $3)', [d.phone, d.subscription.endpoint, JSON.stringify(d.subscription)]));
      return { success: true };
    }
  },

  // La analítica nunca debe romper la navegación: errores silenciosos.
  'track-pwa-install': {
    POST: async (ctx) => {
      try {
        const d = z.object({ deviceType: z.string().max(20).optional(), appType: z.string().max(20).optional() }).parse(ctx.req.body ?? {});
        await limitar(ctx, 'pwa', 20, 3600);
        await conTx((db) => db.query('INSERT INTO pwa_installs (device_type, app_type) VALUES ($1, $2)', [d.deviceType ?? null, d.appType ?? null]));
        return { ok: true };
      } catch {
        return { ok: false };
      }
    }
  },

  'track-visit': {
    POST: async (ctx) => {
      try {
        const d = z.object({
          sessionId: z.string().min(1).max(64),
          eventType: z.string().max(40).optional(),
          label: z.string().max(120).optional(),
          deviceType: z.string().max(20).optional()
        }).parse(ctx.req.body ?? {});
        await limitar(ctx, 'visita', 120, 60);
        await conTx((db) => db.query(
          'INSERT INTO site_visits (session_id, event_type, label, device_type) VALUES ($1, $2, $3, $4)',
          [d.sessionId, d.eventType ?? null, d.label ?? null, d.deviceType ?? null]
        ));
        return { ok: true };
      } catch {
        return { ok: false };
      }
    }
  }
});
