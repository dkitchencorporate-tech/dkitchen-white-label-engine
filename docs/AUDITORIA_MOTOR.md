# Auditoría del motor de marca blanca — Fase 0

> Fecha: 3 de octubre de 2026 · Rama: `nube/fase-0-auditoria` · Base: `main` @ `f7796d0`
> Alcance: lectura completa de `api/`, `schema_white_label.sql`, configuración y recorrido dirigido del frontend (`src/`, `public/`). **No se ha cambiado código de la aplicación.**
> Comprobaciones ejecutadas: `npm ci`, `tsc --noEmit`, `vite build`, `npm audit`, carga en Node de cada módulo de `api/`.

---

## 0. Resumen ejecutivo

1. **Hay agujeros de seguridad críticos explotables hoy** (§4): secretos y contraseñas maestras escritos en el código, un endpoint de 2FA que emite tokens de administrador sin contraseña, un endpoint de «migración» que restablece la contraseña del superadmin con una clave pública y un endpoint de borrado sin autenticación. **Cualquier marca ya desplegada a partir de este motor hereda estos fallos**: recomiendo revisar y rotar credenciales en esas instancias aunque no estén en este repositorio (yo no tengo acceso a ellas).
2. **El flujo de compra está roto de extremo a extremo**: `api/account.js` y `api/orders.js` no llegan a cargar (importan `query`, que `api/_lib/db.js` no exporta), así que login, registro y checkout fallan con 500. Aunque cargaran, el frontend envía `product_id` y la función SQL lee `productId`, por lo que todo pedido daría «Producto no existe».
3. **El esquema SQL no coincide con el código**: faltan funciones (`claim_guest_order`, `get_guest_order_status`, `is_phone_registered`, `search_client`, `add_items_to_kiosk_order`), faltan columnas (`customer_name`) y **no hay ni una política RLS** pese a que comentarios y README dicen lo contrario. El valor `'local'` (mesa) que usa el kiosko viola el `CHECK` de `orders.delivery_method`.
4. **Calidad base**: TypeScript no estricto y con 14 errores; sin tests (el script `test` apunta a un `test_urls.js` inexistente); sin lint ni CI. El `build` de Vite sí pasa.
5. **Identidad**: quedan restos de Seven Food Fries (dominio, VAPID, CSS, modales de salsas, diccionario de traducción, prefijos `sff_`), de una base de datos de cliente (UUID de categoría fijo) y de D-Kitchen como marca por defecto (§2). No hay restos de Wing Boss ni de Bokadipan; de pizzerías solo quedan claves i18n con nombre `pizza_*`.
6. **Paridad con la plataforma QR**: el motor cubre pedidos (domicilio/recogida), kiosko/TPV, panel de pedidos, catálogo, horarios, upsells, campañas y fidelización básica. Faltan alérgenos, combos, promociones con fechas, banners, legales por negocio, reservas, editor de sala, IA de imágenes, multimarca real, superadmin, cobros con suscripción y capa de pagos (§3).

**Recomendación**: antes de la Fase 1 (neutralizar), una **Fase 0.5 corta de parches críticos** (seguridad + reparar checkout). Coste estimado en §6.

---

## 1. Arquitectura actual

| Capa | Tecnología | Observaciones |
|---|---|---|
| Frontend | React 19 + Vite 8, Zustand 5 (persistido en `localStorage`), SPA con vistas por estado en `src/App.tsx` (sin router) | Rutas `/admin`, `/registro`, `/pedido`, `/verificar-email` resueltas a mano con `window.location`. |
| Estilos | **Doble sistema**: Tailwind 3 por CDN en tiempo de ejecución (`index.html:42`) + Tailwind 4/PostCSS en build (`tailwind.config.js`, `postcss.config.js`) + `public/css/custom.css` | Variables CSS `--brand-*`; paleta duplicada en 3 sitios (index.html, tailwind.config.js, brandConfig). GSAP por CDN. |
| Identidad | `src/config/brandConfig.ts` (objeto TS sin validación) + variables de entorno `BRAND_NAME`/`BRAND_SLOGAN` en la API + `store_settings` en BD | Tres fuentes de verdad distintas para nombre, contacto y tarifas. |
| Backend | Funciones serverless de Vercel en `api/*.js` (JS sin tipos), consolidadas por `?action=` y reescritas en `vercel.json` | 5 funciones: `account`, `orders`, `admin`, `notify`, `catalog`. Sin validación de esquema (no hay zod). |
| Datos | Postgres (Neon) vía `pg`, `withTx()` fija `app.current_user_id` / `app.bypass_rls` con `set_config` | El esquema no define RLS, así que esas variables no protegen nada. |
| Auth | JWT propio (30 días, `localStorage`), bcrypt, TOTP propio para admin | Sin revocación ni rotación; `isAdmin` va dentro del JWT. |
| Precio | `process_checkout()` `SECURITY DEFINER` recalcula subtotal con `products.price` | Buen principio, pero ignora extras/modificadores, cantidades sin límite y lógica de envío discutible (§4). |
| Imágenes | Vercel Blob (`api/admin.js` `upload-image`, base64 ≤ 4 MB) | Sin recorte/compresión en cliente. |
| Notificaciones | Push VAPID firmado a mano (sin payload), correo SMTP con nodemailer | Push sin cifrado de payload: solo «ping». |
| PWA | `public/sw.js` red-primero con caché de **todas** las GET 200 (incluidas `/api/admin/*`) | Datos personales del panel quedan en Cache Storage. |
| Impresión | ESC/POS vía `src/utils/printerService.ts`, ticket HTML en `TicketPrinter.tsx` | Sin abstracción de impresora por marca. |
| Multimarca | **No existe**: una marca = un clon del repo + una BD | El objetivo «alta en horas» exige `brands/<slug>/` y semilla automática (Fase 1). |

Mapa de módulos principales:

```
src/App.tsx ─ vistas: splash · catalog · admin · tracking · registro · verify-email
 ├─ features/catalog/Catalog.tsx ─ ProductCard → IngredientsModal | SauceModal | SubcategoryModal
 ├─ components/CartDrawer · CheckoutModal (POST /api/checkout) · UpsellModal · UserModal
 ├─ pages/AdminDashboard.tsx ─ AdminOrders · AdminKiosk · AdminCatalog · AdminClients
 │                             AdminAnalytics · AdminHistory · AdminSchedule · AdminBusiness · AdminPrinterSettings
 └─ store/ cartStore · authStore · settingsStore · storeHoursStore · i18nStore (es/en) · kioskCartStore
api/
 ├─ account.js  login · verify-2fa · register · verify-email · resend · profile · delete-account · delete-test-data
 ├─ orders.js   checkout · claim-order · order-status · review · cleanup-simulated · migrate-schema
 ├─ admin.js    analytics · catalog · upload-image · clients · kiosk-add-items · orders · settings · upsells
 ├─ notify.js   send-campaign · send-order-push · send-transactional-email · save-push-subscription · track-*
 └─ catalog.js  catálogo público
```

Estado de verificación:

| Comprobación | Resultado |
|---|---|
| `node -e "import('./api/account.js')"` | ❌ `does not provide an export named 'query'` |
| `node -e "import('./api/orders.js')"` | ❌ mismo error |
| `admin.js`, `notify.js`, `catalog.js` | ✅ cargan |
| `tsc --noEmit` (no estricto) | ❌ 14 errores (p. ej. `LOCAL_IMAGE_MAP` no importado en `Catalog.tsx:72`, `BRAND_CONFIG.legal` inexistente en `MarketingCampaignModal.tsx:64` → **fallo en tiempo de ejecución** al abrir campañas, `ticketPrefix` inexistente, clave duplicada en `i18nStore.ts:453`) |
| `vite build` | ✅ (Vite no comprueba tipos) |
| `npm audit --omit=dev` | ⚠ 2 vulnerabilidades (1 alta en `nodemailer`, con arreglo disponible) |
| Tests | ❌ no existen; `npm test` apunta a `test_urls.js`, que no está en el repo |

---

## 2. Restos de identidad de clientes y de marca fija

### 2.1 Seven Food Fries

| Archivo:línea | Resto |
|---|---|
| `public/robots.txt:4` | `Sitemap: https://sevenfoodfries.com/sitemap.xml` |
| `public/sitemap.xml:4`, `:10` | URLs `https://sevenfoodfries.com/` y `/registro` |
| `api/notify.js:113` | `VAPID_SUBJECT` por defecto `mailto:hola@sevenfoodfries.com` |
| `public/css/custom.css:2` | Cabecera «SEVEN FOOD FRIES PWA - CUSTOM DESIGN SYSTEM» |
| `public/css/custom.css:142-143` | Fondo «lluvia de paquetes de patatas», referencia a `FriesRainBackground.tsx` |
| `src/lib/apiClient.ts:10`, `:22` | Clave heredada `sff_auth_token` |
| `src/components/ErrorBoundary.tsx:7` | Clave `sff-i18n` |
| `src/features/admin/AdminPrinterSettings.tsx:16`, `src/utils/printerService.ts:8` | Clave `sff_printer_config` |
| `src/store/adminUiStore.ts:23` | Clave `sff_silenced_order_ids` |
| `tailwind.config.js:26-43`, `index.html:61-73` | Paleta alias `fries.*` (`amber`, `gold`, `chipotle`, `chipotleDark`) |
| `src/components/SauceModal.tsx:13-17`, `KioskSauceModal.tsx:13-17` | Salsas fijas (Cheddar, BBQ, Ajo y Perejil) — carta de SFF en código |
| `src/components/ProductCard.tsx:12`, `:93-99`, `:148` | Lista de toppings (cheddar, guacamole, chipotle…), «Patatas Gourmet», detección de salsa por nombre |
| `src/components/IngredientsModal.tsx:27-30` | Toppings «salados de patatas» y **UUID fijo de categoría** `903e8a8b-6bc4-4dda-b6f8-e1c2911823f2` (de la BD de un cliente) |
| `src/components/IngredientsModal.tsx:33` | Extras a 1,00 € fijos en el cliente |
| `src/components/IngredientsModal.tsx:169`, `CheckoutModal.tsx:523` | Placeholders «salsa aparte, bien crujientes», «sin salsa picante» |
| `src/components/CheckoutModal.tsx:62` | Comentario «Todos los productos de la carta (patatas gourmet)» |
| `src/data/products.ts:63` | Extras «Jalapeños, Guacamole, Salsa BBQ…» |
| `src/store/i18nStore.ts:555-596` | Diccionario dinámico con carta de SFF (`PATATAS GOURMET`, `SALSA CHIPOTLE`, `SALSA RANCH-CHEDDAR`, `ALITAS`, `TENDERS`…) |

### 2.2 Pizzerías

| Archivo:línea | Resto |
|---|---|
| `src/store/i18nStore.ts:134`, `:150`, `:229`, `:347`, `:351`, `:355` | Claves `pizza_notes_placeholder`, `add_pizza_redeem`, `free_pizza_burger`, `config_pizza_ingredients`, `new_pizza`, `total_pizza` (textos ya neutros, solo el identificador) |

### 2.3 Wing Boss y Bokadipan

Búsqueda (`wing ?boss|wingboss|bokadipan`, sin distinguir mayúsculas) **sin resultados**. Solo `ALITAS → WINGS` en el diccionario i18n, genérico.

### 2.4 D-Kitchen como marca por defecto (debe salir de la marca, no del motor)

| Archivo:línea | Resto |
|---|---|
| `src/config/brandConfig.ts:94-169` | Nombre «D-Kitchen Gourmet», razón social, email `pedidos@dkitchencorporate.es`, redes `@dkitchencorporate`, club «Club Gourmet VIP» |
| `schema_white_label.sql:81-86` | `DEFAULT` de `store_settings` con nombre, razón social y email de D-Kitchen |
| `index.html:6-21` | Título, descripción, OG y `apple-mobile-web-app-title` de D-Kitchen |
| `index.html:29`, `public/sw.js:1` | Caché `dkitchen-pwa-v1` |
| `index.html:35-38`, `:76-77`, `:103`; `tailwind.config.js:46-47`; `public/css/custom.css:12` | Tipografías fijas Outfit + Plus Jakarta Sans (deben venir de la marca) |
| `public/manifest.json:2-4`, `public/manifest-admin.json:2-5` | `id`, nombre y descripción D-Kitchen; icono SVG único para 192/512 (no válido en iOS) |
| `public/assets/brand/logo.svg:10` | Texto «D-KITCHEN» |
| `api/account.js:7-9`, `:122`, `:191`, `:271`, `:371` | Nombre por defecto, **email de superadmin, secreto TOTP y contraseña por defecto**, URL `dkitchen-white-label-engine.vercel.app` |
| `api/_lib/adminGuard.js:26` | Email de superadmin fijo con privilegio de admin |
| `api/orders.js:344-345`, `:353`, `:381`, `:389` | Claves maestras y alta del superadmin D-Kitchen |
| `api/notify.js:12-13`, `:21-23`, `:191-193` | Marca por defecto y colores ámbar fijos en plantillas de correo |
| `src/components/Footer.tsx:40-45` | «Tecnología D-Kitchen Corporate Tech» + enlace (decidir si es firma del estudio, configurable) |
| `src/components/TicketPrinter.tsx:28`, `src/utils/printerService.ts:20` | `'D-KITCHEN'` de respaldo |
| Varios (`CartDrawer`, `CheckoutModal`, `UpsellModal`, `Admin*`…, 20 archivos) | Colores ámbar/amarillo fijos (`#F59E0B`, `amber-*`, `yellow-*`) y 62 HEX en TSX fuera del sistema de tokens |
| `api/account.js:278-287`, `:378-387` | Correos de verificación con colores fijos `#F59E0B` / `#0F0F11` |

---

## 3. Paridad con el inventario de la plataforma QR (§2 del arranque)

Leyenda: ✅ tiene · 🟡 parcial / mejorable · ❌ falta

### Carta pública
| Función | Estado | Nota |
|---|---|---|
| Categorías ordenadas | ✅ | `categories.sort_order`; subcategorías también. |
| Platos con foto | ✅ | Vercel Blob; sin encuadre ni compresión. |
| Alérgenos (14 UE) | ❌ | Ni en esquema ni en UI. Obligatorio (Reglamento UE 1169/2011). |
| Etiquetas Especial/Nuevo/Recomendado | 🟡 | `badge` texto libre guardado en `customization_schema.badge`; sin catálogo de etiquetas. |
| Precio de promoción con fechas | ❌ | — |
| Combos de precio cerrado | ❌ | Solo upsells. |
| Banners con destino | ❌ | Solo hero fijo. |
| Idiomas | 🟡 | es/en en `i18nStore` (659 líneas en código); contenido de carta sin traducción en BD (`name_en` en tipos, no en esquema). |
| Sin cookies de terceros | 🟡 | Sin cookies propias, pero carga Google Fonts, Tailwind CDN, jsDelivr (GSAP) y Unsplash: transferencia de IP a terceros. |
| Legales propias publicables | 🟡 | Textos legales genéricos en i18n; no se alimentan de los datos del negocio ni se publican a voluntad. |
| Ruta `/m/<slug>` | ❌ | Una marca por despliegue. |

### Pedido y operación (lo que el motor aporta además del QR)
| Función | Estado | Nota |
|---|---|---|
| Carrito, domicilio, recogida, programado | 🟡 | Funciona en UI; **checkout roto** (§0). Programado se valida por texto en notas. |
| Modificadores / extras | 🟡 | `customization_schema` en BD, pero extras fijos en código y **no cobrados en servidor**. |
| Kiosko / TPV de mostrador, mesas | 🟡 | `AdminKiosk` completo en UI; `'local'` rompe el `CHECK` y faltan funciones SQL. |
| Seguimiento de pedido | 🟡 | `OrderTracking` por polling; falta `get_guest_order_status` en SQL. |
| Impresión térmica | ✅ | ESC/POS. |
| Valoraciones | 🟡 | Sin verificación de autoría. |
| Fidelización por puntos | 🟡 | Puntos fijos en SQL (25 / 4 por cada 10 €), no los de `brandConfig`; se suman antes de entregar el pedido. |
| Campañas por correo | 🟡 | Sin baja (unsubscribe) ni base legal registrada. |
| Push | 🟡 | Sin payload; cualquiera puede suscribir cualquier teléfono. |
| Analítica | ✅ | Propia, sin terceros. |

### Panel del cliente
| Función | Estado | Nota |
|---|---|---|
| Espacios Inicio/Carta/Servicio/Negocio/Ayuda con «atrás» | 🟡 | Pestañas planas en `AdminDashboard`; `useHardwareBack` existe. |
| Primeros pasos | ❌ | — |
| Estudio de carta (categorías, especiales, promos, combos, legales) | 🟡 | CRUD de categorías/subcategorías/productos/upsells; faltan especiales, promos, combos, legales. |
| Fotos 4:3 y luz automáticos en navegador | ❌ | — |
| Imágenes con IA (cupo, bono, marca «Imagen orientativa») | ❌ | — |
| Diseño (plantilla, colores, tipografía por nivel) | ❌ | Identidad solo en código. |
| Editor de sala | ❌ | — |
| Reservas | ❌ | — |
| Mi plan / baja con ticket | ❌ | — |
| Chat de ayuda con paso a persona | ❌ | — |

### Central DKitchen (superadmin)
| Función | Estado |
|---|---|
| Clientes, ingresos, riesgo, capacidad, soporte, embudo | ❌ |
| Ficha con prueba «todo incluido», módulos, cobro | ❌ |

> Nota: en un modelo de **app propia por marca** (Signature), la Central puede vivir en la plataforma QR y hablar con cada instancia por API; propongo decidirlo en la Fase 3 (ver §5, decisión D3).

### Cobros
| Función | Estado |
|---|---|
| Suscripción día 12 con prorrateo, prueba → solo lectura, avisos 3/1 días | ❌ |
| Webhooks idempotentes | ❌ |
| Capa `PaymentProvider` (Whop, Revolut Merchant API, Bizum, TPV físico) | ❌ — hoy solo efectivo y «datáfono SumUp» como etiqueta, sin integración |

### Planeado
| Función | Estado |
|---|---|
| Comandero no fiscal (cuenta por mesa, cocina/barra, informes) | 🟡 base: pestaña «Mesas», `is_sent_to_kitchen` en `order_items`. Falta modelo de cuenta abierta, estaciones e informes. Verifactu fuera (KoreFactu). |

---

## 4. Hallazgos de seguridad

Severidad: 🔴 crítica · 🟠 alta · 🟡 media · ⚪ baja.

| # | Sev. | Dónde | Hallazgo | Corrección propuesta |
|---|---|---|---|---|
| S1 | 🔴 | `api/account.js:9`, `:201` | Secreto TOTP maestro por defecto `DKITCHENMASTER2026` en código público; se usa para **cualquier** perfil sin `totp_secret`. | Eliminar valores por defecto; fallar al arrancar si falta la variable; secreto TOTP por usuario, cifrado. |
| S2 | 🔴 | `api/account.js:163-215` | `verify-2fa` **no exige haber superado la contraseña**: con email + código emite un JWT con `is_admin: true` para cualquier perfil, e incluso para un superadmin ficticio si no existe en BD. Sin límite de intentos (6 dígitos, ventana ±1). | Reto de 2FA ligado a un token de un solo uso emitido tras la contraseña (5 min); rate limit; nunca forzar `is_admin` desde el endpoint. |
| S3 | 🔴 | `api/account.js:122` | Contraseña de superadmin por defecto `DKitchenAdmin2026!` si falta la variable. | Igual que S1. |
| S4 | 🔴 | `api/orders.js:337-347` | `migrate-schema` accesible públicamente (`/api/orders?action=migrate-schema`) con claves fijas `DKITCHEN_MASTER_SECURE_2026` / `DKitchenAdmin2026!`: restablece la contraseña del superadmin y crea una política «insert abierto». | Eliminar el endpoint; migraciones versionadas fuera de la API (script/CI). |
| S5 | 🔴 | `api/orders.js:272-328` | `cleanup-simulated` **sin autenticación** y con `bypass`: cualquiera cancela pedidos y borra clientes cuyos datos casen con `%test%`, `%prueba%`, `699…`. | Eliminar; si hace falta, solo admin y solo en entorno no productivo. |
| S6 | 🟠 | `api/_lib/adminGuard.js:26`, `:36` | `assertAdmin` concede admin por email fijo y, como respaldo, por el `isAdmin` del JWT (contradice su propio comentario). Hoy los handlers la llaman sin `auth`, pero `catalog.js:14` y `account.js:515` confían directamente en `auth.isAdmin`. | Una única comprobación en BD (`app_current_user_is_admin()`); quitar email fijo y respaldo JWT. |
| S7 | 🟠 | `schema_white_label.sql` | **Sin RLS** en ninguna tabla; `app.bypass_rls` no lo consulta nadie. El rol de app puede leer/escribir todo. | Activar RLS + políticas por tabla, rol de app sin privilegios, funciones `SECURITY DEFINER` con `REVOKE`/`GRANT` explícitos. |
| S8 | 🟠 | `api/notify.js:244-287` | `send-transactional-email` sin auth: **relé de correo** a cualquier dirección con el remitente de la marca; el enlace usa la cabecera `Host` (inyección de host → phishing). | Solo invocable desde servidor tras crear el pedido/registro; URL base desde configuración. |
| S9 | 🟠 | `process_checkout` (`schema_white_label.sql:285-312`) | Extras/modificadores no se cobran (el cliente muestra +1 €/extra); cantidad sin límite superior; canje de puntos sin bloqueo (`FOR UPDATE`); puntos ganados al crear el pedido (aunque se cancele); envío cobrado solo si no llega al mínimo; `v_store_open` sin usar. | Precio de modificadores desde `customization_schema` en servidor; límites (1–50); `SELECT … FOR UPDATE`; puntos al pasar a `delivered`; tarifas configurables y explícitas. |
| S10 | 🟠 | `api/orders.js:85` | El horario se salta escribiendo «⏰ Programado:» en las notas. | Campo `scheduled_for` validado (dentro de horario, ≥ ahora + preparación). |
| S11 | 🟠 | `api/account.js:437-452` | Cambiar el email en el perfil conserva `is_email_verified` → se elude la verificación para canjear puntos. | Reiniciar verificación al cambiar email. |
| S12 | 🟠 | `api/account.js:256-266` | El registro fija `app.current_user_id` al id de **un administrador** para insertar. | Insertar por función `SECURITY DEFINER` específica. |
| S13 | 🟠 | `public/sw.js:55-62` | El service worker cachea todas las GET 200, incluidas `/api/admin/*` (datos personales de clientes). | Excluir `/api/` de la caché. |
| S14 | 🟡 | `api/_lib/rateLimit.js:187-191` | Rate limit en memoria (no compartido entre instancias) y basado en el primer valor de `X-Forwarded-For` (falsificable). | Límite en BD/Upstash; IP de `x-vercel-forwarded-for`/`x-real-ip`. |
| S15 | 🟡 | `api/orders.js:239-260` | Valoración de cualquier pedido conociendo su UUID, sin autoría. | Exigir dueño (JWT o token de pedido). |
| S16 | 🟡 | `api/notify.js:291-317` | Cualquiera puede suscribir push a cualquier teléfono. | Ligar a pedido/usuario. |
| S17 | 🟡 | `api/_lib/auth.js:59` | JWT de 30 días en `localStorage`, sin revocación; el de admin igual. | Admin: 12 h + refresco; `token_version` en perfil para revocar. |
| S18 | 🟡 | Varios (`api/account.js:213`, `:302`, `api/admin.js` en cada `catch`) | Se devuelven `err.message` internos al cliente. | Mensajes genéricos + id de correlación en log. |
| S19 | 🟡 | `api/account.js:280`, `api/notify.js:28-32` | HTML de correos con `full_name`/campos de campaña sin escapar. | Escapar siempre. |
| S20 | 🟡 | `api/account.js:217-304` | El token de verificación se genera pero **no se guarda** en el registro → el primer enlace nunca funciona. Contraseña mínima de 6. | Guardar hash del token con caducidad; mínimo 10 caracteres. |
| S21 | 🟡 | Toda la API | Sin validación de entrada con esquema (zod), sin CSP. | zod en cada endpoint; cabecera CSP en `vercel.json`. |
| S22 | 🟡 | `console.error/warn` en la API | Se registran objetos de error de BD que pueden incluir datos personales (teléfonos, emails). | Logger con redacción de PII. |
| S23 | ⚪ | `profiles.totp_secret`, `verification_token` | En claro en BD. | Cifrar secreto TOTP; guardar hash del token. |
| S24 | ⚪ | `package.json` | `nodemailer` con vulnerabilidad alta conocida; tipos y herramientas en `dependencies`. | `npm audit fix`; separar dev deps. |
| S25 | ⚪ | `index.html:42`, `:85-86` | Scripts de terceros sin SRI (Tailwind CDN, GSAP). | Empaquetar en build. |

**Integrado en esta fase:** nada (fase de solo lectura).
**Pendiente:** todo lo anterior; S1–S5 son urgentes y además afectan a las instancias ya clonadas.

---

## 5. Propuesta de mejoras (investigación de mercado)

Referencias consultadas: Qamarero, Last.app, Owner.com, Sunday, Revolut Business; conocimiento de producto de Toast, Square y Glovo/Uber Eats para comercios.

| Competidor | Qué hace bien | Qué adoptamos |
|---|---|---|
| **Qamarero** (TPV hostelería, desde 119 €/mes) | Carta QR con 14 alérgenos, traducción automática (EN/FR/IT) según idioma del navegador, pedir y pagar en mesa, pagos divididos, Verifactu/TicketBAI | Alérgenos obligatorios, traducción automática de la carta, división de cuenta en el comandero (no fiscal). |
| **Last.app** | Tienda online propia en 24 h, base de datos de clientes, campañas y fidelización, comanderos, integración de delivery | Alta de marca en horas (Fase 1), CRM ligero con segmentos. |
| **Owner.com** | Web SEO + app nativa iOS/Android de marca, pedidos sin comisión, fidelización incluida, campañas automáticas email/SMS | Automatizaciones: «te echamos de menos» (30 días sin pedir), cumpleaños, recuperación de carrito; SEO técnico (SSR/prerender de la carta, schema.org `Menu`). |
| **Sunday** | Pagar en la mesa por QR en ~10 s, dividir por plato/persona/importe, propinas, reseña tras pagar con aviso de reseña negativa | Propina opcional; «reseña en Google si 5★, aviso interno si ≤3★». |
| **Toast / Square** | Modificadores con precio, KDS por estación, informes por camarero, programas de fidelización por niveles | Modificadores con precio en servidor; KDS por estación (cocina/barra); niveles de fidelización. |
| **Glovo / Uber Eats (comercios)** | Estados de pedido claros, tiempos de preparación dinámicos, pausa por saturación, zonas de reparto | Modo saturación que ajusta tiempos (ya hay `saturation_mode`, sin uso real), zonas por código postal/radio en servidor. |
| **Revolut Business** | Merchant API para cobro online, en app y presencial | Adaptador `RevolutProvider` detrás de `PaymentProvider`; Bizum por confirmar (no consta en la documentación pública consultada). |

Mejoras propuestas (además de la paridad con §3), por impacto en la venta de Signature:

1. **Modificadores con precio y combos en servidor** (base de ticket medio).
2. **Promociones con fechas, cupones de un uso y «2×1 martes»** (Last.app/Owner).
3. **Fidelización v2**: reglas por marca en BD (puntos/€, umbral, recompensa a elegir), niveles, puntos al entregar, caducidad.
4. **Automatizaciones de marketing** con baja de un clic y consentimiento registrado (RGPD).
5. **Reservas** con confirmación por correo y bloqueo de mesas en el editor de sala.
6. **Comandero no fiscal** con estaciones cocina/barra, división de cuenta y propinas.
7. **IA de imágenes** con cupo, bono y sello «Imagen orientativa» (paridad QR).
8. **Rendimiento y privacidad**: quitar Tailwind CDN/GSAP/Google Fonts remotos (autoalojar), imágenes WebP con tamaños, Lighthouse ≥ 90.
9. **App instalable de verdad**: iconos PNG 192/512/maskable generados desde el logo, pantalla de bienvenida iOS (Fase 1).
10. **Observabilidad**: registro de errores sin PII y panel de salud por marca.

---

## 6. Plan de fases y coste estimado

**Unidad de coste.** Estimo en **sesiones de agente** (una sesión ≈ hasta 200–300 k tokens de contexto, el umbral de la statusline) y en **millones de tokens procesados** acumulados. Calibración: esta Fase 0 ha consumido ≈ 0,2 M tokens en una sesión. El coste en euros depende de tu plan; con estos totales se puede convertir directamente.

| Fase | Contenido | Entregables / criterio de aceptación | Sesiones | Tokens (M) |
|---|---|---|---|---|
| **0.5 Parches críticos** *(nueva, recomendada)* | S1–S5, S8, S13; arreglar import `query`; `product_id`/`productId`; `'local'` en `CHECK`; funciones SQL que faltan; `.env.example` sin valores | Login, registro y checkout funcionan contra Postgres local; ningún secreto ni contraseña por defecto en el código | 1–2 | 0,4–0,7 |
| **1 Neutralizar y configurar** | `brands/<slug>/brand.config.ts` con zod (identidad, tipografías, paleta, legales, tarifas, fidelización); `brands/demo`; eliminar restos §2; una sola fuente de tokens (fuera Tailwind CDN); `npm run nueva-marca -- <slug>` (carpeta, iconos PNG + manifest desde el logo, SQL de semilla, checklist de variables); `docs/NUEVA_MARCA.md` | `grep` de §2 vacío; alta de marca demo en < 1 h siguiendo la guía | 2–3 | 0,8–1,2 |
| **2 Base de calidad** | `strict: true` y 0 errores de tipos; ESLint; Vitest (precios, carrito, promociones, combos, puntos); pruebas SQL de `process_checkout` en Postgres de CI; Playwright (carta → carrito → checkout → admin); GitHub Actions (lint, typecheck, test, build) | CI en verde en cada PR | 2–3 | 0,8–1,2 |
| **3 Seguridad estructural** | RLS completo (S7), guardia admin única (S6), zod en toda la API (S21), JWT/revocación (S17), rate limit compartido (S14), CSP, logger sin PII, resto de S9–S25 | Lista §4 cerrada salvo lo justificado | 2 | 0,7–1,0 |
| **4 Carta completa** | Alérgenos, etiquetas, promociones con fechas, combos (máx. 12, sin anidar, alérgenos calculados), modificadores con precio en servidor, banners, idiomas en BD, legales del negocio | Paridad «Carta pública» §3 | 3 | 1,2–1,6 |
| **5 Fidelización y marketing** | Fidelización v2, cupones, automatizaciones, baja y consentimiento | Paridad + mejoras 2–4 de §5 | 2 | 0,7–1,0 |
| **6 Capa de pagos** | `PaymentProvider` + adaptadores (efectivo/datáfono, Whop, Revolut Merchant API; Bizum si procede), webhooks idempotentes, estados de pago | Pago online de prueba en sandbox de extremo a extremo | 2 | 0,7–1,0 |
| **7 Sala: editor y reservas** | Editor de sala (mesas, elementos, zoom), reservas | Paridad QR (plan Ampliado) | 2–3 | 0,8–1,2 |
| **8 Comandero no fiscal** | Cuenta abierta por mesa, envío a cocina/barra (KDS), división de cuenta, informes por mesa/camarero/día | Sin emisión fiscal (KoreFactu por API, fuera) | 2–3 | 0,8–1,2 |
| **9 Panel del cliente v2 e IA** | Espacios con «atrás», primeros pasos, fotos 4:3 con luz automática, IA de imágenes con cupo/bono, diseño por nivel, chat de ayuda con ticket | Paridad «Panel del cliente» | 3 | 1,0–1,5 |
| **10 Central y cobros** *(según decisión D3)* | Superadmin y suscripciones (día 12, prorrateo, prueba → solo lectura, avisos) | Solo si la Central vive en el motor | 2–3 | 0,8–1,2 |
| **Total** | | | **23–30** | **≈ 8,7–12,8** |

Prioridad si el crédito es limitado: **0.5 → 1 → 2 → 3** (≈ 2,7–4,1 M) dejan un motor seguro, neutro y con CI; a partir de ahí, 4 → 6 → 5 por impacto comercial.

### Decisiones que necesito de karc0

- **D1.** ¿Apruebas la **Fase 0.5** antes de la Fase 1? (Recomendado: sí, por S1–S5 y el checkout roto.)
- **D2.** ¿Revisas tú las instancias ya desplegadas desde este motor (rotar `APP_JWT_SECRET`, fijar `SUPER_ADMIN_*`, comprobar si alguien ha llamado a `migrate-schema`/`cleanup-simulated`)? Yo no puedo acceder a ellas.
- **D3.** Central DKitchen y suscripciones: ¿en la plataforma QR (y el motor solo expone API) o dentro del motor?
- **D4.** ¿El pie «Tecnología D-Kitchen Corporate Tech» se mantiene como firma configurable o se elimina por marca?
- **D5.** Multimarca: ¿un despliegue por marca (recomendado para diseño de autor y aislamiento de datos) o un único despliegue multi-inquilino con `/m/<slug>`?

---

## Fuentes de la investigación

- [Qamarero — Carta digital QR](https://www.qamarero.com/carta-digital/) · [Pedir y pagar QR](https://qamarero.com/pedir-y-pagar/) · [TPV hostelería](https://qamarero.com/tpv/)
- [Last.app — Precios](https://www.last.app/en/pricing) · [Capterra: Last.app](https://www.capterra.es/software/1069410/Last-app)
- [Owner.com — Online ordering](https://owner.com/online-ordering-system-for-restaurants/) · [Capterra: Owner](https://capterra.com/p/10002488/Owner/)
- [Sunday — Pay at Table](https://sundayapp.com/?p=40643) · [Sunday — Digital bill](https://sundayapp.com/digital-bill/)
- [Revolut Business — Online payments](https://www.revolut.com/en-ES/business/online/) · [Revolut Merchant API — Get started](https://developer.revolut.com/docs/guides/merchant/get-started)
