# 04 · Carta, zonas y negocio (`semilla.sql`)

La semilla es **SQL idempotente**: se puede ejecutar varias veces sin duplicar nada (inserta solo lo que no existe por nombre). **No contiene usuarios.**

Para cartas grandes, no se escribe a mano: se genera con un script de datos, como `brands/alacena-expres/herramientas/catalogo.py` + `cabecera.sql`:
```bash
cd brands/<slug>/herramientas && python3 catalogo.py . && mv semilla.sql ../semilla.sql
```

## 1. Ajustes de la tienda (`UPDATE store_settings`)

| Campo | Qué es | Alacena |
|---|---|---|
| `business_*` | Datos del negocio que se ven en la web y el ticket | Alacena Exprés S.L., Madrid |
| `delivery_enabled`, `pickup_enabled` | Reparto y recogida | true, false |
| `delivery_fee`, `min_order_delivery`, `free_delivery_threshold` | Tarifa general (solo si **no** hay zonas) | 3,50 · 20 · 60 |
| `prep_minutes`, `estimated_prep_time` | Antelación mínima de un pedido programado y texto orientativo | 10 · «30-45 min» |
| `loyalty_enabled`, `loyalty_points_per_10`, `loyalty_reward_points` | Club: puntos por cada 10 € y meta de canje. **Todos los textos de la web usan estos números** | true · 3 · 40 |
| `alcohol_sale_start`, `alcohol_sale_end` | Franja legal de venta de alcohol (hora local) o NULL | 08:00–22:00 |
| `alcohol_min_age` | Edad mínima | 18 |

## 2. Horario (`store_hours`)

Siete filas (0 = domingo … 6 = sábado), `HH:MM`. Un turno que cruza la medianoche se escribe tal cual (`10:00`–`01:30`).

## 3. Zonas de reparto (`delivery_zones`, módulo `zonas`)

Cada zona tiene: nombre, **códigos postales**, envío, pedido mínimo, envío gratis desde, tiempo de entrega y **ajuste de precio** (−50 % … +100 %).
- Un código postal solo puede estar en **una** zona activa (lo impide la base de datos).
- El precio de zona se aplica **solo a domicilio**, por unidad, redondeado a céntimos (mismo cálculo en SQL y en el navegador).
- Si no hay zonas, se usan la tarifa general y `postal_codes_allowed`.
- Se editan después desde **Panel → Horarios → Zonas de reparto**.

## 4. Categorías

- **«Combos» siempre la primera**: packs, tablas, menús, cestas y estuches (todo lo que agrupa varios productos).
- Después, **productos sueltos** por familia.
- `subtitle` corto (una línea).

## 5. Productos: columnas y reglas

| Columna | Regla |
|---|---|
| `name` | Único. Sin marcas comerciales de terceros salvo que el cliente las venda con autorización |
| `description` | 1–2 frases: qué es, cómo se sirve. En combos: **lista de lo que incluye** |
| `price` | IVA incluido, en euros, con céntimos |
| `unit_label` | Formato de venta: «Sobre 100 g», «Botella 75 cl», «6 latas de 33 cl», «2–3 personas» |
| `badge` | Una insignia corta: «Más vendido», «DOP», «Para fiestas»… |
| `allergens` | De los 14 del Reglamento (UE) 1169/2011: `gluten, crustaceos, huevos, pescado, cacahuetes, soja, lacteos, frutos_cascara, apio, mostaza, sesamo, sulfitos, altramuces, moluscos`. **Revisar con la ficha técnica del proveedor** |
| `is_alcohol` | `true` en todo lo que lleva alcohol (vino, cava, cerveza, licores y los combos que los incluyen). La cerveza 0,0 es `false` |
| `stock` | NULL = sin control; número = unidades. A 0 se muestra «Agotado»; ≤ 5 muestra «¡Últimas N!» |
| `image_url` | `/marca/productos/<slug-del-producto>.webp` (guía 05) |
| `customization_schema` | Grupos de opciones con precio (ver §6) |
| `sort_order` | Orden dentro de la categoría |

## 6. Opciones con precio (`customization_schema`)

```json
{"groups":[{"id":"regalo","name":"Presentación","min":0,"max":1,
  "options":[{"id":"envoltorio","name":"Envoltorio de regalo con lazo","price":3.5}]}]}
```
- `id` en minúsculas con guiones. `min` y `max` por grupo. El servidor valida todo y pone el precio.
- Ideas usadas en Alacena: envoltorio de regalo, «bien frío» (0 €), hielo, vasos y servilletas en los packs, velas y tarjeta en tartas.

## 7. Sugerencias de última hora (`upsells`)

Seis productos baratos que completan el pedido (hielo, patatas, tónica, refresco, picos, envoltorio). Solo aparecen si están disponibles y con existencias.

## 8. Comprobación

```bash
psql <base local> -v ON_ERROR_STOP=1 -f brands/<slug>/semilla.sql
psql <base local> -c "select c.name, count(*), min(p.price) from products p join categories c on c.id=p.category_id group by 1 order by 1"
```
- Ninguna categoría vacía.
- Precios coherentes.
- Todos los productos con alcohol marcados.
- Todas las imágenes con su archivo (guía 05).
- Repite el conteo y pégalo en `ENTREGA.md`.
