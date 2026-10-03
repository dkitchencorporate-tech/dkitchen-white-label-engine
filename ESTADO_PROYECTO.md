# ESTADO DEL PROYECTO — DKitchen White-Label Engine

> **Arranque de sesión:** lee SOLO este archivo y continúa desde la entrada más reciente de la §2. Instrucciones permanentes en `ARRANQUE_AGENTE_NUBE.md`.
> **Control de contexto:** statusline en `.claude/settings.json` → `.claude/statusline.cjs` (⚠ a partir de 200k tokens: documentar; ⛔ a partir de 300k: bitácora + `/clear`).
> **Equipo local de karc0** (Celeron N4120, 3,8 GB de RAM): no compilar allí. El agente en la nube sí instala, compila y prueba.

---

## 1. Estado actual real

*Actualizado: 3 de octubre de 2026.*

- **Fase en curso:** base aprobada completa (1A, 1B, 1C y 2 fusionadas; vía de sincronización (a) elegida por karc0). **Fase 3 «prueba de fuego»** en `nube/fase-3-prueba-de-fuego` (PR #6): módulo de tienda en el motor y marca completa `alacena-expres` (dark store gourmet en Madrid). **Pendiente:** las 88 fotos con FLUX, cuando karc0 añada `TOGETHER_API_KEY` o `POLLINATIONS_TOKEN` al entorno (las recoge una sesión nueva).
- **Alcance aprobado (A9–A11):** base pulida 1A + 1B + 1C + 2, con la API reescrita desde cero y solo la plantilla neutra (≈ 51 €).
- **Presupuesto:** 100 € de crédito; ≈ 66 € gastados hasta ahora (estimación).
- **Motor tras la 1A:**
  - API en TypeScript estricto + zod (`api/*.ts`).
  - Migraciones numeradas (`db/migraciones/0001–0003`) con RLS en todas las tablas y precio, opciones, horarios, puntos e idempotencia calculados en SQL.
  - Marca neutra `demo` (`db/semilla/demo.sql`), `crear-admin` sin contraseñas por defecto, servidor local de la API.
  - 18 pruebas de integración en verde contra Postgres real.
- **Motor tras la 1B:**
  - marcas en `brands/<slug>/` (configuración zod validada al compilar, tema, huecos Preloader/Logo/Hero/Pie, recursos y semilla); `BRAND=<slug>` elige la marca;
  - plugin de Vite que inyecta metadatos y tema y genera manifest, iconos, robots y sitemap;
  - Tailwind compilado (sin CDN) y CSP activa;
  - `npm run nueva-marca`;
  - preajustes por tipo de negocio con módulos (domicilio, recogida y kiosko ya conectados);
  - interfaces `ProveedorPago` y `Impresora`/`Datafono`;
  - restos de identidad eliminados;
  - 23 pruebas en verde.
- **Motor tras la 1C:**
  - TypeScript estricto también en el frontend (0 errores); oxlint sin errores (≈ 300 avisos heredados, sobre todo `any` y reglas del compilador de React, a reducir poco a poco);
  - 29 pruebas Vitest (API + lógica del frontend) y 2 de punta a punta con Playwright en móvil (carta → extras → carrito → pedido → panel; credenciales erróneas);
  - CI en GitHub Actions en cada PR con Postgres 16 efímero;
  - las pruebas destaparon y se corrigieron: el total del pedido no se veía en el panel ni en el seguimiento (campos `total_amount`/`discount_applied` antiguos) y la barra del carrito no era un botón accesible.
- **Motor tras la 2 (v1.0.0):**
  - `motor.json` (rutas y versión del motor) y `motor.huellas.json` (SHA-256 por archivo en cada versión publicada);
  - `npm run motor -- version | publicar | verificar | actualizar | crear-cliente`;
  - flujo «Actualizar motor» para repos de cliente (rama `motor/vX.Y.Z` + PR) y comprobación «motor intacto» en su CI;
  - 6 pruebas con repos simulados; medidas: alta de cliente 1,3 s, compilado en ~10 s;
  - informe comparativo en `docs/INFORME_SINCRONIZACION.md`. El paquete npm compila solo con apaños y deja sin resolver la API en Vercel, las migraciones y las pruebas.
- **Motor tras la 3:**
  - migración 0004: zonas de reparto por CP (precio, envío, mínimo y tiempo propios), existencias atómicas sin sobreventa, alcohol (+18 y franja legal), regalo y formato de venta;
  - módulos nuevos `zonas` y `regalos`;
  - selector de zona, panel de zonas y existencias;
  - 53 pruebas Vitest y 3 e2e;
  - estrés: unos 800 pedidos/s por instancia, 0 sobreventas y 0 descuadres (`docs/PRUEBAS_SEGURIDAD_Y_ESTRES.md`).
- **Pendiente para fases siguientes:**
  - 2FA bien hecho con pantalla de código → futuro;
  - fuentes de Google autoalojadas (privacidad) y adaptadores reales de pago y hardware → fases siguientes.
- **Documentos:**
  - `docs/AUDITORIA_MOTOR.md`, `docs/AUDITORIA_VERSIONES_PREVIAS.md`, `docs/ANALISIS_PRODUCTO.md`;
  - `docs/ACTUALIZACIONES_MARCAS.md`, `docs/DESARROLLO_LOCAL.md`, `docs/PLAN_NESTOR_PRELANZAMIENTO.md`.
- **Repos de DKitchen** (Wing Boss, Bokadipan, Seven Food Fries): parches de seguridad fusionados (03-oct). Acceso admin unificado `dkitchen@dkitchencorporate.es`, aplicado en Neon en Wing Boss y Seven Food; **Bokadipan pendiente** de conectar su cuenta de Neon.
- **Néstor Pizzas:** en prelanzamiento, solo frontend (nestor-pizzas-pwa#1 fusionado). **No se toca nada salvo indicación expresa de karc0.** Para el lanzamiento: `PRELAUNCH_ACTIVE = false`.
- **Pendiente de karc0:** revisar y fusionar el PR de la 1A; conectar la cuenta de Neon de Bokadipan.

---

## 2. Bitácora

*(La más reciente arriba; 1–3 líneas por tarea.)*

- **03-oct-2026 · Fase 3 «prueba de fuego».** Módulo de tienda (zonas con precio, existencias, alcohol, regalos), marca `alacena-expres` con 88 productos y 4 zonas de Madrid, pruebas de seguridad (18) y estrés documentadas, e2e de la tienda, `npm audit` a 0. El Flux gratuito sin cuenta ya no existe (solo «sana», de calidad baja), así que las fotos quedan pendientes del token (`scripts/imagenes-marca.ts`). **Siguiente:** fotos y fusión del PR #6.
- **03-oct-2026 · Fase 2.** Prototipo de las dos vías de sincronización. (a) copia + PR implementada (`scripts/motor.ts`, `motor.json`, huellas, flujos de CI) y probada con repos simulados; (b) paquete npm probado con `npm pack` (compila con 3 apaños; quedan abiertas la API en Vercel, las migraciones y las pruebas). Informe y recomendación (a) en `docs/INFORME_SINCRONIZACION.md`. Motor v1.0.0. **Siguiente:** decisión de karc0 y prueba con repos reales de GitHub.
- **03-oct-2026 · Fase 1C.** TS estricto en el frontend, oxlint (TypeScript 7 no tiene API JS para typescript-eslint), pruebas del frontend, Playwright de punta a punta y CI (`.github/workflows/ci.yml`). Corregidos el total invisible en panel/seguimiento y la barra del carrito sin rol de botón. **Siguiente:** Fase 2.
- **03-oct-2026 · Fase 1B.** Separación motor/marca (`brands/demo`, esquema zod, huecos, preajustes), plugin de Vite de marca, Tailwind compilado + CSP, `nueva-marca`, capas de pagos y hardware, limpieza de restos (modales de salsas, geovalla fija en Madrid, claves `sff_`, colores ámbar, textos de otras marcas). Comparación de capturas antes/después sin regresiones (corrige el botón «Añadir» invisible y el diseño de escritorio). **Siguiente:** Fase 1C.
- **03-oct-2026 · Fase 1A.** API reescrita (TS + zod), migraciones 0001–0003 con RLS y lógica en SQL, semilla demo, crear-admin, servidor local, 18 pruebas de integración en verde, frontend adaptado (opciones desde la carta, checkout con hora programada e idempotencia, kiosko marcado como tal). Corregido en revisión: el trigger de perfiles revertía el canje de puntos. **Siguiente:** Fase 1B.
- **03-oct-2026 · Néstor en prelanzamiento.** PR #1 fusionado por encargo de karc0; Vercel lo desplegó en ~40 s. Su service worker no cachea, así que todos los clientes ven la pantalla. Para el lanzamiento: `PRELAUNCH_ACTIVE = false` y desplegar. **Siguiente:** Fase 1A del motor.
- **03-oct-2026 · Fusiones y Néstor.** PR #1 del motor y los 3 PR de seguridad fusionados por encargo de karc0. Néstor: pantalla de prelanzamiento + bloqueo en servidor (trigger) en nestor-pizzas-pwa#1, probada con Playwright y Supabase simulado. **Siguiente:** Fase 1A.
- **03-oct-2026 · Accesos, actualizaciones por marca y plan de Néstor.** Login de admin reparado en los PR de Seven Food y Bokadipan (el desvío de superadmin/2FA bloqueaba el panel); contraseñas nuevas aplicadas en Neon (Wing Boss, Seven Food). `docs/ACTUALIZACIONES_MARCAS.md` y `docs/PLAN_NESTOR_PRELANZAMIENTO.md`. Fusión del PR #1 por encargo de karc0. **Siguiente:** Fase 1A.
- **03-oct-2026 · Parches de seguridad en repos de DKitchen.** cleanup-simulated solo admin, fuera migrate-schema, 2FA sin claves ni PIN maestro, relé de correo cerrado. PR: bokadipan-pwa#1, seven-food-fries-pwa#2, wing-boss-pwa#1. Néstor excluido. **Siguiente:** que karc0 fusione y empezar la Fase 1A.
- **03-oct-2026 · Auditoría de versiones anteriores.** Leídos en solo lectura Wing Boss, Bokadipan, Seven Food Fries, Néstor y la plantilla de pizzerías: genealogía, riesgos en producción, comparativa, nivel de diseño y patrones a heredar → `docs/AUDITORIA_VERSIONES_PREVIAS.md`. **Siguiente:** decisiones de karc0 y Fase 1A partiendo de la API de Wing Boss.
- **03-oct-2026 · Alcance.** karc0 aprueba solo la base pulida (A9) y precisa la visión: PWA hiperoptimizada, pasarela de pago propia, hardware del negocio, personalización absoluta. **Siguiente:** auditar en solo lectura los repos de versiones anteriores que pase karc0.
- **03-oct-2026 · Fase A · Análisis de producto.** Decisiones con karc0 (repo por cliente, prototipar copia+PR vs. paquete npm, constructor guiado + editor en vivo en Estudio y admin, 4 verticales, tokens+plantillas+huecos, base sólida primero). `docs/ANALISIS_PRODUCTO.md` y coste en la statusline, en el PR #1. **Siguiente:** que karc0 elija el alcance y empezar la Fase 1A.
- **03-oct-2026 · Fase 0 · Auditoría.** Auditoría completa sin tocar código de la aplicación: `docs/AUDITORIA_MOTOR.md`, statusline (`.claude/`), este archivo reestructurado. PR #1 desde `nube/fase-0-auditoria`. **Siguiente:** esperar aprobación; si se aprueba la Fase 0.5, empezar por S1–S5 y el import `query` (rama `nube/fase-0-5-parches-criticos`).
- **28-sep-2026 · v3.1.0** (histórico previo). Publicación del repositorio en GitHub, renombrado del template de pizzerías a `template-pwa-pizzerias`, 2FA TOTP y verificación de email en el motor.
- **26-sep-2026 · v3.0.0** (histórico previo). Saneamiento: binarios residuales, tokens, paleta neutra y tokenización de Tailwind con variables CSS.
- **25-sep-2026 · v2.0.0** (histórico previo). Desacoplamiento de la arquitectura v3.0 a partir de la PWA de Seven Food Fries.

---

## 3. Decisiones

- **03-oct-2026 · El precio de zona se aplica solo a domicilio y se redondea por unidad a céntimos, igual en SQL que en el navegador.** *Porqué:* el cliente ve exactamente lo que pagará; el servidor sigue siendo quien decide.
- **03-oct-2026 · Las fotos de producto se generan con FLUX mediante token (Together AI o Pollinations), nunca con el modelo anónimo.** *Porqué:* el nivel sin cuenta ya no sirve Flux y su calidad no es de entrega (decisión de karc0).
- **03-oct-2026 · El motor se versiona por su cuenta desde la v1.0.0** (`motor.json`, sincronizado con `package.json`). *Porqué:* la API reescrita rompe la compatibilidad con las versiones 2.x/3.x anteriores, y los clientes necesitan un número claro con el que pedir actualizaciones.
- **03-oct-2026 · Lo que es del motor lo define una lista explícita de rutas; todo lo demás es del cliente.** *Porqué:* así los archivos internos del padre (estado, arranque del agente, `.claude/`) nunca llegan a un cliente, y lo que el cliente añada fuera del motor no se pisa jamás.
- **03-oct-2026 · oxlint en lugar de ESLint + typescript-eslint.** *Porqué:* el proyecto usa TypeScript 7 (nativo), que no expone la API de JavaScript que necesita typescript-eslint; oxlint es nativo, rápido y no depende de ella. Las reglas de corrección bloquean; las de estilo y del compilador de React avisan.
- **03-oct-2026 · El frontend usa los nombres de la API nueva** (`total`, `discount`) en lugar de adaptarlos en el servidor. *Porqué:* un único contrato de datos, sin alias que mantener.
- **03-oct-2026 · Marcas en `brands/<slug>/`, y el código del motor sigue en `src/`, `api/`, `db/` y `scripts/`.** *Porqué:* cumple el «toda la identidad sale de brands/<slug>» del arranque sin reubicar todo el código. La separación física `motor/` se decidirá con el prototipo de sincronización (Fase 2).
- **03-oct-2026 · Tailwind 3.4.17 compilado en el build** (se retira Tailwind 4, que no se estaba usando). *Porqué:* misma versión que la CDN, sin regresiones visuales. Permite CSP, rendimiento y privacidad.
- **03-oct-2026 · La configuración de marca se valida al compilar y llega al navegador ya validada (módulo virtual).** *Porqué:* zod no viaja al cliente (−90 kB).
- **03-oct-2026 · Fuera la geovalla del navegador** (distancia a la Puerta del Sol). *Porqué:* era un resto de otra marca que rechazaba clientes válidos y pedía la ubicación sin necesidad; la zona de reparto la valida el servidor por código postal.

- **03-oct-2026 · Diseño de la API 1A.** Lógica de negocio en funciones SQL `SECURITY DEFINER` (precio, opciones, horarios, puntos, idempotencia). La API (rol `motor_app`) solo valida forma y fija `app.user_id`. RLS en todas las tablas. Revocación de tokens con `token_version`. Rate limit en tabla compartida. *Porqué:* la regla de oro (precio en servidor) queda garantizada aunque falle la API, y cada clon hereda la seguridad sin configurarla.
- **03-oct-2026 · Retirados** `migrate-schema`, `cleanup-simulated`, `delete-test-data`, `verify-2fa` y `send-transactional-email`. *Porqué:* eran puertas abiertas. Los correos los envía ahora el servidor; las migraciones van por script; la «purga de pruebas» borraba por patrones de nombre (podía borrar pedidos reales) y se sustituye por el borrado individual del panel; el 2FA volverá con pantalla de código.

- **03-oct-2026 · A10 plantilla solo neutra en la base; A11 API reescrita desde cero** (TypeScript + zod). *Porqué:* karc0 prioriza una base impecable; Obrador/Street quedan como plantillas futuras. Coste de la base ≈ 51 €.
- **03-oct-2026 · Néstor Pizzas es intocable sin plan aprobado.** *Porqué:* es el único cliente real y está recibiendo pedidos; hay riesgo de mezclar contextos entre proyectos.

- **03-oct-2026 · A9: alcance = base pulida (1A+1B+1C+2).** *Porqué:* priorizar una base impecable y documentar el camino hasta el producto final dentro de los 100 €. Pagos y hardware se diseñan como puntos de extensión desde la 1B.

- **03-oct-2026 · Decisiones A1–A8** (detalle en `docs/ANALISIS_PRODUCTO.md` §2). *Porqué:* cada PWA es propiedad del cliente y se le puede entregar, pero debe seguir recibiendo mejoras del motor; el diseño de autor no puede romper la sincronización.
- **03-oct-2026 · Preguntas con recomendación interactiva** para toda decisión, y gasto del crédito al final de cada respuesta. *Porqué:* lo pidió karc0 para decidir con fluidez y controlar los 100 €.

- **03-oct-2026 · Memoria del proyecto en este archivo.** Estructura §1 estado (se sobrescribe) / §2 bitácora / §3 decisiones, según `ARRANQUE_AGENTE_NUBE.md` §1. *Porqué:* que cada sesión nueva arranque leyendo un único archivo.
- **03-oct-2026 · Statusline con umbrales absolutos** (200k/300k) calculados con `context_window.used_percentage × context_window_size` o, si falta, `current_usage`. *Porqué:* el porcentaje engaña con ventanas de contexto grandes; lo que importa es el volumen absoluto.
- **03-oct-2026 · Propuesta de Fase 0.5 antes de la Fase 1** (pendiente de aprobación). *Porqué:* hay fallos de seguridad críticos explotables y el checkout está roto; neutralizar la marca sobre una base rota multiplicaría el riesgo en cada clon.
- **03-oct-2026 · Estimación de coste en sesiones y millones de tokens.** *Porqué:* es lo que se puede medir desde el agente; karc0 lo convierte a euros según su plan.
