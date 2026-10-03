import { z } from 'zod';
import { conTx, type Db } from './_lib/db.js';
import {
  comprobarContrasena, exigirUsuario, firmarToken, hashContrasena, hashToken, nuevoTokenVerificacion
} from './_lib/auth.js';
import { crearManejador, HttpError, limitar, parsear } from './_lib/http.js';
import { email, loginSchema, perfilUpdateSchema, registroSchema, telefono } from './_lib/esquemas.js';
import { boton, datosMarca, enlaceVerificacion, enviar, escapar, plantilla } from './_lib/correo.js';

// Columnas que nunca salen hacia el navegador.
const COLUMNAS_PERFIL = `id, email, full_name, phone, address, points, is_admin, is_email_verified, created_at`;

async function leerPerfil(db: Db, id: string) {
  const r = await db.query(`SELECT ${COLUMNAS_PERFIL} FROM profiles WHERE id = $1`, [id]);
  return r.rows[0] ?? null;
}

async function enviarVerificacion(db: Db, to: string, nombre: string | null, token: string) {
  const marca = await datosMarca(db);
  const enlace = enlaceVerificacion(token);
  await enviar({
    to,
    marca: marca.nombre,
    subject: `Verifica tu correo · ${marca.nombre}`,
    html: plantilla(
      marca.nombre,
      'Verificación de correo',
      `<p>Hola ${escapar(nombre || '')},</p>
       <p>Confirma tu correo para activar tu cuenta y poder canjear tus puntos.</p>
       ${boton('Verificar mi correo', enlace)}
       <p style="color:#71717a;font-size:12px;">El enlace caduca en 48 horas. Si no has creado una cuenta, ignora este mensaje.</p>`
    )
  });
}

export default crearManejador({
  login: {
    POST: async (ctx) => {
      const { identificador, password } = parsear(loginSchema, ctx.req.body);
      await limitar(ctx, 'login-ip', 10, 300);
      await limitar(ctx, 'login-id', 5, 300, identificador);
      return conTx(async (db) => {
        const r = await db.query<{ id: string; password_hash: string; token_version: number }>(
          'SELECT * FROM auth_lookup($1)', [identificador]
        );
        const fila = r.rows[0] ?? null;
        const ok = await comprobarContrasena(password, fila?.password_hash ?? null);
        if (!ok || !fila) throw new HttpError(401, 'Correo/teléfono o contraseña incorrectos.');
        await db.query("SELECT set_config('app.user_id', $1, true)", [fila.id]);
        const profile = await leerPerfil(db, fila.id);
        return { token: firmarToken(fila.id, fila.token_version, profile.is_admin), profile };
      });
    }
  },

  register: {
    POST: async (ctx) => {
      const d = parsear(registroSchema, ctx.req.body);
      await limitar(ctx, 'registro', 5, 3600);
      const hash = await hashContrasena(d.password);
      const verif = nuevoTokenVerificacion();
      return conTx(async (db) => {
        let id: string;
        try {
          const r = await db.query<{ id: string }>('SELECT register_profile($1, $2, $3, $4, $5, $6) AS id', [
            d.email, hash, d.full_name, d.phone, d.address ? JSON.stringify(d.address) : null, verif.hash
          ]);
          id = r.rows[0].id;
        } catch (err) {
          if ((err as { code?: string }).code === '23505') {
            throw new HttpError(409, 'Ese correo o teléfono ya está registrado en otra cuenta.');
          }
          throw err;
        }
        await db.query("SELECT set_config('app.user_id', $1, true)", [id]);
        const profile = await leerPerfil(db, id);
        await enviarVerificacion(db, d.email, d.full_name, verif.token);
        return {
          token: firmarToken(id, 0, false),
          profile,
          message: 'Cuenta creada. Te hemos enviado un correo para verificar tu email.'
        };
      });
    }
  },

  'verify-email': {
    POST: async (ctx) => {
      const { token } = parsear(z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }), ctx.req.body);
      await limitar(ctx, 'verificar', 20, 3600);
      const id = await conTx(async (db) => {
        const r = await db.query<{ id: string | null }>('SELECT verify_email($1) AS id', [hashToken(token)]);
        return r.rows[0]?.id ?? null;
      });
      if (!id) throw new HttpError(400, 'El enlace no es válido o ha caducado.');
      return { success: true, message: '¡Correo verificado! Ya puedes canjear tus puntos.' };
    }
  },

  'resend-verification': {
    POST: async (ctx) => {
      const d = parsear(z.object({ email }), ctx.req.body);
      await limitar(ctx, 'reenviar', 3, 3600);
      const verif = nuevoTokenVerificacion();
      await conTx(async (db) => {
        const r = await db.query<{ email: string; full_name: string | null }>(
          'SELECT * FROM renew_email_verification($1, $2)', [d.email, verif.hash]
        );
        if (r.rows[0]) await enviarVerificacion(db, r.rows[0].email, r.rows[0].full_name, verif.token);
      });
      // Misma respuesta exista o no la cuenta (evita enumerar correos).
      return { success: true, message: 'Si la cuenta existe y no está verificada, te hemos enviado un enlace.' };
    }
  },

  profile: {
    GET: async ({ req }) => {
      const auth = await exigirUsuario(req);
      return conTx(async (db) => {
        const profile = await leerPerfil(db, auth.userId);
        if (!profile) throw new HttpError(404, 'Perfil no encontrado.');
        const orders = await db.query(
          `SELECT o.*, COALESCE(json_agg(json_build_object(
              'id', i.id, 'product_id', i.product_id, 'product_name', i.product_name, 'quantity', i.quantity,
              'unit_price', i.unit_price, 'options', i.options, 'customization_details', i.customization_details)
              ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL), '[]') AS order_items
           FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
           WHERE o.user_id = $1 GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100`,
          [auth.userId]
        );
        return { profile, orders: orders.rows };
      }, auth.userId);
    },
    PUT: async ({ req }) => {
      const auth = await exigirUsuario(req);
      const d = parsear(perfilUpdateSchema, req.body);
      return conTx(async (db) => {
        try {
          await db.query(
            `UPDATE profiles SET
               full_name = COALESCE($2, full_name), phone = COALESCE($3, phone),
               email = COALESCE($4, email), address = COALESCE($5, address)
             WHERE id = $1`,
            [auth.userId, d.full_name ?? null, d.phone ?? null, d.email ?? null, d.address ? JSON.stringify(d.address) : null]
          );
        } catch (err) {
          if ((err as { code?: string }).code === '23505') throw new HttpError(409, 'Ese teléfono o correo ya está en uso.');
          throw err;
        }
        return { profile: await leerPerfil(db, auth.userId) };
      }, auth.userId);
    }
  },

  'delete-account': {
    POST: async ({ req }) => {
      const auth = await exigirUsuario(req);
      if (auth.isAdmin) throw new HttpError(400, 'Una cuenta de administrador no se puede borrar desde aquí.');
      await conTx((db) => db.query('DELETE FROM profiles WHERE id = $1', [auth.userId]), auth.userId);
      return { success: true };
    }
  },

  'is-phone-registered': {
    POST: async (ctx) => {
      const { phone } = parsear(z.object({ phone: telefono }), ctx.req.body);
      await limitar(ctx, 'telefono', 10, 600);
      const registered = await conTx(async (db) => {
        const r = await db.query<{ ok: boolean }>('SELECT is_phone_registered($1) AS ok', [phone]);
        return r.rows[0]?.ok ?? false;
      });
      return { registered };
    }
  }
});
