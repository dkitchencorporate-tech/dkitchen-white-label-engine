# Análisis de producto y arquitectura — Fase A

> Fecha: 3 de octubre de 2026 · Complementa `docs/AUDITORIA_MOTOR.md`. Recoge las decisiones de karc0 y recalcula el plan.
> **Contexto aclarado:** el motor no está desplegado. Los fallos de la auditoría son **defectos de plantilla**: no exponen datos, pero los heredaría cada PWA clonada. Por eso se corrigen antes de replicar.

---

## 1. Objetivo

1. **Replicar rápido.** Una PWA nueva para cualquier negocio de hostelería (restaurante, bar, dark kitchen, dark store) en horas, no días.
2. **Constructor en vivo.** Montar y ajustar la PWA desde un frontend, con el resultado visible en tiempo real.
3. **Paridad QR completa y pulida.** El admin y la app del cliente incluyen todos los módulos del inventario QR (`ARRANQUE_AGENTE_NUBE.md` §2), con calidad de producto.
4. **Propiedad del cliente.** Cada PWA es un repositorio propio que se le puede entregar, pero sigue recibiendo de forma controlada las mejoras del motor.

## 2. Decisiones tomadas

| # | Decisión | Elección de karc0 | Consecuencia |
|---|---|---|---|
| A1 | Modelo de replicación | **Un repositorio por cliente**, con actualizaciones desde el repo padre sin romper los demás | Separación estricta motor/marca y versionado del motor. |
| A2 | Cómo llegan las actualizaciones | **Prototipar dos vías y decidir**: (a) copia completa + PR desde rama `motor/vX.Y.Z`; (b) motor como paquete npm privado | Fase 2: prueba de concepto con informe comparativo. |
| A3 | Constructor, primera versión | **Recorrido guiado + editor visual con vista previa en directo** | El recorrido rellena lo esencial y el editor afina con la PWA real al lado. |
| A4 | Tipos de negocio con preajuste | **Restaurante con sala, bar/cafetería, dark kitchen, dark store** | Sistema de módulos activables por preajuste. La dark store exige un módulo de inventario nuevo. |
| A5 | Orden | **Base sólida → constructor → módulos QR** | Nada se construye sobre la base rota. |
| A6 | Libertad del diseño de autor | **Tokens + plantillas + huecos** | Diseño único por marca sin conflictos con las actualizaciones. |
| A7 | Dónde vive el constructor | **Ambos**: «Estudio» interno de DKitchen para crear marcas + editor reducido en el admin de cada cliente según su plan | Un único motor de edición reutilizado en dos sitios. |
| A8 | PR #1 | **Ampliarlo** con este análisis | Este documento va en el mismo PR. |

## 3. Arquitectura propuesta

### 3.1 Separación motor / marca (requisito de A1, A2 y A6)

```
repo (padre o cliente)
├─ motor/                    ← solo lo cambia el motor (bloqueado por CI en repos de cliente)
│  ├─ app/                   PWA del comensal (carta, carrito, pedido, cuenta, reservas…)
│  ├─ admin/                 Panel del negocio (espacios Inicio/Carta/Servicio/Negocio/Ayuda)
│  ├─ estudio/               Motor de edición en vivo (lo usan Estudio y el admin)
│  ├─ modulos/               Un directorio por módulo: carta, combos, promociones, reservas, sala,
│  │                         comandero, fidelización, pagos, inventario, legales, IA-imágenes…
│  ├─ api/                   Endpoints (zod en toda entrada, precio siempre en servidor)
│  ├─ db/migraciones/        SQL numerado e idempotente (0001_base.sql, 0002_combos.sql…)
│  └─ diseno/                Sistema de tokens, plantillas y registro de huecos
├─ marca/                    ← propiedad del cliente; la sincronización nunca lo toca
│  ├─ marca.config.ts        Identidad, módulos activos, preajuste, tarifas, legales (validado con zod)
│  ├─ tema.ts                Tokens de diseño de autor
│  ├─ huecos/                Componentes propios (portada, cabecera, ficha de plato, pie…)
│  ├─ recursos/              Logo, iconos, imágenes
│  └─ semilla/               Carta y datos iniciales
└─ motor.version             Versión del motor instalada (p. ej. 1.4.0)
```

**Contrato:** el motor solo lee `marca/` a través de la configuración validada y del registro de huecos. Un hueco que la marca no rellena usa el componente por defecto de la plantilla.

### 3.2 Diseño de autor: tokens + plantillas + huecos

- **Tokens:** colores (con contraste AA comprobado), tipografías autoalojadas, radios, sombras, densidad, movimiento.
- **Plantillas:** 3–4 estructuras de partida (p. ej. «editorial», «compacta», «visual», «tienda») que cambian composición, no solo color.
- **Huecos:** puntos de extensión con tipos definidos. Cada marca puede sustituir un hueco por un componente propio sin tocar `motor/`.

### 3.3 Módulos y preajustes por tipo de negocio

Cada módulo declara sus tablas/migraciones, rutas de app y admin, permisos y ajustes. El preajuste solo decide qué módulos se activan por defecto.

| Módulo | Restaurante | Bar | Dark kitchen | Dark store |
|---|:-:|:-:|:-:|:-:|
| Carta pública + alérgenos + etiquetas + idiomas | ✅ | ✅ | ✅ | ✅ (catálogo) |
| Promociones con fechas · combos · banners | ✅ | ✅ | ✅ | ✅ |
| Pedido a domicilio / recogida | opcional | opcional | ✅ | ✅ |
| Pedido en mesa (QR por mesa) | ✅ | ✅ | — | — |
| Reservas | ✅ | opcional | — | — |
| Editor de sala | ✅ | ✅ | — | — |
| Comandero no fiscal (cocina/barra) | ✅ | ✅ | opcional | — |
| Varias marcas virtuales en una cocina | — | — | ✅ | — |
| Inventario, variantes y unidades | — | — | opcional | ✅ |
| Fidelización y campañas | ✅ | ✅ | ✅ | ✅ |
| Pagos (capa `PaymentProvider`) | ✅ | ✅ | ✅ | ✅ |
| Legales del negocio | ✅ | ✅ | ✅ | ✅ |
| IA de imágenes, fotos 4:3 automáticas | ✅ | ✅ | ✅ | ✅ |

### 3.4 Constructor en vivo (A3 + A7)

- **Un único motor de edición** (`motor/estudio/`): la vista previa es la PWA real, que lee la configuración desde el estado del editor en lugar del archivo, así que cada cambio se ve al instante.
- **Estudio (DKitchen):** recorrido guiado (tipo de negocio → identidad → plantilla → carta → módulos → legales) y después editor libre. Al publicar genera la carpeta `marca/` y la semilla y, cuando se apruebe la automatización, crea el repositorio del cliente y su despliegue de prueba.
- **Admin del cliente:** el mismo editor, limitado por su plan (colores y tipografía en el básico, plantilla y huecos en niveles superiores), como «Diseño según el nivel» del inventario QR.

### 3.5 Sincronización padre → clientes (A2, se decide tras el prototipo)

| | (a) Copia completa + PR por versión | (b) Paquete npm privado |
|---|---|---|
| Qué tiene el cliente | Todo el código (`motor/` + `marca/`) | Solo `marca/` + dependencia `@dkitchen/motor` |
| Actualización | La automatización abre un PR desde `motor/vX.Y.Z` con tests y despliegue de prueba | PR automático que sube la versión del paquete |
| Entrega al cliente | Inmediata: ya tiene todo | Hay que copiar el paquete dentro o darle acceso al registro |
| Riesgo | Conflictos si alguien edita `motor/` (se bloquea por CI) | Gestionar el registro privado y su acceso |
| Migraciones SQL | Script versionado en ambos casos | Script versionado en ambos casos |

**Cómo se prototipa sin salir de este repo:** primero en local, dentro del contenedor, con repositorios git simulados (padre + 2 clientes) y un registro npm local. Si sale bien y karc0 lo aprueba, se repite con repos reales de prueba que karc0 cree en GitHub.

## 4. Plan de fases recalculado

**Coste en euros (estimación).** Precio de este modelo: 4 $/M tokens de entrada, 20 $/M de salida, 0,20 $/M de lectura de caché y unos 8 $/M de escritura de caché (caché de 1 hora). Una sesión de trabajo típica de este agente (~250k tokens de contexto, ~50 llamadas) cuesta **≈ 5 €**. Cambio aproximado de 0,90 €/$. Las cifras son orientativas: la barra de estado mostrará el gasto real cuando el entorno informe del coste.

| Fase | Contenido | Sesiones | Coste aprox. |
|---|---|---|---|
| **1A Reparar la plantilla** | Import `query`, checkout (`product_id`), esquema coherente en migraciones numeradas, funciones SQL que faltan, sin secretos ni endpoints peligrosos, Postgres local + semilla demo, app arrancando de punta a punta | 2 | ≈ 10 € |
| **1B Motor / marca** | Estructura `motor/` + `marca/`, `marca.config.ts` con zod, tokens + 1 plantilla + registro de huecos, módulos activables y 4 preajustes, marca neutra `demo`, eliminar restos de identidad | 3 | ≈ 15 € |
| **1C Calidad** | TS estricto, lint, tests (precios, carrito, promos, combos), e2e Playwright, CI | 2 | ≈ 10 € |
| **2 Prototipo de sincronización** | Opciones (a) y (b) en local, informe y recomendación | 1–2 | ≈ 8 € |
| **3 Estudio v1** | Recorrido guiado + editor con vista previa en directo, publica `marca/` + semilla | 3–4 | ≈ 18 € |
| **4 Editor en el admin del cliente** | Mismo editor limitado por plan | 1–2 | ≈ 8 € |
| **5 Carta completa** | Alérgenos, etiquetas, promos con fechas, combos, banners, idiomas, legales | 3 | ≈ 15 € |
| **6 Servicio en sala** | Pedido en mesa, editor de sala, reservas, comandero no fiscal | 4–5 | ≈ 22 € |
| **7 Venta y fidelización** | Fidelización v2, campañas con baja, capa de pagos con adaptadores | 3–4 | ≈ 18 € |
| **8 Verticales** | Inventario de dark store, marcas virtuales de dark kitchen | 2–3 | ≈ 12 € |
| **9 Panel v2 e IA** | Espacios con «atrás», primeros pasos, fotos automáticas, IA de imágenes, chat de ayuda | 3 | ≈ 15 € |
| **Total** | | **27–34** | **≈ 150 €** |

**El plan completo no cabe en los 100 €** (≈ 6 € ya gastados en esta conversación). Opción que cabe: **1A + 1B + 1C + 2 + 3 + 5 ≈ 76 €**, con margen de ≈ 18 €. El resto (sala, pagos, verticales, IA) iría con más crédito o priorizando módulos sueltos.

## 5. Alcance aprobado y siguientes pasos

**A9 (karc0):** con este crédito se hace **solo la base, pulida al máximo**: 1A + 1B + 1C + 2 (≈ 43 €). Todo lo demás queda documentado como hoja de ruta para terminar el producto.

**Visión precisada por karc0:** el objetivo no es una carta, sino una **PWA hiperoptimizada y funcional** con:
- **Personalización absoluta** (siguiendo los patrones ya desarrollados en otras versiones);
- **Pasarela de pago del propio cliente** (capa `PaymentProvider` con adaptadores);
- **Conexión con el hardware que el negocio ya tenga o compre**: impresoras térmicas, datáfonos/TPV, pantallas de cocina, cajón portamonedas, básculas… (capa `HardwareAdapter`, a diseñar en la Fase 1B como punto de extensión).

**Antes de la Fase 1A:** karc0 dará acceso a los repositorios de las versiones anteriores. Se auditarán uno a uno, en **solo lectura**, para extraer los patrones ya resueltos (pagos, hardware, personalización) y llevarlos al motor. Es una excepción autorizada por karc0 a la regla «solo este repo» de `ARRANQUE_AGENTE_NUBE.md`, solo para leer.

Orden:
1. Fusionar el PR #1.
2. Auditoría de los repos anteriores → `docs/AUDITORIA_VERSIONES_PREVIAS.md` (patrones reutilizables y diferencias).
3. Fase 1A en `nube/fase-1a-reparar-plantilla`.

## 6. Decisiones posteriores a la auditoría de versiones anteriores

- **A10:** en la base solo la plantilla **neutra**. Obrador (Bokadipan) y Street (Wing Boss) quedan como plantillas futuras.
- **A11:** la API se **reescribe desde cero** (TypeScript + zod, precio siempre en servidor, migraciones numeradas, solo Neon/Postgres). Coste de la base ≈ 43 € + 8 € = **≈ 51 €**.
- **Néstor Pizzas:** cliente real en producción. No se modifica sin una fase propia de análisis y plan aprobada por karc0. Petición pendiente del cliente: aviso de «actualizaciones / próximo lanzamiento» en la web pública y en el registro.
