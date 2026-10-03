# ESTADO DEL PROYECTO — DKitchen White-Label Engine

> **Arranque de sesión:** lee SOLO este archivo y continúa desde la entrada más reciente de la §2. Instrucciones permanentes en `ARRANQUE_AGENTE_NUBE.md`.
> **Control de contexto:** statusline en `.claude/settings.json` → `.claude/statusline.cjs` (⚠ a partir de 200k tokens: documentar; ⛔ a partir de 300k: bitácora + `/clear`).
> **Equipo local de karc0** (Celeron N4120, 3,8 GB de RAM): no compilar allí. El agente en la nube sí instala, compila y prueba.

---

## 1. Estado actual real

*Actualizado: 3 de octubre de 2026.*

- **Fase en curso:** Fase 0 (auditoría) **entregada** en el PR desde `nube/fase-0-auditoria`. **A la espera de la aprobación de karc0** para empezar la siguiente (propuesta: Fase 0.5, parches críticos).
- **Informe:** `docs/AUDITORIA_MOTOR.md` (arquitectura, restos de identidad, paridad con la plataforma QR, seguridad, mercado, plan de fases con coste).
- **Situación del código en `main`:**
  - `api/account.js` y `api/orders.js` **no cargan** (importan `query`, que `api/_lib/db.js` no exporta) → login, registro y checkout dan 500.
  - El checkout fallaría igualmente: el frontend envía `product_id` y `process_checkout` lee `productId`.
  - El esquema no tiene RLS y le faltan funciones que la API llama.
  - Seguridad crítica: secreto TOTP y contraseñas maestras en el código, `verify-2fa` sin paso de contraseña, `migrate-schema` y `cleanup-simulated` públicos (ver §4 del informe).
  - `vite build` pasa; `tsc` da 14 errores; sin tests, sin lint, sin CI.
- **Identidad:** `src/config/brandConfig.ts` (sin validación) + restos de Seven Food Fries y D-Kitchen listados en el informe §2.
- **Decisiones pendientes de karc0:** D1–D5 en `docs/AUDITORIA_MOTOR.md` §6.

---

## 2. Bitácora

*(La más reciente arriba; 1–3 líneas por tarea.)*

- **03-oct-2026 · Fase 0 · Auditoría.** Auditoría completa sin tocar código de la aplicación: `docs/AUDITORIA_MOTOR.md`, statusline (`.claude/`), este archivo reestructurado. PR desde `nube/fase-0-auditoria`. **Siguiente:** esperar aprobación; si se aprueba la Fase 0.5, empezar por S1–S5 y el import `query` (rama `nube/fase-0-5-parches-criticos`).
- **28-sep-2026 · v3.1.0** (histórico previo). Publicación del repositorio en GitHub, renombrado del template de pizzerías a `template-pwa-pizzerias`, 2FA TOTP y verificación de email en el motor.
- **26-sep-2026 · v3.0.0** (histórico previo). Saneamiento: binarios residuales, tokens, paleta neutra y tokenización de Tailwind con variables CSS.
- **25-sep-2026 · v2.0.0** (histórico previo). Desacoplamiento de la arquitectura v3.0 a partir de la PWA de Seven Food Fries.

---

## 3. Decisiones

- **03-oct-2026 · Memoria del proyecto en este archivo.** Estructura §1 estado (se sobrescribe) / §2 bitácora / §3 decisiones, según `ARRANQUE_AGENTE_NUBE.md` §1. *Porqué:* que cada sesión nueva arranque leyendo un único archivo.
- **03-oct-2026 · Statusline con umbrales absolutos** (200k/300k) calculados con `context_window.used_percentage × context_window_size` o, si falta, `current_usage`. *Porqué:* el porcentaje engaña con ventanas de contexto grandes; lo que importa es el volumen absoluto.
- **03-oct-2026 · Propuesta de Fase 0.5 antes de la Fase 1** (pendiente de aprobación). *Porqué:* hay fallos de seguridad críticos explotables y el checkout está roto; neutralizar la marca sobre una base rota multiplicaría el riesgo en cada clon.
- **03-oct-2026 · Estimación de coste en sesiones y millones de tokens.** *Porqué:* es lo que se puede medir desde el agente; karc0 lo convierte a euros según su plan.
