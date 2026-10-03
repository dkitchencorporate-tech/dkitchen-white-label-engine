# Pruebas de seguridad y de estrés

*3 de octubre de 2026 · Fase 3 («prueba de fuego»), con la marca `alacena-expres`.*

Todo lo que sigue está automatizado y se repite en cada PR, salvo la prueba de estrés, que se lanza a mano porque crea miles de pedidos.

## 1. Cómo se ejecutan

```bash
npm test                 # Vitest: API, tienda y seguridad contra Postgres real
npm run test:e2e         # Playwright: demo + dark store en móvil, contra la compilación de producción
npm audit --omit=dev     # dependencias de producción
# Estrés (nunca contra producción):
npm run dev:api          # con APP_DATABASE_URL de una base con la semilla de alacena-expres
ESTRES_URL=http://localhost:3001 ESTRES_DATABASE_URL=<dueño> npx tsx scripts/estres.ts
```

## 2. Seguridad: qué se ataca y qué pasa

Pruebas en `tests/tienda.test.ts` (además de las 18 de `tests/api.test.ts`, que cubren cuentas, tokens revocables, límites de peticiones y RLS).

| Ataque o abuso | Resultado comprobado |
|---|---|
| Mandar precios, subtotales o totales falsos en el pedido | Se ignoran: el precio sale de SQL (2 × 14,90 € = 29,80 € aunque se envíe 0,01 €). |
| Falsear la zona o el ajuste de precio (`zone_id`, `price_adjust_pct`, `zone` en la dirección) | Se ignoran: la zona la decide el servidor por el código postal (Pozuelo → +8 % y 6,90 € de envío). |
| Código postal fuera de reparto o pedido bajo el mínimo de la zona | 400 con mensaje claro. |
| Comprar alcohol sin declarar la mayoría de edad | 400. Con la declaración, el pedido queda marcado y el panel avisa: «pedir DNI en la entrega». |
| Comprar alcohol fuera de la franja legal | 400, y el resto de productos se puede pedir. |
| Comprar más unidades de las que hay | 400 «Solo quedan N». |
| 30 pedidos simultáneos por 10 unidades | Exactamente 10 vendidos; existencias finales 0, nunca negativas. |
| Inyección SQL en nombre y notas (`Robert'); DROP TABLE products;--`) | Se guarda como texto; ninguna tabla cambia (consultas parametrizadas y funciones SQL). |
| XSS en el mensaje de regalo (`<img onerror=…>`) | Se guarda literal y React lo pinta escapado; los correos escapan todo el HTML. |
| Cantidades negativas o mayores de 50, más de 30 líneas, identificadores no numéricos o inexistentes | 400 (zod y SQL). |
| Mensaje de regalo de más de 250 caracteres | 400. |
| Panel sin token, con un token firmado con otro secreto o con `alg: none` | 401. |
| Cliente registrado intentando crear zonas | 403. |
| Zona con un código postal que ya está en otra zona activa, o con códigos no válidos | 400 (lo impide un *trigger* en la base de datos, no solo la API). |
| Imagen de producto con `javascript:`, `http://`, `data:` o `../` | 400: solo `https://` o rutas `/marca/…` sin `..`. |
| Rol de la API conectándose directo a la base de datos | No ve perfiles ni pedidos (RLS), no puede cambiar precios, no puede crear zonas ni desactivar RLS. |
| Seguimiento de un pedido ajeno con un UUID aleatorio o una inyección | 404 o 400, sin datos. |
| Fuerza bruta de pedidos desde una IP | A partir del 11.º pedido en un minuto: 429. |

### Hallazgos corregidos en esta fase

1. **Dependencias:** `nodemailer` (alta: fuga de credenciales SMTP entre transportes y varios DoS) y `dompurify` (baja: XSS en un modo que no usamos). Actualizadas; `npm audit --omit=dev` da 0 vulnerabilidades.
2. **Imágenes de producto:** el panel aceptaba cualquier URL válida, también `http://`. Ahora solo `https://` o recursos de la marca.
3. **Panel de pedidos:** se habría roto al pintar direcciones guardadas como objeto (venían de la API nueva). Corregido en `formatAddress`.
4. **Checkout:** ofrecía «aceptar recargo por pedido pequeño», pero el servidor rechazaba esos pedidos. Ahora aplica las mismas reglas que el servidor: el mínimo es obligatorio y el envío es gratis desde el umbral.

### Premisas y riesgos que quedan

- **IP del cliente.** El límite de peticiones usa `x-real-ip`, que en Vercel fija la plataforma. Fuera de Vercel habría que poner un proxy que la sobrescriba.
- **Edad.** La venta de alcohol se apoya en la declaración del cliente y en la comprobación del DNI en la entrega, que es lo que exige la normativa a una tienda a distancia. No hay verificación documental en línea.
- **Franja del alcohol.** Es configurable. La de la semilla (08:00–22:00) es conservadora; el cliente debe confirmar la ordenanza que le aplica.
- **Dependencias de desarrollo.** `braces` (alta, DoS con patrones anidados) llega a través de Tailwind 3 y solo se ejecuta al compilar, con patrones nuestros; no viaja a la app ni a la API. Arreglarlo exige pasar a Tailwind 4, un cambio grande que queda para una fase propia.
- **2FA del panel.** Pendiente desde la Fase 1A.
- **CAPTCHA en registro y pedido.** No hay; lo cubren el límite por IP y la idempotencia.

## 3. Estrés

Un solo proceso local de la API (`scripts/servidor-api.ts`, pool de 5 conexiones, igual que cada instancia de Vercel), Postgres 16 local y la semilla de Alacena con sus 4 zonas. Duración: 15 s por escenario.

| Escenario | Peticiones | Por segundo | p50 (ms) | p95 (ms) | p99 (ms) | Máx. (ms) | Respuestas |
|---|---|---|---|---|---|---|---|
| GET /api/catalog · 50 concurrentes | 8926 | 591 | 81 | 107 | 124 | 197 | 200: 8926 |
| POST /api/checkout · 25 concurrentes | 11826 | 787 | 31 | 40 | 48 | 93 | 200: 10672, 400: 1154 |

- **Carrera por las últimas unidades:** 200 pedidos simultáneos por 50 unidades → **50 vendidos**, existencias finales 0 (220 ms).
- **Límite por IP** (10 pedidos por minuto): 200 × 10 y después 429 × 5.
- **Invariantes tras más de 10 700 pedidos:**
  - existencias negativas: **0**;
  - pedidos cuyo total no cuadra con sus líneas y el envío: **0**.
- **Los 400** son rechazos de negocio esperados: pedidos aleatorios por debajo del mínimo de su zona (40 € en Pozuelo).

**Lectura.** Una sola instancia aguanta unos 800 pedidos por segundo con p99 por debajo de 50 ms. Es varios órdenes de magnitud más de lo que necesita una dark store (un pico realista son decenas de pedidos por minuto). El cuello de botella en producción será la base de datos (Neon) y su número de conexiones, no la API. El descuento de existencias bloquea solo la fila del producto, en orden fijo, así que no hay interbloqueos.
