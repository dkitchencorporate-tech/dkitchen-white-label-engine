# Actualizaciones pendientes por marca (tras terminar el pulido del motor)

> Documento vivo. Se actualiza al cerrar cada fase del motor. Indica qué hay que hacer en cada PWA ya creada para traerla al motor pulido, sin perder su diseño ni sus datos.
> Base: `docs/AUDITORIA_VERSIONES_PREVIAS.md` (genealogía y diferencias) y `docs/ANALISIS_PRODUCTO.md` (arquitectura motor/marca).

## 0. Cambios comunes a todas las marcas (una vez el motor esté listo)

Cuando terminen las Fases 1A–2, cada marca pasa por el mismo procedimiento de migración:

1. **Rama de migración** `motor/v1.0.0` en el repo de la marca, con PR, despliegue de prueba y fusión controlada.
2. **Estructura `motor/` + `marca/`:** el código del motor sustituye a `src/` y `api/`. Todo lo propio de la marca se traslada a `marca/`:
   - identidad y paleta → `marca/marca.config.ts` (validado con zod);
   - componentes de autor (preloader, logo, portada, ficha de plato) → `marca/huecos/`;
   - fotografía y logos → `marca/recursos/`;
   - carta → `marca/semilla/`.
3. **Colores fijos fuera:** las clases `bg-[#xxxxxx]` de los componentes pasan a tokens de la marca.
4. **API nueva** (TypeScript + zod, precio en servidor) y **migraciones numeradas** aplicadas sobre su base de datos actual sin perder datos. Primero se ensaya en una rama de Neon.
5. **Acceso:** usuario `dkitchen@dkitchencorporate.es` con su contraseña de la marca (`ACCESOS`, fuera del repo). 2FA bien hecho (con pantalla de código) si se activa.
6. **Variables de entorno** según el `.env.example` del motor, más `APP_URL`.
7. **Pruebas:** la suite del motor (unitarias + e2e) en verde contra la base de la marca en una rama de Neon.
8. **Desde entonces**, recibe las mejoras por PR de sincronización (vía elegida en la Fase 2).

## 1. Wing Boss — `wing-boss-pwa` (demo DKitchen, rama `master`)

| Hecho | Pendiente tras el motor |
|---|---|
| PR de seguridad #1 (`cleanup-simulated` solo admin, relé de correo cerrado) | Fusionar el PR #1 de seguridad si no se ha hecho. |
| Acceso unificado `dkitchen@dkitchencorporate.es` (03-oct) | Migración común (§0). |
| | Tema oscuro «Street» → tokens. Candidata a **plantilla Street** del motor (A10, futura). |
| | 20 fotos de producto → `marca/recursos/`; envío gratis a partir de 15 € y upsell de postre → reglas en `marca.config`. |
| | Le faltan la verificación de correo y `VerifyEmail` (los trae el motor). |

## 2. Bokadipan — `bokadipan-pwa` (demo DKitchen, en `bokadipan.dkitchencorporate.es`)

| Hecho | Pendiente tras el motor |
|---|---|
| PR de seguridad #1 (sin `migrate-schema`, sin PIN `202600`, login unificado) | Fusionar el PR #1 de seguridad. |
| | **Acceso:** aplicar la contraseña de `dkitchen@dkitchencorporate.es` cuando se conecte su cuenta de Neon (base «dkitchen-db»). |
| | Migración común (§0). Es la marca con más diseño fijo (**664 HEX en 20 componentes**): reconstruirla con tokens + huecos es la **prueba de aceptación de la Fase 1B**. |
| | `Preloader.tsx` y `BokadipanLogo.tsx` → `marca/huecos/`; `mockCatalog.ts` → semilla real con alérgenos (dejar de usarlo como respaldo en producción). |
| | Revisar `schema_bokadipan.sql` (tablas `users`, `coupons`, `app_settings` distintas del esquema común) y unificarlo con las migraciones del motor. |
| | Valorar hacer el repo privado (no es de cliente, pero expone toda la lógica). |

## 3. Seven Food Fries — `seven-food-fries-pwa` (demo DKitchen)

| Hecho | Pendiente tras el motor |
|---|---|
| PR de seguridad #2 (sin `migrate-schema` ni contraseña fija, login de admin reparado) | Fusionar el PR #2 de seguridad. **Hasta entonces el panel no deja entrar a ningún admin** (el servidor pedía un 2FA que el panel no muestra). |
| Acceso unificado `dkitchen@dkitchencorporate.es` (03-oct) | Migración común (§0). |
| | Fondo «lluvia de patatas» (`FriesRainBackground.tsx`) y salsas → huecos y carta de la marca. |
| | `docs/tests/` (pruebas de seguridad) → integrar en la suite del motor. |
| | Su correo transaccional usa un remitente fijo «Seven Food Fries»: pasará a `marca.config`. |

## 4. Néstor Pizzas — `nestor-pizzas-pwa` (CLIENTE REAL · producción · Supabase)

> Regla: **no se toca sin una fase de análisis y un plan aprobados por karc0**.

| Pendiente inmediato | Pendiente tras el motor |
|---|---|
| Pantalla de prelanzamiento: plan en `docs/PLAN_NESTOR_PRELANZAMIENTO.md`, pendiente de aprobación | Decidir si migra a Neon + motor (karc0 prefiere Neon) o se queda en Supabase con parches puntuales. |
| Pasar el repo a privado (lo hace karc0 en GitHub) | Si migra: plan propio de migración de datos de clientes y pedidos, con ensayo en copia y ventana acordada con el cliente. |
| | Su integración SumUp (checkout + webhook verificado) es la referencia del adaptador `PaymentProvider` del motor. |
| | Promo de los jueves y producto «secreto» → módulos de promociones y disponibilidad programada. |

## 5. Plantilla de pizzerías — `template-pwa-pizzerias`

Plantilla antigua (Supabase), sustituida por el motor. **Propuesta:** archivarla en GitHub cuando el motor tenga marca demo, para que nadie la clone por error.
