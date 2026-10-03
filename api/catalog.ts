import { conTx } from './_lib/db.js';
import { obtenerAuth } from './_lib/auth.js';
import { crearManejador, param } from './_lib/http.js';

/** Una conexión de pg no admite consultas simultáneas: se ejecutan en orden. */
async function secuencial<T>(qs: (() => Promise<T>)[]): Promise<T[]> {
  const out: T[] = [];
  for (const q of qs) out.push(await q());
  return out;
}

// Catálogo público. RLS oculta los productos no disponibles salvo al admin,
// que además los recibe con ?all=1 (para el panel).
export default crearManejador(
  {
    leer: {
      GET: async ({ req, res }) => {
        const auth = await obtenerAuth(req);
        const todo = param(req, 'all') === '1' && auth?.isAdmin === true;
        const datos = await conTx(async (db) => {
          const [categories, subcategories, products, settings, hours, upsells] = await secuencial([
            () => db.query('SELECT * FROM categories WHERE is_active OR $1 ORDER BY sort_order, name', [todo]),
            () => db.query('SELECT * FROM subcategories WHERE is_active OR $1 ORDER BY sort_order, name', [todo]),
            () => db.query(
              `SELECT id, category_id, subcategory_id, name, description, price, image_url, is_available, is_upsell,
                      COALESCE(badge, customization_schema->>'badge') AS badge, allergens, customization_schema, sort_order
               FROM products WHERE is_available OR $1 ORDER BY sort_order, name`,
              [todo]
            ),
            () => db.query('SELECT * FROM store_settings WHERE id = 1'),
            () => db.query('SELECT * FROM store_hours ORDER BY day_of_week'),
            () => db.query(
              `SELECT u.id, u.category, u.sort_order, u.product_id,
                      json_build_object('id', p.id, 'name', p.name, 'price', p.price, 'description', p.description,
                                        'image_url', p.image_url, 'is_available', p.is_available) AS products
               FROM upsells u JOIN products p ON p.id = u.product_id
               WHERE p.is_available ORDER BY u.sort_order`
            )
          ]);
          return {
            categories: categories.rows,
            subcategories: subcategories.rows,
            products: products.rows,
            settings: settings.rows[0] ?? null,
            hours: hours.rows,
            upsells: upsells.rows
          };
        }, auth?.userId ?? null);
        res.setHeader('Cache-Control', todo ? 'no-store' : 'public, max-age=0, s-maxage=10, stale-while-revalidate=30');
        return datos;
      }
    }
  },
  'leer'
);
