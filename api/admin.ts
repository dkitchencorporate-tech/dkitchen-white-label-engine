import { z } from 'zod';
import { put } from '@vercel/blob';
import { conTx } from './_lib/db.js';
import { exigirAdmin } from './_lib/auth.js';
import { crearManejador, HttpError, param, parsear, type Ctx } from './_lib/http.js';
import {
  ajustesSchema, catalogoAltaSchema, catalogoBorradoSchema, catalogoEdicionSchema, clienteKioskoSchema,
  pedidoAdminSchema, telefono, upsellSchema, uuid, zonaAltaSchema, zonaBorradoSchema, zonaEdicionSchema
} from './_lib/esquemas.js';
import { env } from './_lib/env.js';

/** Una conexión de pg no admite consultas simultáneas: se ejecutan en orden. */
async function secuencial<T>(qs: (() => Promise<T>)[]): Promise<T[]> {
  const out: T[] = [];
  for (const q of qs) out.push(await q());
  return out;
}

// Doble capa: exigirAdmin comprueba el rol en la BD y, además, cada consulta
// corre con app.user_id fijado, así que las políticas RLS lo vuelven a verificar.
const comoAdmin = <T>(ctx: Ctx, fn: (db: import('./_lib/db.js').Db) => Promise<T>) =>
  exigirAdmin(ctx.req).then((a) => conTx(fn, a.userId));

const TABLAS = { category: 'categories', subcategory: 'subcategories', product: 'products' } as const;
const COLUMNAS = {
  category: ['name', 'subtitle', 'description', 'sort_order', 'is_active'],
  subcategory: ['category_id', 'name', 'sort_order', 'is_active'],
  product: ['category_id', 'subcategory_id', 'name', 'description', 'price', 'image_url', 'is_available', 'is_upsell',
            'badge', 'allergens', 'customization_schema', 'sort_order', 'stock', 'is_alcohol', 'unit_label']
} as const;

function valoresColumnas(tipo: keyof typeof COLUMNAS, datos: Record<string, unknown>) {
  const cols: string[] = [];
  const vals: unknown[] = [];
  for (const c of COLUMNAS[tipo]) {
    if (datos[c] === undefined) continue;
    cols.push(c);
    const v = datos[c];
    vals.push(c === 'customization_schema' ? JSON.stringify(v) : v === '' ? null : v);
  }
  return { cols, vals };
}

const TIPOS_IMAGEN: Record<string, { ext: string; firma: (b: Buffer) => boolean }> = {
  'image/jpeg': { ext: 'jpg', firma: (b) => b[0] === 0xff && b[1] === 0xd8 },
  'image/png': { ext: 'png', firma: (b) => b.subarray(0, 4).toString('hex') === '89504e47' },
  'image/webp': { ext: 'webp', firma: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' }
};

export default crearManejador({
  analytics: {
    GET: (ctx) =>
      comoAdmin(ctx, async (db) => {
        const [siteVisits, pwaInstalls, orderItems, profiles, kioskCustomers, orders] = await secuencial([
          () => db.query('SELECT * FROM site_visits ORDER BY created_at DESC LIMIT 5000'),
          () => db.query('SELECT * FROM pwa_installs ORDER BY created_at DESC LIMIT 2000'),
          () => db.query(`SELECT i.quantity, i.unit_price, i.product_name, i.customization_details, i.order_id,
                                 json_build_object('created_at', o.created_at, 'status', o.status) AS orders
                          FROM order_items i JOIN orders o ON o.id = i.order_id
                          WHERE o.created_at > now() - interval '365 days'`),
          () => db.query(`SELECT id, email, full_name, phone, points, is_admin, is_email_verified, created_at
                          FROM profiles ORDER BY created_at DESC LIMIT 5000`),
          () => db.query('SELECT * FROM kiosk_customers ORDER BY created_at DESC LIMIT 5000'),
          () => db.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5000')
        ]);
        return {
          siteVisits: siteVisits.rows, pwaInstalls: pwaInstalls.rows, orderItems: orderItems.rows,
          profiles: profiles.rows, kioskCustomers: kioskCustomers.rows, orders: orders.rows
        };
      })
  },

  catalog: {
    POST: (ctx) => {
      const d = parsear(catalogoAltaSchema, ctx.req.body);
      return comoAdmin(ctx, async (db) => {
        const { cols, vals } = valoresColumnas(d.type, d as Record<string, unknown>);
        const r = await db.query(
          `INSERT INTO ${TABLAS[d.type]} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
          vals
        );
        return { row: r.rows[0] };
      });
    },
    PUT: (ctx) => {
      const d = parsear(catalogoEdicionSchema, ctx.req.body);
      return comoAdmin(ctx, async (db) => {
        const { cols, vals } = valoresColumnas(d.type, d as Record<string, unknown>);
        if (cols.length === 0) throw new HttpError(400, 'No hay cambios que guardar.');
        const extra = d.type === 'product' ? ', updated_at = now()' : '';
        const r = await db.query(
          `UPDATE ${TABLAS[d.type]} SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')}${extra} WHERE id = $1 RETURNING *`,
          [d.id, ...vals]
        );
        if (!r.rows[0]) throw new HttpError(404, 'No encontrado.');
        return { row: r.rows[0] };
      });
    },
    DELETE: (ctx) => {
      const d = parsear(catalogoBorradoSchema, ctx.req.body);
      return comoAdmin(ctx, async (db) => {
        await db.query(`DELETE FROM ${TABLAS[d.type]} WHERE id = $1`, [d.id]);
        return { success: true };
      });
    }
  },

  zones: {
    GET: (ctx) => comoAdmin(ctx, async (db) => ({
      zones: (await db.query('SELECT * FROM delivery_zones ORDER BY sort_order, name')).rows
    })),
    POST: (ctx) => {
      const d = parsear(zonaAltaSchema, ctx.req.body);
      return comoAdmin(ctx, async (db) => {
        const r = await db.query(
          `INSERT INTO delivery_zones (name, postal_codes, delivery_fee, min_order, free_delivery_over, eta_minutes,
                                       price_adjust_pct, is_active, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, true), COALESCE($9, 0)) RETURNING *`,
          [d.name, d.postal_codes, d.delivery_fee, d.min_order, d.free_delivery_over ?? null, d.eta_minutes,
           d.price_adjust_pct, d.is_active ?? null, d.sort_order ?? null]
        );
        return { zone: r.rows[0] };
      });
    },
    PUT: (ctx) => {
      const { id, ...d } = parsear(zonaEdicionSchema, ctx.req.body);
      return comoAdmin(ctx, async (db) => {
        const cols = Object.keys(d).filter((c) => (d as Record<string, unknown>)[c] !== undefined);
        if (cols.length === 0) throw new HttpError(400, 'No hay cambios que guardar.');
        const r = await db.query(
          `UPDATE delivery_zones SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1 RETURNING *`,
          [id, ...cols.map((c) => (d as Record<string, unknown>)[c])]
        );
        if (!r.rows[0]) throw new HttpError(404, 'No encontrado.');
        return { zone: r.rows[0] };
      });
    },
    DELETE: (ctx) => {
      const { id } = parsear(zonaBorradoSchema, ctx.req.body);
      return comoAdmin(ctx, async (db) => {
        await db.query('DELETE FROM delivery_zones WHERE id = $1', [id]);
        return { success: true };
      });
    }
  },

  'upload-image': {
    POST: async (ctx) => {
      const d = parsear(
        z.object({
          filename: z.string().max(120).optional(),
          contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
          dataBase64: z.string().max(4 * 1024 * 1024, 'La imagen es demasiado grande (máximo ~3 MB)')
        }),
        ctx.req.body
      );
      await exigirAdmin(ctx.req);
      if (!env().BLOB_READ_WRITE_TOKEN) throw new HttpError(503, 'El almacenamiento de imágenes no está configurado.');
      const buffer = Buffer.from(d.dataBase64, 'base64');
      const tipo = TIPOS_IMAGEN[d.contentType];
      if (!tipo.firma(buffer)) throw new HttpError(400, 'El archivo no es una imagen válida.');
      const nombre = (d.filename || 'producto').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60) || 'producto';
      const blob = await put(`products/${Date.now()}-${nombre}.${tipo.ext}`, buffer, {
        access: 'public', contentType: d.contentType, addRandomSuffix: true
      });
      return { url: blob.url };
    }
  },

  clients: {
    GET: (ctx) => {
      const q = (param(ctx.req, 'q') ?? '').slice(0, 80);
      const soloKiosko = param(ctx.req, 'onlyKiosk') === '1';
      return comoAdmin(ctx, async (db) => {
        if (soloKiosko) {
          const r = await db.query(
            `SELECT phone, name, address, created_at FROM kiosk_customers
             WHERE $1 = '' OR phone ILIKE '%' || $1 || '%' OR name ILIKE '%' || $1 || '%' OR address::text ILIKE '%' || $1 || '%'
             ORDER BY created_at DESC LIMIT 200`,
            [q]
          );
          return { clients: r.rows };
        }
        return { clients: (await db.query('SELECT * FROM search_client($1)', [q])).rows };
      });
    },
    PUT: (ctx) => {
      const d = parsear(clienteKioskoSchema, ctx.req.body);
      return comoAdmin(ctx, async (db) => {
        const perfil = await db.query('SELECT id, full_name, phone, address FROM profiles WHERE phone = $1', [d.phone]);
        if (perfil.rows[0]) {
          const p = perfil.rows[0];
          return { client: { id: p.id, name: p.full_name, phone: p.phone, address: p.address, is_registered: true } };
        }
        if (d.originalPhone && d.originalPhone !== d.phone) {
          await db.query('DELETE FROM kiosk_customers WHERE phone = $1', [d.originalPhone]);
        }
        const direccion = d.address == null ? null : typeof d.address === 'string' ? { text: d.address } : d.address;
        const r = await db.query(
          `INSERT INTO kiosk_customers (phone, name, address) VALUES ($1, $2, $3)
           ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address RETURNING *`,
          [d.phone, d.name ?? null, direccion ? JSON.stringify(direccion) : null]
        );
        return { client: { ...r.rows[0], is_registered: false } };
      });
    },
    DELETE: (ctx) => {
      const { phone } = parsear(z.object({ phone: telefono }), ctx.req.body);
      return comoAdmin(ctx, async (db) => {
        await db.query('DELETE FROM kiosk_customers WHERE phone = $1', [phone]);
        return { success: true };
      });
    }
  },

  'kiosk-add-items': {
    POST: (ctx) => {
      const d = parsear(
        z.object({
          orderId: uuid,
          items: z.array(z.object({
            product_id: z.coerce.number().int().positive(),
            quantity: z.coerce.number().int().min(1).max(50),
            options: z.array(z.string().max(80)).max(20).optional(),
            customization_details: z.object({ extras: z.array(z.string().max(80)).max(20).optional(), notes: z.string().max(200).optional() }).passthrough().optional()
          })).min(1).max(30)
        }),
        ctx.req.body
      );
      return comoAdmin(ctx, async (db) => {
        const items = d.items.map((i) => ({
          product_id: i.product_id, quantity: i.quantity,
          options: i.options ?? i.customization_details?.extras ?? [], notes: i.customization_details?.notes ?? ''
        }));
        await db.query('SELECT add_items_to_kiosk_order($1, $2)', [d.orderId, JSON.stringify(items)]);
        return { success: true };
      });
    }
  },

  orders: {
    GET: (ctx) => {
      const filtros = parsear(
        z.object({
          status: z.string().max(100).optional(),
          from: z.string().datetime({ offset: true }).optional().or(z.string().date().optional()),
          to: z.string().datetime({ offset: true }).optional().or(z.string().date().optional())
        }),
        { status: param(ctx.req, 'status'), from: param(ctx.req, 'from'), to: param(ctx.req, 'to') }
      );
      const estados = filtros.status ? filtros.status.split(',').map((s) => s.trim()).filter(Boolean) : null;
      return comoAdmin(ctx, async (db) => {
        const r = await db.query(
          `SELECT o.*, COALESCE(json_agg(json_build_object(
              'id', i.id, 'product_id', i.product_id, 'product_name', i.product_name, 'quantity', i.quantity,
              'unit_price', i.unit_price, 'options', i.options, 'customization_details', i.customization_details,
              'is_sent_to_kitchen', i.is_sent_to_kitchen) ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL), '[]') AS order_items
           FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
           WHERE ($1::text[] IS NULL OR o.status = ANY($1::text[]))
             AND ($2::timestamptz IS NULL OR o.created_at >= $2::timestamptz)
             AND ($3::timestamptz IS NULL OR o.created_at < $3::timestamptz)
           GROUP BY o.id ORDER BY o.created_at DESC LIMIT 500`,
          [estados, filtros.from ?? null, filtros.to ?? null]
        );
        return { orders: r.rows };
      });
    },
    PATCH: (ctx) => {
      const d = parsear(pedidoAdminSchema, ctx.req.body);
      return comoAdmin(ctx, async (db) => {
        const r = await db.query(
          `UPDATE orders SET status = COALESCE($2, status), notes = COALESCE($3, notes),
             estimated_ready_at = COALESCE($4, estimated_ready_at), payment_method = COALESCE($5, payment_method)
           WHERE id = $1 RETURNING *`,
          [d.id, d.status ?? null, d.notes ?? null, d.estimated_ready_at ?? null, d.payment_method ?? null]
        );
        if (!r.rows[0]) throw new HttpError(404, 'Pedido no encontrado.');
        for (const item of d.items ?? []) {
          await db.query(
            `UPDATE order_items SET customization_details = COALESCE($2, customization_details),
               is_sent_to_kitchen = COALESCE($3, is_sent_to_kitchen)
             WHERE id = $1 AND order_id = $4`,
            [item.id, item.customization_details ? JSON.stringify(item.customization_details) : null, item.is_sent_to_kitchen ?? null, d.id]
          );
        }
        return { order: r.rows[0] };
      });
    },
    DELETE: (ctx) => {
      const { id } = parsear(z.object({ id: uuid }), ctx.req.body);
      return comoAdmin(ctx, async (db) => {
        await db.query('DELETE FROM orders WHERE id = $1', [id]);
        return { success: true };
      });
    }
  },

  settings: {
    GET: (ctx) =>
      comoAdmin(ctx, async (db) => ({
        settings: (await db.query('SELECT * FROM store_settings WHERE id = 1')).rows[0],
        hours: (await db.query('SELECT * FROM store_hours ORDER BY day_of_week')).rows
      })),
    PUT: (ctx) => {
      const d = parsear(ajustesSchema, ctx.req.body);
      return comoAdmin(ctx, async (db) => {
        let settings = null;
        const s = d.settings ?? {};
        const cols = Object.keys(s) as (keyof typeof s)[];
        if (cols.length > 0) {
          const r = await db.query(
            `UPDATE store_settings SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')}, updated_at = now() WHERE id = 1 RETURNING *`,
            cols.map((c) => (s[c] === '' ? null : s[c]))
          );
          settings = r.rows[0];
        }
        for (const h of d.hours ?? []) {
          await db.query(
            `INSERT INTO store_hours (day_of_week, is_open, open_time, close_time) VALUES ($1, $2, $3, $4)
             ON CONFLICT (day_of_week) DO UPDATE SET is_open = EXCLUDED.is_open, open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time`,
            [h.day_of_week, h.is_open, h.open_time, h.close_time]
          );
        }
        return { settings };
      });
    }
  },

  upsells: {
    GET: (ctx) =>
      comoAdmin(ctx, async (db) => ({
        upsells: (await db.query(
          `SELECT u.id, u.category, u.sort_order, u.product_id,
                  json_build_object('name', p.name, 'price', p.price, 'image_url', p.image_url, 'is_available', p.is_available) AS products
           FROM upsells u JOIN products p ON p.id = u.product_id ORDER BY u.sort_order`
        )).rows
      })),
    POST: (ctx) => {
      const d = parsear(upsellSchema, ctx.req.body);
      return comoAdmin(ctx, async (db) => ({
        upsell: (await db.query('INSERT INTO upsells (product_id, category, sort_order) VALUES ($1, $2, COALESCE($3, 0)) RETURNING *',
          [d.product_id, d.category, d.sort_order ?? null])).rows[0]
      }));
    },
    PUT: (ctx) => {
      const d = parsear(upsellSchema.partial().extend({ id: z.coerce.number().int().positive() }), ctx.req.body);
      return comoAdmin(ctx, async (db) => {
        const r = await db.query(
          `UPDATE upsells SET product_id = COALESCE($2, product_id), category = COALESCE($3, category),
             sort_order = COALESCE($4, sort_order) WHERE id = $1 RETURNING *`,
          [d.id, d.product_id ?? null, d.category ?? null, d.sort_order ?? null]
        );
        if (!r.rows[0]) throw new HttpError(404, 'No encontrado.');
        return { upsell: r.rows[0] };
      });
    },
    DELETE: (ctx) => {
      const { id } = parsear(z.object({ id: z.coerce.number().int().positive() }), ctx.req.body);
      return comoAdmin(ctx, async (db) => {
        await db.query('DELETE FROM upsells WHERE id = $1', [id]);
        return { success: true };
      });
    }
  }
});
