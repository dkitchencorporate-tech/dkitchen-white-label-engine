# ESTADO DEL PROYECTO — DKitchen White-Label Engine

> **Arranque de sesión:** lee SOLO este archivo y continúa desde la entrada más reciente de la §2. Instrucciones permanentes en `ARRANQUE_AGENTE_NUBE.md`.
> **Control de contexto:** statusline en `.claude/settings.json` → `.claude/statusline.cjs` (⚠ a partir de 200k tokens: documentar; ⛔ a partir de 300k: bitácora + `/clear`).
> **Equipo local de karc0** (Celeron N4120, 3,8 GB de RAM): no compilar allí. El agente en la nube sí instala, compila y prueba.

---

## 1. Estado actual real

*Actualizado: 3 de octubre de 2026.*

- **Fase en curso:** **Fase 1A terminada** en la rama `nube/fase-1a-reparar-plantilla` (PR pendiente de revisión de karc0). Siguiente: Fase 1B (motor/marca).
- **Alcance aprobado (A9–A11):** base pulida 1A + 1B + 1C + 2, con la API reescrita desde cero y solo la plantilla neutra (≈ 51 €).
- **Presupuesto:** 100 € de crédito; ≈ 28 € gastados hasta ahora (estimación).
- **Motor tras la 1A:**
  - API en TypeScript estricto + zod (`api/*.ts`).
  - Migraciones numeradas (`db/migraciones/0001–0003`) con RLS en todas las tablas y precio, opciones, horarios, puntos e idempotencia calculados en SQL.
  - Marca neutra `demo` (`db/semilla/demo.sql`), `crear-admin` sin contraseñas por defecto, servidor local de la API.
  - 18 pruebas de integración en verde contra Postgres real.
- **Pendiente de la 1A para fases siguientes:**
  - 12 errores de tipos antiguos del frontend → 1C;
  - restos de identidad (SauceModal, robots/sitemap, colores fijos) → 1B;
  - 2FA bien hecho con pantalla de código → futuro;
  - CSP → 1B (cuando se quite el Tailwind por CDN).
- **Documentos:**
  - `docs/AUDITORIA_MOTOR.md`, `docs/AUDITORIA_VERSIONES_PREVIAS.md`, `docs/ANALISIS_PRODUCTO.md`;
  - `docs/ACTUALIZACIONES_MARCAS.md`, `docs/DESARROLLO_LOCAL.md`, `docs/PLAN_NESTOR_PRELANZAMIENTO.md`.
- **Repos de DKitchen** (Wing Boss, Bokadipan, Seven Food Fries): parches de seguridad fusionados (03-oct). Acceso admin unificado `dkitchen@dkitchencorporate.es`, aplicado en Neon en Wing Boss y Seven Food; **Bokadipan pendiente** de conectar su cuenta de Neon.
- **Néstor Pizzas:** en prelanzamiento, solo frontend (nestor-pizzas-pwa#1 fusionado). **No se toca nada salvo indicación expresa de karc0.** Para el lanzamiento: `PRELAUNCH_ACTIVE = false`.
- **Pendiente de karc0:** revisar y fusionar el PR de la 1A; conectar la cuenta de Neon de Bokadipan.

---

## 2. Bitácora

*(La más reciente arriba; 1–3 líneas por tarea.)*

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
