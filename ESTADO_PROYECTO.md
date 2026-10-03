# ESTADO DEL PROYECTO — DKitchen White-Label Engine

> **Arranque de sesión:** lee SOLO este archivo y continúa desde la entrada más reciente de la §2. Instrucciones permanentes en `ARRANQUE_AGENTE_NUBE.md`.
> **Control de contexto:** statusline en `.claude/settings.json` → `.claude/statusline.cjs` (⚠ a partir de 200k tokens: documentar; ⛔ a partir de 300k: bitácora + `/clear`).
> **Equipo local de karc0** (Celeron N4120, 3,8 GB de RAM): no compilar allí. El agente en la nube sí instala, compila y prueba.

---

## 1. Estado actual real

*Actualizado: 3 de octubre de 2026.*

- **Fase en curso:** Fase 0 + Fase A **fusionadas** (PR #1). **Fase 1A arrancando** en `nube/fase-1a-reparar-plantilla`. **Alcance aprobado: solo la base pulida (1A+1B+1C+2, ≈ 43 €).** Auditoría de versiones anteriores hecha (`docs/AUDITORIA_VERSIONES_PREVIAS.md`). Base ampliada a ≈ 51 € (API reescrita desde cero). Siguiente: que karc0 fusione el PR #1 y empezar la Fase 1A.
- **Análisis:** `docs/ANALISIS_PRODUCTO.md` (decisiones A1–A8, arquitectura motor/marca, constructor, sincronización, plan con coste en €).
- **Presupuesto:** 100 € de crédito; ≈ 17 € gastados hasta ahora (estimación). La statusline muestra `€/100€` cuando el entorno informa del coste.
- **Informe:** `docs/AUDITORIA_MOTOR.md` (arquitectura, restos de identidad, paridad con la plataforma QR, seguridad, mercado, plan de fases con coste).
- **Situación del código en `main`:**
  - `api/account.js` y `api/orders.js` **no cargan** (importan `query`, que `api/_lib/db.js` no exporta) → login, registro y checkout dan 500.
  - El checkout fallaría igualmente: el frontend envía `product_id` y `process_checkout` lee `productId`.
  - El esquema no tiene RLS y le faltan funciones que la API llama.
  - Seguridad crítica: secreto TOTP y contraseñas maestras en el código, `verify-2fa` sin paso de contraseña, `migrate-schema` y `cleanup-simulated` públicos (ver §4 del informe).
  - `vite build` pasa; `tsc` da 14 errores; sin tests, sin lint, sin CI.
- **Identidad:** `src/config/brandConfig.ts` (sin validación) + restos de Seven Food Fries y D-Kitchen listados en el informe §2.
- **Contexto:** el motor no está desplegado; los fallos de la auditoría son defectos de plantilla que heredaría cada clon.
- **Repos de DKitchen parcheados y FUSIONADOS** (03-oct): bokadipan-pwa#1, seven-food-fries-pwa#2, wing-boss-pwa#1.
- **Néstor Pizzas** (cliente real): plan de prelanzamiento aprobado y ejecutado en **nestor-pizzas-pwa#1** (abierto). karc0 debe: 1) ejecutar `docs/sql/launch_lock.sql` en Supabase; 2) fusionar. Kiosko de admin permitido durante el bloqueo. Cualquier otro cambio en Néstor requiere plan aprobado.
- **Accesos demos (03-oct):** admin único `dkitchen@dkitchencorporate.es` con contraseña propia por marca (entregadas a karc0 en el chat, nunca en el repo). Aplicado en Neon: Wing Boss y Seven Food Fries (resto de admins → usuario normal). Bokadipan pendiente de conectar su cuenta de Neon. Seven Food y Bokadipan necesitan fusionar su PR de seguridad para que el login de admin funcione.
- **Documentos nuevos:** `docs/ACTUALIZACIONES_MARCAS.md` (qué hacer en cada marca tras el pulido) y `docs/PLAN_NESTOR_PRELANZAMIENTO.md` (pendiente de aprobación).
- **Pendiente de karc0:** SQL + fusión de nestor-pizzas-pwa#1; conectar la cuenta de Neon de Bokadipan (para aplicar su contraseña); abrir sesión aparte para el análisis de Néstor (solo lectura, plan a aprobar). La Fase 1A arranca en cuanto se fusione el PR #1 (rama `nube/fase-1a-reparar-plantilla`).

---

## 2. Bitácora

*(La más reciente arriba; 1–3 líneas por tarea.)*

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

- **03-oct-2026 · A10 plantilla solo neutra en la base; A11 API reescrita desde cero** (TypeScript + zod). *Porqué:* karc0 prioriza una base impecable; Obrador/Street quedan como plantillas futuras. Coste de la base ≈ 51 €.
- **03-oct-2026 · Néstor Pizzas es intocable sin plan aprobado.** *Porqué:* es el único cliente real y está recibiendo pedidos; hay riesgo de mezclar contextos entre proyectos.

- **03-oct-2026 · A9: alcance = base pulida (1A+1B+1C+2).** *Porqué:* priorizar una base impecable y documentar el camino hasta el producto final dentro de los 100 €. Pagos y hardware se diseñan como puntos de extensión desde la 1B.

- **03-oct-2026 · Decisiones A1–A8** (detalle en `docs/ANALISIS_PRODUCTO.md` §2). *Porqué:* cada PWA es propiedad del cliente y se le puede entregar, pero debe seguir recibiendo mejoras del motor; el diseño de autor no puede romper la sincronización.
- **03-oct-2026 · Preguntas con recomendación interactiva** para toda decisión, y gasto del crédito al final de cada respuesta. *Porqué:* lo pidió karc0 para decidir con fluidez y controlar los 100 €.

- **03-oct-2026 · Memoria del proyecto en este archivo.** Estructura §1 estado (se sobrescribe) / §2 bitácora / §3 decisiones, según `ARRANQUE_AGENTE_NUBE.md` §1. *Porqué:* que cada sesión nueva arranque leyendo un único archivo.
- **03-oct-2026 · Statusline con umbrales absolutos** (200k/300k) calculados con `context_window.used_percentage × context_window_size` o, si falta, `current_usage`. *Porqué:* el porcentaje engaña con ventanas de contexto grandes; lo que importa es el volumen absoluto.
- **03-oct-2026 · Propuesta de Fase 0.5 antes de la Fase 1** (pendiente de aprobación). *Porqué:* hay fallos de seguridad críticos explotables y el checkout está roto; neutralizar la marca sobre una base rota multiplicaría el riesgo en cada clon.
- **03-oct-2026 · Estimación de coste en sesiones y millones de tokens.** *Porqué:* es lo que se puede medir desde el agente; karc0 lo convierte a euros según su plan.
