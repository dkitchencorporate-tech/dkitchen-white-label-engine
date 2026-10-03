# Auditoría de las versiones anteriores

> Fecha: 3 de octubre de 2026 · Lectura en solo lectura, autorizada por karc0, de 5 repositorios (clon superficial del último commit).
> Objetivo: entender el nivel de pulido de Wing Boss y Bokadipan (los diseños más actuales) y extraer los patrones ya resueltos que el motor debe absorber.

## 1. Genealogía

Los seis repositorios son **el mismo código base copiado y modificado a mano** (≈ 17–18,6 mil líneas cada uno, misma estructura `src/components`, `src/features/admin`, `api/`).

| Fecha | Repositorio | Base de datos | Estado | Notas |
|---|---|---|---|---|
| 07-sep | `template-pwa-pizzerias` | Supabase | Plantilla | Origen. Restos de una versión `js/` anterior. |
| 12-sep | `nestor-pizzas-pwa` | Supabase | **En producción** · repo **público** | Único con pago online real (SumUp). Promociones por día («Promo Jueves»). |
| 25–28-sep | `seven-food-fries-pwa` | Neon | En producción | Migración a Neon y API consolidada en 5 funciones. |
| 26-sep | `dkitchen-white-label-engine` v3.0 | Neon | Plantilla | Extraído de Seven Food Fries. |
| 26–27-sep | `wing-boss-pwa` | Neon | En Vercel (rama `master`) | Clonado del motor **antes** de los añadidos de la v3.1. |
| 28-sep | `bokadipan-pwa` | Neon | **En producción** (`bokadipan.dkitchencorporate.es`) · repo **público** | Diseño más elaborado. Incluye un segundo esquema propio (`schema_bokadipan.sql`). |
| 28-sep | motor v3.1 | Neon | Plantilla | Añade 2FA, verificación de correo y `migrate-schema`, traídos de Seven Food Fries/Bokadipan. |

**Consecuencia:** cada mejora vive solo en la copia donde se hizo. El motor tiene fallos que Bokadipan o Seven Food Fries no tienen (el `query` que falta), y al revés. Es exactamente el problema que resuelve la separación motor/marca + sincronización (`docs/ANALISIS_PRODUCTO.md` §3).

## 2. ⚠️ Riesgos en instancias que sí están en producción

A diferencia del motor, estas copias **están desplegadas**. No he hecho ninguna prueba contra producción; solo he leído el código.

| Repo | En producción | Repo público | Endpoints sin protección en el código |
|---|---|---|---|
| `bokadipan-pwa` | Sí | **Sí** | `migrate-schema` con claves fijas `DKITCHEN_MASTER_SECURE_2026` / `DKitchenAdmin2026!` (`api/orders.js:344-345`); `cleanup-simulated` sin login (`api/orders.js:560`); relé de correo `send-transactional-email`; secreto TOTP por defecto (`api/account.js:9`) |
| `seven-food-fries-pwa` | Sí | No | `migrate-schema` con clave fija (`api/orders.js:355`); `cleanup-simulated` sin login (`api/orders.js:570`); relé de correo |
| `wing-boss-pwa` | En Vercel | No | `cleanup-simulated` sin login (`api/orders.js:363`); relé de correo |
| `nestor-pizzas-pwa` | Sí | **Sí** | Arquitectura Supabase distinta: no tiene estos endpoints. Revisar que las políticas RLS de Supabase estén activas (el esquema no está en el repo) |

**Qué permiten:**
- `cleanup-simulated`: que cualquiera cancele pedidos y borre clientes cuyos datos casen con «test», «prueba» o teléfonos `699…`.
- `migrate-schema`: con una clave que está en un repo público, que cualquiera ejecute cambios de esquema y cree una política de inserción abierta.
- El relé de correo: enviar correos con el remitente de la marca a cualquier dirección.

**Por qué importa además la visibilidad:** un repo público expone toda la lógica a cualquiera, y es propiedad del cliente.

No he encontrado credenciales reales en el código. La URL de base de datos del README de Bokadipan es un ejemplo, y el JWT de los tests de Seven Food Fries es falso (`fake-user-999999`).

**Acción recomendada (fuera del alcance de este repo, la decide karc0):** hacer privados los repos públicos y aplicar en cada instancia un parche corto que elimine `migrate-schema` y `cleanup-simulated` y cierre el relé de correo.

## 3. Comparativa de funciones

| Función | Néstor | Seven Food | Wing Boss | Bokadipan | Motor |
|---|:-:|:-:|:-:|:-:|:-:|
| Pago online real (SumUp: checkout + webhook verificado + página de verificación) | ✅ | etiqueta | etiqueta | etiqueta | etiqueta |
| Promociones por día de la semana (modal cliente + kiosko) | ✅ | — | — | — | — |
| Producto «secreto» / cerrado con modal propio | ✅ | — | — | — | — |
| Alérgenos en los datos | parcial | — | — | ✅ (catálogo de respaldo) | — |
| Catálogo de respaldo si falla la API (sin pantalla en blanco) | — | — | — | ✅ `mockCatalog.ts` | — |
| Preloader narrativo de marca (pasos con texto propio) | — | lluvia de patatas | — | ✅ | genérico |
| Logo como componente SVG | — | — | — | ✅ | — |
| Tema oscuro completo con tokens | — | — | ✅ | — | — |
| Fotografía real mapeada a la carta | ✅ | ✅ | ✅ (20 fotos) | ✅ | placeholder |
| Envío gratis por umbral + upsell disparado por producto | — | — | ✅ | — | parcial |
| Impresión ESC/POS (vía puente local `http://localhost:8080/print` → impresora en red `:9100`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Batería de pruebas de seguridad/estrés | — | ✅ `docs/tests/` | — | ✅ (7/7 según su estado) | — |
| Subdominio por cliente bajo `dkitchencorporate.es` | — | — | — | ✅ | — |
| 2FA / verificación de correo | — | ✅ | — | ✅ | ✅ (con fallos) |
| Tests automáticos en CI, zod, TS estricto | — | — | — | — | — |

## 4. Nivel de diseño y pulido de Wing Boss y Bokadipan

- **Bokadipan («obrador rústico»):** paleta verde bosque `#1B3818` + dorado `#C88A35` sobre crema `#F8F4EC`. Preloader con degradado radial, halo cálido y mensajes que cuentan la marca («Encendiendo el horno de piedra…»). Hero editorial a sangre con doble degradado, insignias translúcidas con desenfoque y radios de 2,5 rem. Pastillas de categoría con transiciones `cubic-bezier(0.16,1,0.3,1)`. Tipografía en mayúsculas con tracking amplio.
- **Wing Boss («dark street / smokehouse»):** fondo grafito `#0F0F11`, superficie carbón, rojo carmesí `#E11D48` y dorado mostaza. Fotografía real en todo el catálogo, hero 16:9 y placeholder con silueta de marca.
- **Cómo se consigue hoy:** editando a mano los componentes del motor con colores fijos. Bokadipan tiene **664 clases con HEX fijo** (`bg-[#1B3818]`…) repartidas en 20 componentes modificados (+1.352/−634 líneas respecto al motor). Wing Boss, 60. Por eso cada marca acaba siendo una copia que ya no puede recibir mejoras.

**Implicación para el motor:** el «diseño de autor» debe salir de los componentes y pasar a:
1. **Tokens semánticos ampliados:** superficie, tinta, acentos, degradados, radios, desenfoque, curvas de animación, tracking tipográfico.
2. **Plantillas** basadas en estos dos lenguajes reales, «Obrador» (claro y cálido) y «Street» (oscuro y contrastado), más la neutra.
3. **Huecos** para lo que es pura marca: `Preloader` (con sus mensajes), `Logo`, `Hero`, `Header`, `ProductCard`, `Footer`.

Así Bokadipan o Wing Boss se podrían reconstruir sobre el motor **sin tocar `motor/`**. Es la prueba de aceptación que propongo para la Fase 1B.

## 5. Patrones que el motor debe absorber

| Patrón | Origen | Dónde encaja en el motor |
|---|---|---|
| Cobro online con importe recalculado en servidor, verificación del usuario y webhook que **vuelve a consultar el estado en la pasarela** antes de marcar como pagado | Néstor `api/sumup-create-checkout.js`, `api/sumup-webhook.js`, `src/pages/PaymentVerification.tsx` | Primer adaptador de la capa `PaymentProvider` (1B define la interfaz; la implementación completa va en la fase de pagos) |
| Promociones programadas por día/franja | Néstor `PromoJuevesModal`, `KioskPromoJuevesModal` | Módulo de promociones (generalizar «jueves» a reglas de calendario) |
| Producto oculto / cerrado | Néstor `SecretBurguerClosedModal` | Disponibilidad programada de producto |
| Catálogo de respaldo y precarga resiliente | Bokadipan `mockCatalog.ts`, `catalogPreload.ts` | Caché offline del catálogo (service worker), nunca datos inventados en producción |
| Alérgenos en el modelo de datos | Bokadipan | Fase 1A: columna y tipo de los 14 alérgenos UE desde el primer esquema |
| Preloader narrativo, logo SVG, hero editorial | Bokadipan | Huecos con valores por defecto (1B) |
| Tema oscuro completo por tokens | Wing Boss | Plantilla «Street» (1B) |
| Envío gratis por umbral y upsell por producto | Wing Boss | Reglas de pedido en `marca.config` (validadas en servidor) |
| Impresión ESC/POS mediante puente local | Todos | Primer adaptador de la capa `HardwareAdapter` (impresora en red). Siguientes: Bluetooth/USB por Web Serial/WebUSB, datáfono, cajón, KDS |
| Pruebas de seguridad y estrés | Seven Food Fries, Bokadipan | Base de la suite de la Fase 1C, ejecutadas en CI y contra Postgres local, nunca contra producción |
| Subdominio por cliente | Bokadipan | Paso documentado del alta de marca |

## 6. Cambios que propongo en el plan de la base (1A–1C)

- **1A:** partir de la **API de Wing Boss** (la más limpia: sin `migrate-schema` ni el `query` roto), añadir solo lo bueno de la v3.1 (verificación de correo bien hecha) y alérgenos en el esquema.
- **1B:** tokens ampliados + plantillas «Neutra», «Obrador» y «Street» + huecos. Interfaces `PaymentProvider` y `HardwareAdapter`, con SumUp e impresora en red como primeros adaptadores de referencia. **Prueba de aceptación:** recrear la portada de Bokadipan y Wing Boss solo con `marca/`.
- **1C:** convertir las baterías de pruebas existentes en tests de CI.
- **Base de datos:** solo Neon/Postgres, como prefiere karc0. Néstor (Supabase) seguiría como está hasta una migración futura.
