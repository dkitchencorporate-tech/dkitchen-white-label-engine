// Pruebas de integración de la API contra un Postgres real (base de pruebas).
// Variables: TEST_DATABASE_URL (dueño) y TEST_API_DATABASE_URL (rol motor_api).
// Por defecto usan el Postgres local de desarrollo (ver docs/DESARROLLO_LOCAL.md).
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { migrar } from '../scripts/db-migrar.js';
import { sembrar } from '../scripts/db-semilla.js';
import { crearAdmin } from '../scripts/crear-admin.js';
import type { Req, Res } from '../api/_lib/http.js';

const OWNER_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/motor_test';
const API_URL = process.env.TEST_API_DATABASE_URL || 'postgres://motor_api:motor_api_local@localhost:5432/motor_test';

type Handler = (req: Req, res: Res) => Promise<void>;
let account: Handler, orders: Handler, admin: Handler, catalog: Handler;
let owner: pg.Client;
let adminToken = '';
let adminEmail = 'admin@pruebas.example';

async function llamar(h: Handler, o: { method?: string; action?: string; query?: Record<string, string>; body?: unknown; token?: string }) {
  let status = 0;
  let body: any = null;
  const res: Res = {
    status(c) { status = c; return res; },
    json(b) { body = b; },
    setHeader() {}
  };
  const req: Req = {
    method: o.method ?? 'POST',
    query: { ...(o.action ? { action: o.action } : {}), ...(o.query ?? {}) },
    body: o.body,
    headers: { 'x-real-ip': `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, ...(o.token ? { authorization: `Bearer ${o.token}` } : {}) }
  };
  await h(req, res);
  return { status, body };
}

async function idProducto(nombre: string): Promise<number> {
  const r = await owner.query('SELECT id FROM products WHERE name = $1', [nombre]);
  return r.rows[0].id;
}

async function registrar(sufijo: string) {
  const email = `cliente-${sufijo}@pruebas.example`;
  const r = await llamar(account, {
    action: 'register',
    body: { full_name: 'Cliente Pruebas', phone: `+34 6${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`, email, password: 'contrasena-segura-1' }
  });
  expect(r.status).toBe(200);
  return { token: r.body.token as string, id: r.body.profile.id as string, email, phone: r.body.profile.phone as string };
}

beforeAll(async () => {
  owner = new pg.Client({ connectionString: OWNER_URL });
  await owner.connect();
  await owner.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrar(OWNER_URL, () => undefined);
  await sembrar(OWNER_URL, 'demo');
  // Horario abierto todo el día para que las pruebas no dependan de la hora.
  await owner.query("UPDATE store_hours SET is_open = true, open_time = '00:00', close_time = '23:59'");
  const pass = await crearAdmin(OWNER_URL, adminEmail, 'Admin Pruebas');

  process.env.APP_DATABASE_URL = API_URL;
  process.env.APP_JWT_SECRET = 'x'.repeat(48);
  ({ default: account } = await import('../api/account.js'));
  ({ default: orders } = await import('../api/orders.js'));
  ({ default: admin } = await import('../api/admin.js'));
  ({ default: catalog } = await import('../api/catalog.js'));

  const login = await llamar(account, { action: 'login', body: { email: adminEmail, password: pass } });
  expect(login.status).toBe(200);
  adminToken = login.body.token;
});

afterAll(async () => {
  const { cerrarPool } = await import('../api/_lib/db.js');
  await cerrarPool();
  await owner.end();
});

describe('Catálogo', () => {
  it('oculta los productos no disponibles al público y los muestra al admin con ?all=1', async () => {
    await owner.query("UPDATE products SET is_available = false WHERE name = 'Agua mineral'");
    const pub = await llamar(catalog, { method: 'GET' });
    expect(pub.status).toBe(200);
    expect(pub.body.products.some((p: any) => p.name === 'Agua mineral')).toBe(false);
    const adm = await llamar(catalog, { method: 'GET', query: { all: '1' }, token: adminToken });
    expect(adm.body.products.some((p: any) => p.name === 'Agua mineral')).toBe(true);
    await owner.query("UPDATE products SET is_available = true WHERE name = 'Agua mineral'");
  });
});

describe('Cuentas', () => {
  it('registra, inicia sesión y nunca devuelve el hash de la contraseña', async () => {
    const c = await registrar('a');
    const login = await llamar(account, { action: 'login', body: { email: c.email, password: 'contrasena-segura-1' } });
    expect(login.status).toBe(200);
    expect(JSON.stringify(login.body)).not.toMatch(/password_hash|verification/);
  });

  it('rechaza contraseñas cortas y correos duplicados', async () => {
    const corta = await llamar(account, { action: 'register', body: { full_name: 'X Y', phone: '+34 600111222', email: 'corta@pruebas.example', password: '123' } });
    expect(corta.status).toBe(400);
    const c = await registrar('dup');
    const dup = await llamar(account, { action: 'register', body: { full_name: 'X Y', phone: '+34 699888777', email: c.email, password: 'contrasena-segura-1' } });
    expect(dup.status).toBe(409);
  });

  it('las credenciales erróneas dan 401 con el mismo mensaje exista o no el usuario', async () => {
    const a = await llamar(account, { action: 'login', body: { email: adminEmail, password: 'mala' } });
    const b = await llamar(account, { action: 'login', body: { email: 'nadie@pruebas.example', password: 'mala' } });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error).toBe(b.body.error);
  });

  it('revoca los tokens al incrementar token_version', async () => {
    const c = await registrar('revoca');
    expect((await llamar(account, { method: 'GET', action: 'profile', token: c.token })).status).toBe(200);
    await owner.query("SELECT set_config('app.trusted','on',false)");
    await owner.query('UPDATE profiles SET token_version = token_version + 1 WHERE id = $1', [c.id]);
    expect((await llamar(account, { method: 'GET', action: 'profile', token: c.token })).status).toBe(401);
  });
});

describe('Checkout: el precio lo decide el servidor', () => {
  it('ignora el precio enviado por el cliente y cobra las opciones según la carta', async () => {
    const plato = await idProducto('Plato de la casa');
    const r = await llamar(orders, {
      action: 'checkout',
      body: {
        client_name: 'Ana', client_phone: '+34 600000001', delivery_method: 'pickup',
        items: [{ product_id: plato, quantity: 2, unit_price: 0.01, options: ['queso', 'bacon'] }]
      }
    });
    expect(r.status).toBe(200);
    // (10,90 + 1,00 + 1,50) × 2 = 26,80; recogida sin gastos de envío.
    expect(r.body.order.subtotal).toBe(26.8);
    expect(r.body.order.total).toBe(26.8);
    expect(r.body.order.order_items[0].unit_price).toBe(13.4);
  });

  it('acepta extras por nombre (compatibilidad) y rechaza opciones inexistentes', async () => {
    const plato = await idProducto('Plato de la casa');
    const ok = await llamar(orders, {
      action: 'checkout',
      body: { client_name: 'Ana', client_phone: '+34 600000001', delivery_method: 'pickup', items: [{ product_id: plato, quantity: 1, customization_details: { extras: ['Huevo'] } }] }
    });
    expect(ok.body.order.total).toBe(11.9);
    const mal = await llamar(orders, {
      action: 'checkout',
      body: { client_name: 'Ana', client_phone: '+34 600000001', delivery_method: 'pickup', items: [{ product_id: plato, quantity: 1, options: ['caviar'] }] }
    });
    expect(mal.status).toBe(400);
    expect(mal.body.error).toMatch(/no está disponible/);
  });

  it('exige el mínimo de opciones de un grupo obligatorio', async () => {
    const veg = await idProducto('Opción vegetal');
    const r = await llamar(orders, {
      action: 'checkout',
      body: { client_name: 'Ana', client_phone: '+34 600000001', delivery_method: 'pickup', items: [{ product_id: veg, quantity: 1 }] }
    });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/Elige al menos/);
  });

  it('aplica pedido mínimo, gastos de envío y envío gratis desde el umbral', async () => {
    const plato = await idProducto('Plato de la casa');
    const base = { client_name: 'Ana', client_phone: '+34 600000001', delivery_method: 'delivery', delivery_address: 'Calle Falsa 1, 28001' };
    const pocoImporte = await llamar(orders, { action: 'checkout', body: { ...base, items: [{ product_id: await idProducto('Agua mineral'), quantity: 1 }] } });
    expect(pocoImporte.status).toBe(400);
    const conGastos = await llamar(orders, { action: 'checkout', body: { ...base, items: [{ product_id: plato, quantity: 2 }] } });
    expect(conGastos.body.order.delivery_fee).toBe(2.5);
    expect(conGastos.body.order.total).toBe(24.3);
    const gratis = await llamar(orders, { action: 'checkout', body: { ...base, items: [{ product_id: plato, quantity: 3 }] } });
    expect(gratis.body.order.delivery_fee).toBe(0);
  });

  it('un cliente no puede hacerse pasar por el kiosko', async () => {
    const plato = await idProducto('Plato de la casa');
    const r = await llamar(orders, {
      action: 'checkout',
      body: { source: 'kiosk', client_name: 'Mesa 1', client_phone: '000000000', delivery_method: 'local', payment_method: 'tpv', items: [{ product_id: plato, quantity: 1 }] }
    });
    expect(r.status).toBe(400);
  });

  it('la misma clave de idempotencia nunca crea dos pedidos', async () => {
    const plato = await idProducto('Plato de la casa');
    const body = { client_name: 'Ana', client_phone: '+34 600000001', delivery_method: 'pickup', idempotency_key: randomUUID(), items: [{ product_id: plato, quantity: 1 }] };
    const a = await llamar(orders, { action: 'checkout', body });
    const b = await llamar(orders, { action: 'checkout', body });
    expect(a.body.orderId).toBe(b.body.orderId);
  });

  it('rechaza pedidos con el local cerrado salvo que sean programados', async () => {
    await owner.query('UPDATE store_settings SET is_store_open = false');
    const plato = await idProducto('Plato de la casa');
    const r = await llamar(orders, { action: 'checkout', body: { client_name: 'Ana', client_phone: '+34 600000001', delivery_method: 'pickup', items: [{ product_id: plato, quantity: 1 }] } });
    expect(r.status).toBe(400);
    await owner.query('UPDATE store_settings SET is_store_open = true');
  });
});

describe('Puntos de fidelización', () => {
  it('se ganan al entregar, se retiran al cancelar y el canje exige correo verificado', async () => {
    const c = await registrar('puntos');
    const plato = await idProducto('Plato de la casa');
    const pedido = await llamar(orders, {
      action: 'checkout', token: c.token,
      body: { client_name: 'Cliente', client_phone: c.phone, delivery_method: 'pickup', items: [{ product_id: plato, quantity: 3 }] }
    });
    expect(pedido.status).toBe(200);
    const id = pedido.body.orderId;

    const entregar = await llamar(admin, { method: 'PATCH', action: 'orders', token: adminToken, body: { id, status: 'delivered' } });
    expect(entregar.status).toBe(200);
    let pts = (await owner.query('SELECT points FROM profiles WHERE id = $1', [c.id])).rows[0].points;
    expect(pts).toBe(12); // floor(32,70 / 10) × 4

    const canje = await llamar(orders, {
      action: 'checkout', token: c.token,
      body: { client_name: 'Cliente', client_phone: c.phone, delivery_method: 'pickup', points_redeemed: true, items: [{ product_id: plato, quantity: 1 }] }
    });
    expect(canje.status).toBe(400);
    expect(canje.body.error).toMatch(/verificar tu correo/);

    await llamar(admin, { method: 'PATCH', action: 'orders', token: adminToken, body: { id, status: 'cancelled' } });
    pts = (await owner.query('SELECT points FROM profiles WHERE id = $1', [c.id])).rows[0].points;
    expect(pts).toBe(0);
  });
});

describe('Canje de puntos', () => {
  it('descuenta los puntos y aplica como descuento la unidad más barata', async () => {
    const c = await registrar('canje');
    await owner.query('UPDATE profiles SET is_email_verified = true, points = 30 WHERE id = $1', [c.id]);
    const r = await llamar(orders, {
      action: 'checkout', token: c.token,
      body: {
        client_name: 'Cliente', client_phone: c.phone, delivery_method: 'pickup', points_redeemed: true,
        items: [{ product_id: await idProducto('Plato de la casa'), quantity: 1 }, { product_id: await idProducto('Agua mineral'), quantity: 2 }]
      }
    });
    expect(r.status).toBe(200);
    expect(r.body.order.discount).toBe(1.5);
    expect(r.body.order.total).toBe(12.4); // 10,90 + 2 × 1,50 − 1,50
    const pts = (await owner.query('SELECT points FROM profiles WHERE id = $1', [c.id])).rows[0].points;
    expect(pts).toBe(5);
  });
});

describe('Permisos', () => {
  it('el panel exige admin: 401 sin sesión y 403 con un cliente', async () => {
    const c = await registrar('permisos');
    expect((await llamar(admin, { method: 'GET', action: 'orders' })).status).toBe(401);
    expect((await llamar(admin, { method: 'GET', action: 'orders', token: c.token })).status).toBe(403);
    expect((await llamar(admin, { method: 'GET', action: 'orders', token: adminToken })).status).toBe(200);
  });

  it('un cliente no puede darse puntos ni rol de admin editando su perfil', async () => {
    const c = await registrar('escalada');
    const r = await llamar(account, { method: 'PUT', action: 'profile', token: c.token, body: { full_name: 'Nuevo Nombre', is_admin: true, points: 9999 } });
    expect(r.status).toBe(200);
    expect(r.body.profile.is_admin).toBe(false);
    expect(r.body.profile.points).toBe(0);
  });

  it('los endpoints peligrosos de la versión anterior ya no existen', async () => {
    expect((await llamar(orders, { action: 'cleanup-simulated' })).status).toBe(404);
    expect((await llamar(orders, { action: 'migrate-schema', body: { master_key: 'DKITCHEN_MASTER_SECURE_2026' } })).status).toBe(404);
    expect((await llamar(account, { action: 'verify-2fa', body: { email: adminEmail, code: '202600' } })).status).toBe(404);
  });

  it('el seguimiento por id no expone datos personales', async () => {
    const plato = await idProducto('Plato de la casa');
    const p = await llamar(orders, { action: 'checkout', body: { client_name: 'Ana Secreta', client_phone: '+34 600000009', delivery_method: 'pickup', items: [{ product_id: plato, quantity: 1 }] } });
    const s = await llamar(orders, { method: 'GET', action: 'order-status', query: { id: p.body.orderId } });
    expect(s.status).toBe(200);
    expect(JSON.stringify(s.body)).not.toMatch(/Ana Secreta|600000009/);
    expect((await llamar(orders, { method: 'GET', action: 'order-status', query: { id: randomUUID() } })).status).toBe(404);
  });
});
