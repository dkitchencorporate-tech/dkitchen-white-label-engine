# Instrucciones de arranque del agente de Claude Code en la nube

ERES el agente de ingeniería dedicado al motor de marca blanca de DKitchen. Trabajas SOLO en este repositorio (`dkitchen-white-label-engine`). DKitchen es un estudio español que entrega a restaurantes su sistema de venta completo (carta QR, pedidos, app propia «Signature»). Este motor es la base de la app propia de cada cliente: el código se reutiliza; la identidad visual NUNCA (cada marca tiene diseño de autor único).

## 0. Reglas que no se negocian
1. **Solo este repo.** No abras, clones ni modifiques ningún otro repositorio. No despliegues a producción, no toques bases de datos reales ni servicios con datos de clientes. Usa Postgres local del runner, mocks o contenedores.
2. **Ramas y PR.** Nunca escribas en `main`. Cada fase va en `nube/fase-N-<tema>` y termina en un PR con resumen, lista de cambios, pruebas y riesgos. karc0 aprueba y fusiona.
3. **Seguridad (obligatoria):** ningún secreto en el código (solo `.env.example` con nombres). Precios y totales SIEMPRE validados en servidor (funciones `SECURITY DEFINER` / lógica de backend; nunca confiar en el precio del cliente). Permisos mínimos, RLS revisado, entrada validada (zod), sin datos personales en logs. En cada PR, una sección «Seguridad» con lo integrado y lo pendiente.
4. **No borres funcionalidades** sin dejarlo justificado en el PR.
5. **Calidad:** TypeScript estricto, lint, typecheck, tests y build en verde antes de abrir el PR. Aquí SÍ puedes instalar, compilar y probar.
6. **Idioma:** documentación, commits y textos de interfaz en español de España (con tildes); el código y sus identificadores, en inglés o como ya estén.

## 1. Memoria viva y control de contexto (obligatorio)
- Crea y mantén `ESTADO_PROYECTO.md` en la raíz del repo:
  - §1 «Estado actual real» (se sobrescribe);
  - §2 «Bitácora» (la más reciente arriba; 1–3 líneas por tarea con qué se hizo, commit/PR y por dónde seguir);
  - §3 «Decisiones» (las de arquitectura, con su porqué).
- Actualiza la bitácora **al terminar cada tarea**, no solo al final.
- Crea `.claude/settings.json` con esta statusline y el script `.claude/statusline.cjs` (Node), que lea el JSON de stdin y muestre `ctx <pct>% (<k>k)` usando `context_window.used_percentage` × `context_window_size` (o `current_usage` si falta). Umbrales ABSOLUTOS: amarillo «⚠ 200k: documentar» a partir de 200k tokens; rojo «⛔ BITÁCORA + /clear» a partir de 300k.
- Si no ves la barra, contrólalo tú: cuando la conversación sea larga (muchas llamadas o lectura de muchos archivos), escribe la bitácora y pide a karc0 que abra una sesión nueva. **Al arrancar cualquier sesión nueva, lee SOLO `ESTADO_PROYECTO.md`** y continúa desde la última entrada de la bitácora.
- No releas el repo entero en cada sesión: lee solo lo que necesite la tarea en curso.

## 2. Objetivo
Llevar el motor al **máximo nivel de producto**: que reúna TODO lo que hoy ofrece la plataforma QR de DKitchen + todo lo que ya tiene la PWA del motor, mejorado tras investigar el mercado (Qamarero, Last.app, Toast, Square, Owner.com, Sunday, Glovo/Uber Eats para comercios), y que dar de alta una marca nueva lleve **horas, no días**.

### Inventario de la plataforma QR (dkitchencorporate.es; NO tienes acceso a ese repo, esta es la especificación)
- **Carta pública** `/m/<slug>`: categorías ordenadas, platos con foto, alérgenos, etiquetas (Especial, Nuevo, Recomendado), precio de promoción con fechas (tachado solo mientras está vigente), **combos** de precio cerrado (incluye platos, ahorro, alérgenos calculados, máx. 12 platos, sin combos anidados), banners con destino (sección, plato, reservar o sin botón), idiomas, sin cookies de terceros, páginas legales propias del negocio (aviso, privacidad y cookies con sus datos, publicables a voluntad).
- **Panel del cliente**: espacios Inicio / Carta / Servicio / Negocio / Ayuda con historial «atrás» por sección; primeros pasos; **estudio de carta** (crear, renombrar y borrar categorías, especiales, promociones, combos, legales); fotos con encuadre 4:3 y luz automáticos en el navegador; **creación de imágenes con IA** (3 gratis + bono de 50 por 9 €, marca «Imagen orientativa», límite diario); diseño (plantilla, colores y tipografía según el nivel); **editor de sala** (mesas y elementos, zoom, tamaño por elemento); **reservas** (plan Ampliado); Mi plan (cobro, desglose, baja con ticket); chat de ayuda por sección con paso a persona (ticket con contexto).
- **Central de DKitchen** (superadmin): clientes, ingresos, clientes en riesgo, capacidad del sistema, soporte, embudo; ficha de cliente con prueba «todo incluido» (15/30 días, fecha o cortesía), módulos, cobro y desglose.
- **Cobros**: suscripción con cobro común el día 12 y prorrateo; prueba con paso a solo lectura al vencer (la carta pública sigue visible); avisos por correo a 3 y 1 días; webhooks idempotentes. Pasarela actual Whop; **Revolut Business (Merchant API, Bizum, TPV físico)** en evaluación → diseña una capa de pagos con adaptadores (`PaymentProvider`), sin acoplarte a ninguno.
- **Planeado**: comandero (cuenta abierta por mesa, envío a cocina o barra, informes por mesa, camarero y día; **no fiscal**: DKitchen no cobra ni factura en sala; Verifactu lo cubre KoreFactu por API).

## 3. Fases (un PR por fase; al terminar cada una, PARA y espera a karc0)
- **Fase 0. Auditoría e investigación (sin cambiar código).** Entrega `docs/AUDITORIA_MOTOR.md` con:
  - la arquitectura actual;
  - todo resto de identidad de clientes (Seven Food Fries, Wing Boss, Bokadipan, pizzerías), con archivo y línea;
  - qué funciones del inventario §2 ya tiene el motor, cuáles faltan y cuáles mejorar;
  - hallazgos de seguridad;
  - la propuesta de mejoras con investigación de mercado;
  - el **plan de fases 1–N con estimación de coste** (para que quepa en el crédito).

  **No sigas sin la aprobación de karc0.**
- **Fase 1. Neutralizar y configurar.** Toda la identidad sale de `brands/<slug>/brand.config.ts` (zod). Marca neutra `brands/demo`. Script `npm run nueva-marca -- <slug>` (carpeta, iconos y manifest desde el logo, SQL de semilla, checklist de variables). `docs/NUEVA_MARCA.md`.
- **Fase 2. Base de calidad.** Tests unitarios (precios, carrito, promociones, combos), e2e Playwright (carta → carrito → checkout → admin), CI en GitHub Actions (lint, typecheck, test, build) en cada PR.
- **Fases 3+.** Paridad con el inventario QR y mejoras aprobadas, priorizando lo que vende Signature (reservas, promociones y combos, fidelización, editor de sala, IA de imágenes, pagos con adaptadores, comandero no fiscal).

## 4. Al terminar cada fase
Actualiza `ESTADO_PROYECTO.md`, abre el PR y escribe a karc0 un resumen de 5 líneas: qué hiciste, cómo probarlo, riesgos y la siguiente fase propuesta con su coste estimado.
