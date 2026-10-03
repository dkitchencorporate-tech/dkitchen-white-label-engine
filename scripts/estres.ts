// Prueba de estrés de la API por HTTP (servidor local `npm run dev:api` o un
// despliegue de pruebas). Nunca contra producción: crea pedidos reales.
//
//   ESTRES_URL=http://localhost:3001 ESTRES_DATABASE_URL=<dueño> npx tsx scripts/estres.ts
//
// Escenarios: lectura de la carta, pedidos simultáneos de muchos clientes,
// carrera por las últimas unidades, límite de peticiones por IP. Al final
// comprueba invariantes en la base de datos (sin existencias negativas y
// totales cuadrados) e imprime una tabla en Markdown.
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const BASE = process.env.ESTRES_URL || 'http://localhost:3001';
const DB = process.env.ESTRES_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/motor_dev';
const SEG = Number(process.env.ESTRES_SEGUNDOS || 15);

interface Resultado { nombre: string; peticiones: number; rps: number; p50: number; p95: number; p99: number; max: number; codigos: Record<string, number> }

const ipAleatoria = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
const percentil = (v: number[], p: number) => v.length ? v[Math.min(v.length - 1, Math.floor((p / 100) * v.length))] : 0;

async function carga(nombre: string, concurrencia: number, segundos: number, peticion: () => Promise<Response>): Promise<Resultado> {
  const tiempos: number[] = [];
  const codigos: Record<string, number> = {};
  const fin = Date.now() + segundos * 1000;
  const inicio = Date.now();
  await Promise.all(Array.from({ length: concurrencia }, async () => {
    while (Date.now() < fin) {
      const t = performance.now();
      try {
        const r = await peticion();
        await r.arrayBuffer();
        codigos[r.status] = (codigos[r.status] ?? 0) + 1;
      } catch {
        codigos.error = (codigos.error ?? 0) + 1;
      }
      tiempos.push(performance.now() - t);
    }
  }));
  tiempos.sort((a, b) => a - b);
  const dur = (Date.now() - inicio) / 1000;
  return {
    nombre, peticiones: tiempos.length, rps: Math.round(tiempos.length / dur),
    p50: Math.round(percentil(tiempos, 50)), p95: Math.round(percentil(tiempos, 95)),
    p99: Math.round(percentil(tiempos, 99)), max: Math.round(tiempos.at(-1) ?? 0), codigos
  };
}

const postCheckout = (body: unknown, ip = ipAleatoria()) =>
  fetch(`${BASE}/api/checkout`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-real-ip': ip }, body: JSON.stringify(body) });

async function main(): Promise<void> {
  const db = new pg.Client({ connectionString: DB });
  await db.connect();
  const productos = (await db.query(
    `SELECT id FROM products WHERE is_available AND NOT is_alcohol AND (stock IS NULL OR stock > 1000) AND customization_schema->'groups' IS NULL LIMIT 20`
  )).rows.map((r) => r.id as number);
  const zonas = (await db.query('SELECT postal_codes[1] AS cp FROM delivery_zones WHERE is_active')).rows.map((r) => r.cp as string);
  if (!productos.length || !zonas.length) throw new Error('Hace falta una base con la semilla de una dark store (zonas y productos).');
  // Existencias abundantes para la carga general; una unidad limitada para la carrera.
  await db.query('UPDATE products SET stock = NULL WHERE id = ANY($1)', [productos]);
  const objetivo = (await db.query("SELECT id FROM products WHERE name = 'Tortilla de patata jugosa'")).rows[0]?.id as number;
  await db.query('UPDATE products SET stock = 50 WHERE id = $1', [objetivo]);
  const pedidosAntes = (await db.query('SELECT count(*)::int AS n FROM orders')).rows[0].n as number;

  const pedido = (items: { product_id: number; quantity: number }[]) => ({
    client_name: 'Estrés', client_phone: '+34 600 000 000', delivery_method: 'delivery',
    delivery_address: { text: 'Calle de prueba 1', postal_code: zonas[Math.floor(Math.random() * zonas.length)] },
    items, idempotency_key: randomUUID()
  });
  const lineas = () => Array.from({ length: 1 + Math.floor(Math.random() * 4) }, () => ({
    product_id: productos[Math.floor(Math.random() * productos.length)], quantity: 8 + Math.floor(Math.random() * 5)
  }));

  const resultados: Resultado[] = [];
  console.log(`Carta: 50 clientes simultáneos durante ${SEG} s…`);
  resultados.push(await carga('GET /api/catalog · 50 concurrentes', 50, SEG, () => fetch(`${BASE}/api/catalog`, { headers: { 'x-real-ip': ipAleatoria() } })));
  console.log(`Pedidos: 25 clientes simultáneos durante ${SEG} s…`);
  resultados.push(await carga('POST /api/checkout · 25 concurrentes', 25, SEG, () => postCheckout(pedido(lineas()))));

  console.log('Carrera: 200 pedidos a la vez por 50 unidades…');
  const t = performance.now();
  const carrera = await Promise.all(Array.from({ length: 200 }, () => postCheckout(pedido([{ product_id: objetivo, quantity: 1 }, { product_id: productos[0], quantity: 30 }])).then(async (r) => ({ s: r.status, b: await r.json() }))));
  const vendidos = carrera.filter((r) => r.s === 200).length;
  const msCarrera = Math.round(performance.now() - t);

  console.log('Límite por IP: 15 pedidos seguidos desde la misma IP…');
  const ip = ipAleatoria();
  const limite: number[] = [];
  for (let i = 0; i < 15; i++) limite.push((await postCheckout(pedido(lineas()), ip)).status);

  // Invariantes
  const negativos = (await db.query('SELECT count(*)::int AS n FROM products WHERE stock < 0')).rows[0].n as number;
  const stockObjetivo = (await db.query('SELECT stock FROM products WHERE id = $1', [objetivo])).rows[0].stock as number;
  const descuadres = (await db.query(
    `SELECT count(*)::int AS n FROM orders o
     WHERE o.total <> GREATEST(0, o.subtotal - o.discount) + o.delivery_fee
        OR o.subtotal <> (SELECT COALESCE(sum(i.unit_price * i.quantity), 0) FROM order_items i WHERE i.order_id = o.id)`
  )).rows[0].n as number;
  const nuevos = (await db.query('SELECT count(*)::int AS n FROM orders')).rows[0].n as number - pedidosAntes;
  await db.end();

  const fila = (r: Resultado) => `| ${r.nombre} | ${r.peticiones} | ${r.rps} | ${r.p50} | ${r.p95} | ${r.p99} | ${r.max} | ${Object.entries(r.codigos).map(([k, v]) => `${k}: ${v}`).join(', ')} |`;
  console.log(`
| Escenario | Peticiones | Por segundo | p50 (ms) | p95 (ms) | p99 (ms) | Máx. (ms) | Respuestas |
|---|---|---|---|---|---|---|---|
${resultados.map(fila).join('\n')}

- Carrera por las últimas unidades: 200 pedidos simultáneos, 50 unidades → **${vendidos} vendidos**, existencias finales ${stockObjetivo} (${msCarrera} ms).
- Límite por IP (10 pedidos/min): respuestas ${limite.join(' ')}.
- Pedidos creados: ${nuevos}. Existencias negativas: **${negativos}**. Pedidos con totales descuadrados: **${descuadres}**.
`);
  const ok = vendidos === 50 && stockObjetivo === 0 && negativos === 0 && descuadres === 0 && limite.slice(10).every((s) => s === 429);
  console.log(ok ? '✓ Invariantes correctos.' : '✗ Algún invariante ha fallado.');
  process.exitCode = ok ? 0 : 1;
}

main().catch((e: unknown) => { console.error(e); process.exit(1); });
