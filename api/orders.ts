import { z } from 'zod';
import { conTx, type Db } from './_lib/db.js';
import { obtenerAuth, exigirUsuario } from './_lib/auth.js';
import { crearManejador, HttpError, limitar, param, parsear } from './_lib/http.js';
import { checkoutSchema, reviewSchema, uuid } from './_lib/esquemas.js';
import { boton, datosMarca, enviar, escapar, plantilla } from './_lib/correo.js';
import { appUrl, env } from './_lib/env.js';

interface PedidoCreado {
  id: string;
  user_id: string | null;
  client_name: string;
  total: number;
  delivery_method: string;
  [k: string]: unknown;
}

/** "HH:MM" (hora local del negocio) → instante: hoy, o mañana si ya pasó. */
async function horaProgramada(db: Db, hhmm: string): Promise<string> {
  const r = await db.query<{ ts: string }>(
    `SELECT (CASE WHEN t < now() THEN t + interval '1 day' ELSE t END)::text AS ts
     FROM (SELECT (((now() AT TIME ZONE s.timezone)::date + $1::time) AT TIME ZONE s.timezone) AS t
           FROM store_settings s WHERE s.id = 1) x`,
    [hhmm]
  );
  return r.rows[0].ts;
}

async function avisarPedido(db: Db, pedido: PedidoCreado, emailCliente: string | null): Promise<void> {
  const marca = await datosMarca(db);
  const ref = pedido.id.slice(0, 8).toUpperCase();
  const total = Number(pedido.total).toFixed(2).replace('.', ',');
  const destinoNegocio = marca.email || env().SMTP_USER;
  const envios: Promise<boolean>[] = [];
  if (destinoNegocio) {
    envios.push(enviar({
      to: destinoNegocio,
      marca: marca.nombre,
      subject: `Nuevo pedido #${ref} · ${total} €`,
      html: plantilla(marca.nombre, 'Nuevo pedido', `<p><strong>Cliente:</strong> ${escapar(pedido.client_name)}</p>
        <p><strong>Total:</strong> ${total} €</p><p>Revisa el panel de pedidos para ver el detalle.</p>`)
    }));
  }
  if (emailCliente) {
    envios.push(enviar({
      to: emailCliente,
      marca: marca.nombre,
      subject: `Pedido confirmado #${ref} · ${marca.nombre}`,
      html: plantilla(marca.nombre, 'Pedido confirmado', `<p>Hola ${escapar(pedido.client_name)},</p>
        <p>Hemos recibido tu pedido. Total: <strong>${total} €</strong>.</p>
        ${appUrl() ? boton('Seguir mi pedido', `${appUrl()}/pedido`) : ''}`)
    }));
  }
  await Promise.all(envios);
}

export default crearManejador({
  checkout: {
    POST: async (ctx) => {
      const d = parsear(checkoutSchema, ctx.req.body);
      await limitar(ctx, 'checkout', 10, 60);
      const auth = await obtenerAuth(ctx.req);

      const direccion =
        d.delivery_address == null ? null
          : typeof d.delivery_address === 'string' ? { text: d.delivery_address }
            : d.delivery_address;

      return conTx(async (db) => {
        const scheduled = d.scheduled_for ?? (d.scheduled_time ? await horaProgramada(db, d.scheduled_time) : null);
        const payload = {
          client_name: d.client_name,
          client_phone: d.client_phone,
          delivery_method: d.delivery_method,
          delivery_address: direccion,
          notes: d.notes ?? null,
          payment_method: d.payment_method,
          scheduled_for: scheduled,
          points_redeemed: d.points_redeemed,
          idempotency_key: d.idempotency_key ?? null,
          source: d.source,
          items: d.items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            options: i.options ?? i.customization_details?.extras ?? [],
            notes: i.notes ?? i.customization_details?.notes ?? ''
          }))
        };
        const r = await db.query<{ pedido: PedidoCreado }>('SELECT process_checkout($1) AS pedido', [JSON.stringify(payload)]);
        const pedido = r.rows[0].pedido;

        let emailCliente: string | null = null;
        if (pedido.user_id && d.source === 'web') {
          const p = await db.query<{ email: string; is_email_verified: boolean }>(
            'SELECT email, is_email_verified FROM profiles WHERE id = $1', [pedido.user_id]
          );
          if (p.rows[0]?.is_email_verified) emailCliente = p.rows[0].email;
        }
        await avisarPedido(db, pedido, emailCliente);
        return { orderId: pedido.id, order: pedido };
      }, auth?.userId ?? null);
    }
  },

  'order-status': {
    GET: async (ctx) => {
      const id = parsear(uuid, param(ctx.req, 'id'));
      await limitar(ctx, 'estado', 120, 60);
      const fila = await conTx(async (db) => (await db.query('SELECT * FROM get_order_status($1)', [id])).rows[0] ?? null);
      if (!fila) throw new HttpError(404, 'Pedido no encontrado.');
      return fila;
    }
  },

  'claim-order': {
    POST: async ({ req }) => {
      const auth = await exigirUsuario(req);
      const { orderId } = parsear(z.object({ orderId: uuid }), req.body);
      const ok = await conTx(async (db) => (await db.query<{ ok: boolean }>('SELECT claim_guest_order($1) AS ok', [orderId])).rows[0].ok, auth.userId);
      if (!ok) throw new HttpError(400, 'No se pudo asociar el pedido a tu cuenta.');
      return { success: true };
    }
  },

  review: {
    POST: async (ctx) => {
      const d = parsear(reviewSchema, ctx.req.body);
      await limitar(ctx, 'valoracion', 10, 3600);
      const auth = await obtenerAuth(ctx.req);
      const ok = await conTx(
        async (db) => (await db.query<{ ok: boolean }>('SELECT submit_review($1, $2, $3) AS ok', [d.orderId, d.rating, d.comment ?? null])).rows[0].ok,
        auth?.userId ?? null
      );
      if (!ok) throw new HttpError(409, 'Este pedido ya tiene valoración o aún no se ha entregado.');
      return { success: true };
    }
  }
});
