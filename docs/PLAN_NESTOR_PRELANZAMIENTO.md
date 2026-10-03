# Plan: pantalla de prelanzamiento en Néstor Pizzas

> Estado: **PROPUESTA PENDIENTE DE APROBACIÓN DE KARC0.** No se ha modificado nada en `nestor-pizzas-pwa`.
> Base del análisis: lectura de `nestor-pizzas-pwa` @ `1f751bc` (12-sep-2026). Es el único cliente real: está en producción, usa Supabase y su repo es público.

## 1. Objetivo

Que nadie pueda **ver la carta ni comprar** hasta que karc0 lo indique. En su lugar se muestra una pantalla completa con la identidad de Néstor Pizzas («Estamos realizando actualizaciones. Próximamente anunciaremos nuestro lanzamiento»), tanto en la web pública como en `/registro`. El panel `/admin` sigue accesible para el negocio.

## 2. Lo que ya existe y por qué no basta

| Pieza existente | Archivo | Problema |
|---|---|---|
| Ajuste `app_settings.store_closed` + aviso «Tienda cerrada» | `src/App.tsx:151-175`, `:262-280` | El aviso **se puede cerrar con un botón** y la carta queda debajo, montada y navegable. |
| Interruptor de cierre en el admin | `src/pages/AdminDashboard.tsx:39-59`, `src/features/admin/AdminHistory.tsx:282` | Es «cerrar por hoy», no un bloqueo de lanzamiento. |
| `/registro` | `src/App.tsx:214-221` | No consulta el estado de la tienda. |
| Creación de pedidos | RPC `process_checkout` (`src/components/CheckoutModal.tsx:242`, `src/features/admin/AdminKiosk.tsx:272-296`), `api/sumup-create-checkout.js` | **Ninguna comprobación de cierre en el servidor.** Con la clave pública de Supabase se puede llamar a la RPC aunque la web oculte la carta. |

## 3. Diseño propuesto

Hay dos capas. Las dos se activan y desactivan con un único ajuste, sin desplegar código nuevo.

**Ajuste nuevo:** `app_settings` con clave `launch_lock`, valores `'true'` / `'false'`. Va separado de `store_closed` para no mezclar «cerrado hoy» con «aún no hemos lanzado».

### Capa 1. Pantalla (frontend)
1. Nuevo componente `src/components/PreLaunchScreen.tsx`. Ocupa la pantalla completa, sin botón de cierre ni scroll hacia contenido, con la identidad de Néstor:
   - fondo obsidiana `#0A0A0E` con viñeta `#09090D`;
   - acento rojo `#FF3B00` y verde de marca `#22C55E`;
   - tipografías **Outfit** (titulares) y **Plus Jakarta Sans** (texto), las mismas que ya carga `index.html`;
   - logo oficial `public/assets/brand/logo_exact_2k.png`, con animación suave de entrada, coherente con el splash actual.
2. En `src/App.tsx`:
   - leer `launch_lock` al arrancar, junto a `store_closed`;
   - suscribirse en tiempo real a sus cambios, con el mismo canal que ya usa `store_closed`;
   - si está activo y la ruta **no** es `/admin`, renderizar solo `PreLaunchScreen`. **No se montan** `Catalog`, `CartBar`, `CartDrawer`, `CheckoutModal`, `RegisterLanding` ni `UserModal`.
3. **Fallar en cerrado:** mientras se consulta el ajuste se muestra el splash, nunca la carta. Si la consulta falla, se muestra la pantalla de prelanzamiento.
4. **Vaciado:** al activarse se vacía el carrito persistido (`useCartStore.clearCart()`), para que no reaparezca un pedido a medias al reabrir.

### Capa 2. Servidor (base de datos y API) — imprescindible para que «no se pueda comprar» sea cierto
1. **Trigger en Supabase** `BEFORE INSERT ON orders` que lanza un error («Pedidos desactivados hasta el lanzamiento») si `launch_lock = 'true'`. Bloquea `process_checkout`, el kiosko y cualquier inserción directa sin tocar la función actual, cuyo código no está en el repo.
2. **`api/sumup-create-checkout.js`:** comprobar `launch_lock` al principio y responder 503 **antes** de crear ningún cobro en SumUp.
3. **Comprobar RLS de `app_settings`:** solo un administrador puede cambiar `launch_lock`. Si la política actual permite escribir a cualquiera, se corrige en el mismo cambio.

### Interruptor en el admin
Botón «Modo prelanzamiento: ACTIVO / DESACTIVADO» en `AdminDashboard`, junto al de cerrar tienda, con confirmación. Así karc0 abre el lanzamiento con un clic, sin desplegar nada.

## 4. Pasos de ejecución (cuando se apruebe)

1. Rama `seguridad/prelanzamiento` en `nestor-pizzas-pwa`. **Solo** los archivos indicados: `PreLaunchScreen.tsx` (nuevo), `App.tsx`, `AdminDashboard.tsx`, `api/sumup-create-checkout.js` y textos en `i18nStore.ts`.
2. SQL en `docs/sql/launch_lock.sql`: inserta `launch_lock='true'`, crea el trigger y ajusta RLS si hace falta. Lo aplica karc0 en el SQL Editor de Supabase, o yo si se conecta Supabase a la sesión.
3. Verificación local: `npm ci`, `vite build`, y capturas con Playwright de `/`, `/registro` y `/admin` con un Supabase simulado (bloqueado / desbloqueado).
4. PR con capturas. Karc0 revisa la vista previa de Vercel antes de fusionar. **Ojo:** las vistas previas de Vercel usan el Supabase de producción, así que solo se prueba la lectura del ajuste, nunca la creación de pedidos.
5. Orden de puesta en marcha **sin ventana de riesgo**:
   1. aplicar el SQL con `launch_lock='true'` (desde ese momento el servidor ya rechaza pedidos);
   2. fusionar el PR (aparece la pantalla).

## 5. Pruebas de aceptación

- [ ] `/`, `/registro` y `/pedido` muestran solo la pantalla de prelanzamiento, en móvil y en escritorio.
- [ ] No hay forma de cerrarla ni de llegar a la carta: ni teclado, ni botón atrás, ni recargar.
- [ ] Una llamada directa a `process_checkout` con la clave pública devuelve error mientras `launch_lock='true'`.
- [ ] `sumup-create-checkout` responde 503 y no crea cobro.
- [ ] `/admin` funciona y el interruptor cambia el estado en tiempo real en otra pestaña abierta.
- [ ] Al desactivarlo todo vuelve a funcionar como hoy, sin desplegar.

## 6. Vuelta atrás

- **Inmediata:** desactivar el interruptor en el admin, o poner `launch_lock='false'`.
- **Total:** revertir el PR y `DROP TRIGGER` (incluido en `docs/sql/launch_lock.sql`).

## 7. Decisiones que necesito de karc0

1. Si el **kiosko del local** puede crear pedidos durante el prelanzamiento, para pruebas internas.
2. El **texto exacto** de la pantalla y si se muestran Instagram, WhatsApp o teléfono.
3. Si se añade «Avísame cuando abráis» (captura de correo). Necesita una tabla y aviso legal; recomiendo dejarlo para después.
4. **Acceso a Supabase:** lo aplicas tú, o lo conectas a la sesión.

**Coste estimado:** ≈ 4–6 € (implementación, capturas y PR).
