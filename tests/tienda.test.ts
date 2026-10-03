// Tienda (zonas, existencias, alcohol, regalos) y pruebas de seguridad de la API,
// contra un Postgres real con la marca «alacena-expres» (dark store).
// Variables: TIENDA_DATABASE_URL (dueño) y TIENDA_API_DATABASE_URL (rol motor_api).
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrar } from '../scripts/db-migrar.js';
import { sembrar } from '../scripts/db-semilla.js';
import { crearAdmin } from '../scripts/crear-admin.js';
import type { Req, Res } from '../api/_lib/http.js';

const OWNER_URL = process.env.TIENDA_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/motor_tienda';
const API_URL = process.env.TIENDA_API_DATABASE_URL || 'postgres://motor_api:motor_api_local@localhost:5432/motor_tienda';
const SECRETO = 't'.repeat(48);

type Handler = (req: Req, res: Res) => Promise<void>;
let orders: Handler, admin: Handler, catalog: Handler, account: Handler;
let owner: pg.Client;
let adminToken = '';

async function llamar(h: Handler, o: { method?: string; action?: string; query?: Record<string, string>; body?: unknown; token?: string }) {
  let status = 0;
  let body: any = null;
  const res: Res = { status(c) { status = c; return res; }, json(b) { body = b; }, setHeader() {} };
  const req: Req = {
    method: o.method ?? 'POST',
    query: { ...(o.action ? { action: o.action } : {}), ...(o.query ?? {}) },
    body: o.body,
    headers: { 'x-real-ip': `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, ...(o.token ? { authorization: `Bearer ${o.token}` } : {}) }
  };
  await h(req, res);
  return { status, body };
}

const producto = async (nombre: string) =>
  (await owner.query('SELECT id, price::float AS price, stock FROM products WHERE name = $1', [nombre])).rows[0] as { id: number; price: number; stock: number | null };

function pedido(items: unknown[], extra: Record<string, unknown> = {}) {
  return {
    client_name: 'Cliente Tienda', client_phone: '+34 600 111 222', delivery_method: 'delivery',
    delivery_address: { text: 'Calle Mayor 1, 2ºA', postal_code: '28013' },
    items, idempotency_key: randomUUID(), ...extra
  };
}
const checkout = (body: unknown) => llamar(orders, { action: 'checkout', body });

beforeAll(async () => {
  owner = new pg.Client({ connectionString: OWNER_URL });
  await owner.connect();
  await owner.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrar(OWNER_URL, () => undefined);
  await sembrar(OWNER_URL, 'alacena-expres');
  await owner.query("UPDATE store_hours SET is_open = true, open_time = '00:00', close_time = '23:59'");
  // Franja de alcohol abierta todo el día salvo en la prueba que la cierra.
  await owner.query("UPDATE store_settings SET alcohol_sale_start = NULL, alcohol_sale_end = NULL");
  const pass = await crearAdmin(OWNER_URL, 'admin@tienda.example', 'Admin Tienda');

  process.env.APP_DATABASE_URL = API_URL;
  process.env.APP_JWT_SECRET = SECRETO;
  ({ default: account } = await import('../api/account.js'));
  ({ default: orders } = await import('../api/orders.js'));
  ({ default: admin } = await import('../api/admin.js'));
  ({ default: catalog } = await import('../api/catalog.js'));
  const login = await llamar(account, { action: 'login', body: { email: 'admin@tienda.example', password: pass } });
  expect(login.status).toBe(200);
  adminToken = login.body.token;
}, 60_000);

afterAll(async () => {
  const { cerrarPool } = await import('../api/_lib/db.js');
  await cerrarPool();
  await owner.end();
});

describe('Catálogo de la dark store', () => {
  it('publica zonas, formatos, alcohol y existencias', async () => {
    const r = await llamar(catalog, { method: 'GET' });
    expect(r.status).toBe(200);
    expect(r.body.zones).toHaveLength(4);
    expect(r.body.products.length).toBeGreaterThanOrEqual(80);
    const jamon = r.body.products.find((p: any) => p.name === 'Jamón ibérico de bellota 100 %');
    expect(jamon).toMatchObject({ unit_label: 'Sobre 100 g', is_alcohol: false, stock: 40 });
    expect(r.body.products.find((p: any) => p.name === 'Rioja Crianza DOCa').is_alcohol).toBe(true);
    expect(r.body.products.every((p: any) => p.image_url?.startsWith('/marca/productos/'))).toBe(true);
  });
});

describe('Zonas de reparto', () => {
  it('aplica el precio, el envío y el tiempo de la zona del código postal', async () => {
    const queso = await producto('Queso manchego curado DOP'); // 7,90
    // Salamanca (+5 %): 7,90 × 1,05 = 8,295 → 8,30 por unidad; 4 uds = 33,20; envío 3,50.
    const r = await checkout(pedido([{ product_id: queso.id, quantity: 4 }], { delivery_address: { text: 'Serrano 10', postal_code: '28001' } }));
    expect(r.status).toBe(200);
    expect(Number(r.body.order.order_items[0].unit_price)).toBe(8.3);
    expect(Number(r.body.order.subtotal)).toBe(33.2);
    expect(Number(r.body.order.delivery_fee)).toBe(3.5);
    expect(Number(r.body.order.total)).toBe(36.7);
    expect(r.body.order.zone_id).not.toBeNull();
    expect(r.body.order.estimated_ready_at).not.toBeNull();
  });

  it('el centro usa el precio base y el envío es gratis desde el umbral de la zona', async () => {
    const reserva = await producto('Ribera del Duero Reserva'); // 24,90 × 3 = 74,70 ≥ 60
    const r = await checkout(pedido([{ product_id: reserva.id, quantity: 3 }], { age_confirmed: true }));
    expect(r.status).toBe(200);
    expect(Number(r.body.order.subtotal)).toBe(74.7);
    expect(Number(r.body.order.delivery_fee)).toBe(0);
  });

  it('rechaza códigos postales fuera de zona y pedidos bajo el mínimo de la zona', async () => {
    const cola = await producto('Refresco de cola');
    const fuera = await checkout(pedido([{ product_id: cola.id, quantity: 20 }], { delivery_address: { text: 'Gran Vía 1, Bilbao', postal_code: '48001' } }));
    expect(fuera.status).toBe(400);
    expect(fuera.body.error).toMatch(/fuera de nuestra zona/);
    const poco = await checkout(pedido([{ product_id: cola.id, quantity: 2 }], { delivery_address: { text: 'Pozuelo', postal_code: '28223' } }));
    expect(poco.status).toBe(400);
    expect(poco.body.error).toMatch(/mínimo.*Pozuelo/);
  });

  it('la zona la decide el servidor: ignora zona y ajuste enviados por el navegador', async () => {
    const queso = await producto('Queso manchego curado DOP');
    const r = await checkout(pedido([{ product_id: queso.id, quantity: 6, price: 0.01, unit_price: 0.01 }],
      { zone_id: 1, price_adjust_pct: -50, delivery_address: { text: 'Pozuelo', postal_code: '28223', zone: 'Centro' } }));
    // El zod de la API descarta los campos desconocidos y SQL tampoco los leería.
    expect(r.status).toBe(200);
    expect(Number(r.body.order.order_items[0].unit_price)).toBe(8.53); // 7,90 × 1,08 (Pozuelo)
    expect(Number(r.body.order.delivery_fee)).toBe(6.9);
  });
});

describe('Alcohol', () => {
  it('exige declarar la mayoría de edad', async () => {
    const vino = await producto('Rioja Crianza DOCa');
    const sin = await checkout(pedido([{ product_id: vino.id, quantity: 2 }]));
    expect(sin.status).toBe(400);
    expect(sin.body.error).toMatch(/18 años/);
    const con = await checkout(pedido([{ product_id: vino.id, quantity: 2 }], { age_confirmed: true }));
    expect(con.status).toBe(200);
    expect(con.body.order.age_confirmed).toBe(true);
  });

  it('no vende alcohol fuera de la franja legal, pero sí el resto', async () => {
    await owner.query(`UPDATE store_settings SET
      alcohol_sale_start = to_char((now() AT TIME ZONE 'Europe/Madrid') + interval '12 hours', 'HH24:MI'),
      alcohol_sale_end   = to_char((now() AT TIME ZONE 'Europe/Madrid') + interval '12 hours 1 minute', 'HH24:MI')`);
    try {
      const vino = await producto('Rioja Crianza DOCa');
      const r = await checkout(pedido([{ product_id: vino.id, quantity: 2 }], { age_confirmed: true }));
      expect(r.status).toBe(400);
      expect(r.body.error).toMatch(/normativa/);
      const tortilla = await producto('Tortilla de patata jugosa');
      const ok = await checkout(pedido([{ product_id: tortilla.id, quantity: 2 }]));
      expect(ok.status).toBe(200);
    } finally {
      await owner.query('UPDATE store_settings SET alcohol_sale_start = NULL, alcohol_sale_end = NULL');
    }
  });
});

describe('Existencias', () => {
  it('no deja comprar más de lo que hay, descuenta y devuelve al cancelar', async () => {
    const cesta = await producto('Cesta premium ibérica'); // stock 4
    const mucho = await checkout(pedido([{ product_id: cesta.id, quantity: 5 }], { age_confirmed: true }));
    expect(mucho.status).toBe(400);
    expect(mucho.body.error).toMatch(/Solo quedan 4/);
    const ok = await checkout(pedido([{ product_id: cesta.id, quantity: 3 }], { age_confirmed: true }));
    expect(ok.status).toBe(200);
    expect((await producto('Cesta premium ibérica')).stock).toBe(1);
    const cancel = await llamar(admin, { method: 'PATCH', action: 'orders', token: adminToken, body: { id: ok.body.orderId, status: 'cancelled' } });
    expect(cancel.status).toBe(200);
    expect((await producto('Cesta premium ibérica')).stock).toBe(4);
  });

  it('bajo concurrencia nunca vende de más (30 pedidos simultáneos, 10 unidades)', async () => {
    const tarta = await producto('Tarta de queso cremosa');
    await owner.query('UPDATE products SET stock = 10 WHERE id = $1', [tarta.id]);
    const resultados = await Promise.all(
      Array.from({ length: 30 }, () => checkout(pedido([{ product_id: tarta.id, quantity: 1 }])))
    );
    const ok = resultados.filter((r) => r.status === 200).length;
    expect(ok).toBe(10);
    expect(resultados.filter((r) => r.status === 400).every((r) => /agotado|Solo quedan/.test(r.body.error))).toBe(true);
    expect((await producto('Tarta de queso cremosa')).stock).toBe(0);
    const catalogo = await llamar(catalog, { method: 'GET' });
    expect(catalogo.body.products.find((p: any) => p.id === tarta.id).stock).toBe(0);
  }, 60_000);
});

describe('Regalos', () => {
  it('guarda el mensaje de regalo y rechaza mensajes demasiado largos', async () => {
    const trufas = await producto('Trufas de chocolate');
    const xss = '<img src=x onerror=alert(1)> ¡Feliz cumpleaños!';
    const ok = await checkout(pedido([{ product_id: trufas.id, quantity: 4, options: ['envoltorio'] }], { gift_message: xss }));
    expect(ok.status).toBe(200);
    expect(ok.body.order.gift_message).toBe(xss); // se guarda literal; React lo escapa al pintar
    expect(Number(ok.body.order.order_items[0].unit_price)).toBe(11.4); // 7,90 + 3,50 de envoltorio
    const largo = await checkout(pedido([{ product_id: trufas.id, quantity: 4 }], { gift_message: 'a'.repeat(251) }));
    expect(largo.status).toBe(400);
  });
});

describe('Seguridad', () => {
  it('el precio lo pone siempre el servidor', async () => {
    const jamon = await producto('Jamón ibérico de bellota 100 %');
    const r = await checkout(pedido([{ product_id: jamon.id, quantity: 2, price: 0.01 }], { total: 0.02, subtotal: 0.02 }));
    expect(r.status).toBe(200);
    expect(Number(r.body.order.subtotal)).toBe(29.8);
  });

  it('las inyecciones SQL se guardan como texto y no alteran nada', async () => {
    const cola = await producto('Refresco de cola');
    const antes = (await owner.query('SELECT count(*)::int AS n FROM products')).rows[0].n;
    const r = await checkout(pedido([{ product_id: cola.id, quantity: 13 }], {
      client_name: "Robert'); DROP TABLE products;--", notes: "' OR 1=1 --"
    }));
    expect(r.status).toBe(200);
    expect(r.body.order.client_name).toBe("Robert'); DROP TABLE products;--");
    expect((await owner.query('SELECT count(*)::int AS n FROM products')).rows[0].n).toBe(antes);
  });

  it('rechaza cantidades, líneas e identificadores fuera de rango', async () => {
    const cola = await producto('Refresco de cola');
    expect((await checkout(pedido([{ product_id: cola.id, quantity: 51 }]))).status).toBe(400);
    expect((await checkout(pedido([{ product_id: cola.id, quantity: -1 }]))).status).toBe(400);
    expect((await checkout(pedido(Array.from({ length: 31 }, () => ({ product_id: cola.id, quantity: 1 }))))).status).toBe(400);
    expect((await checkout(pedido([{ product_id: 999999, quantity: 1 }]))).status).toBe(400);
    expect((await checkout(pedido([{ product_id: '1; DROP TABLE orders', quantity: 1 }]))).status).toBe(400);
  });

  it('el panel exige un token válido de administrador', async () => {
    const sin = await llamar(admin, { method: 'GET', action: 'zones' });
    expect(sin.status).toBe(401);
    const falso = jwt.sign({ sub: randomUUID(), adm: true, tv: 0 }, 'otro-secreto-'.repeat(4), { algorithm: 'HS256', expiresIn: '1h' });
    expect((await llamar(admin, { method: 'GET', action: 'zones', token: falso })).status).toBe(401);
    const none = jwt.sign({ sub: randomUUID(), adm: true }, '', { algorithm: 'none' as never });
    expect((await llamar(admin, { method: 'GET', action: 'zones', token: none })).status).toBe(401);
    const reg = await llamar(account, { action: 'register', body: { full_name: 'Cliente Curioso', phone: '+34 611 222 333', email: 'curioso@tienda.example', password: 'contrasena-segura-1' } });
    const cliente = await llamar(admin, { method: 'POST', action: 'zones', token: reg.body.token, body: { name: 'Pirata', postal_codes: ['28013'], delivery_fee: 0, min_order: 0, eta_minutes: 5, price_adjust_pct: -50 } });
    expect(cliente.status).toBe(403);
  });

  it('valida las zonas: un código postal no puede estar en dos zonas activas', async () => {
    const dup = await llamar(admin, { method: 'POST', action: 'zones', token: adminToken, body: { name: 'Duplicada', postal_codes: ['28013'], delivery_fee: 1, min_order: 0, eta_minutes: 30, price_adjust_pct: 0 } });
    expect(dup.status).toBe(400);
    expect(dup.body.error).toMatch(/28013/);
    const mal = await llamar(admin, { method: 'POST', action: 'zones', token: adminToken, body: { name: 'Mal', postal_codes: ['ABCDE'], delivery_fee: 1, min_order: 0, eta_minutes: 30, price_adjust_pct: 0 } });
    expect(mal.status).toBe(400);
    const ok = await llamar(admin, { method: 'POST', action: 'zones', token: adminToken, body: { name: 'Alcobendas', postal_codes: ['28100'], delivery_fee: 5.9, min_order: 35, free_delivery_over: 100, eta_minutes: 50, price_adjust_pct: 3 } });
    expect(ok.status).toBe(200);
  });

  it('las imágenes de producto solo admiten https o rutas de la marca', async () => {
    const cola = await producto('Refresco de cola');
    for (const url of ['javascript:alert(1)', 'http://inseguro.example/a.png', '/marca/../../etc/passwd', 'data:text/html,<script>']) {
      const r = await llamar(admin, { method: 'PUT', action: 'catalog', token: adminToken, body: { type: 'product', id: cola.id, image_url: url } });
      expect(r.status, url).toBe(400);
    }
    const ok = await llamar(admin, { method: 'PUT', action: 'catalog', token: adminToken, body: { type: 'product', id: cola.id, image_url: '/marca/productos/refresco-de-cola.webp', stock: 100, unit_label: 'Lata 33 cl' } });
    expect(ok.status).toBe(200);
    expect(ok.body.row.stock).toBe(100);
  });

  it('el rol de la API no puede saltarse RLS ni tocar el catálogo sin ser admin', async () => {
    const api = new pg.Client({ connectionString: API_URL });
    await api.connect();
    try {
      expect((await api.query('SELECT count(*)::int AS n FROM profiles')).rows[0].n).toBe(0);
      expect((await api.query('SELECT count(*)::int AS n FROM orders')).rows[0].n).toBe(0);
      const upd = await api.query("UPDATE products SET price = 0.01 WHERE name = 'Refresco de cola'");
      expect(upd.rowCount).toBe(0);
      await expect(api.query("INSERT INTO delivery_zones (name, postal_codes) VALUES ('x', ARRAY['28999'])")).rejects.toThrow();
      await expect(api.query('ALTER TABLE products DISABLE ROW LEVEL SECURITY')).rejects.toThrow();
    } finally {
      await api.end();
    }
  });

  it('el seguimiento de pedidos no revela nada de pedidos ajenos', async () => {
    const r = await llamar(orders, { method: 'GET', action: 'order-status', query: { id: randomUUID() } });
    expect(r.status).toBe(404);
    const malo = await llamar(orders, { method: 'GET', action: 'order-status', query: { id: "' OR 1=1 --" } });
    expect(malo.status).toBe(400);
  });
});
