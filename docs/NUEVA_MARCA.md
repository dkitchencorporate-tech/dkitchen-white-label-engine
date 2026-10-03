# Dar de alta una marca nueva

Objetivo: de cero a una PWA desplegable **en horas, no en días**. El motor no se toca: todo lo de la marca vive en `brands/<slug>/`.

> **Cliente con repo propio** (lo habitual): `npm run motor -- crear-cliente <slug> --destino ../<slug> --nombre "…" --origen <repo del motor> [mismas opciones]` crea en ~1 s un repo con el motor publicado, esta misma marca y `cliente.json`, listo para recibir actualizaciones por PR. Detalles en `docs/INFORME_SINCRONIZACION.md`. Lo que sigue explica la marca en sí.

## 1. Crear la marca (1 minuto)

```bash
npm run nueva-marca -- mi-pizzeria \
  --nombre "Mi Pizzería" \
  --preajuste restaurante \
  --color "#B91C1C" \
  --logo ruta/al/logo.svg \
  --icono ruta/al/icono-cuadrado.png \
  --ciudad "Granada"
```

- **`--preajuste`** activa los módulos típicos del negocio: `restaurante`, `bar`, `dark_kitchen` o `dark_store` (tabla en `src/marca/preajustes.ts`).
- **`--color`** es el color principal; el hover y el tono claro se derivan solos.
- **`--icono`** debe ser cuadrado (SVG, o PNG de 512 px o más). De él salen todos los iconos de la PWA, incluido el *maskable* para Android. Si no se indica, se usa el logo.

El comando crea:

```
brands/mi-pizzeria/
├─ brand.config.ts   identidad, tema, módulos, textos, SEO, PWA (validado con zod al compilar)
├─ huecos.tsx        componentes propios de la marca (diseño de autor), vacío al principio
├─ recursos/         logo, icono y placeholder; se sirven en /marca/*
├─ semilla.sql       carta y datos del negocio (copia de la demo para editar)
└─ CHECKLIST.md      todo lo que falta, paso a paso, con las variables de entorno
```

## 2. Verla en local

```bash
BRAND=mi-pizzeria npm run dev
```

Si la configuración tiene un error, Vite se detiene con un mensaje que indica el campo exacto (por ejemplo, `tema.primary: Color en formato #RRGGBB`).

## 3. Identidad y diseño de autor

- **Tema** (`tema` en `brand.config.ts`): 11 colores, radio base y esquema claro u oscuro. Se convierten en variables CSS (`--brand-*`) que usan todos los componentes.
- **Tipografías** (`fuentes`): familias y, si se quiere, la hoja de Google Fonts.
- **Huecos** (`huecos.tsx`): sustituyen piezas del motor por componentes propios.

```tsx
import type { Huecos } from '../../src/marca/huecos';
import MiPortada from './componentes/MiPortada';
import MiPreloader from './componentes/MiPreloader';

const huecos: Huecos = { Hero: MiPortada, Preloader: MiPreloader };
export default huecos;
```

Huecos disponibles: `Preloader` (pantalla de carga), `Logo` (cabecera), `Hero` (portada de la carta) y `Pie`. Para añadir huecos nuevos, se hace en el motor (`src/marca/huecos.tsx`) y así todas las marcas pueden usarlos.

## 4. Carta y negocio

Edita `semilla.sql`:
- **Productos:** categorías, productos, precios y alérgenos (los 14 de la UE: `gluten`, `crustaceos`, `huevos`, `pescado`, `cacahuetes`, `soja`, `lacteos`, `frutos_cascara`, `apio`, `mostaza`, `sesamo`, `sulfitos`, `altramuces`, `moluscos`).
- **Opciones con precio:** en `customization_schema.groups`.
- **Negocio:** tarifas, envío gratis y códigos postales de reparto (`store_settings`), y horario (`store_hours`).

Después se gestiona todo desde el panel `/admin`.

## 5. Base de datos y despliegue

Sigue el `CHECKLIST.md` de la marca y `docs/DESARROLLO_LOCAL.md` §4. En resumen:
1. Neon: `db:migrar`, `db:semilla -- <slug>`, `crear-admin` y el rol `motor_api`.
2. Vercel: `BRAND=<slug>`, `APP_DATABASE_URL` (rol `motor_api`), `APP_JWT_SECRET` y `APP_URL`.

## Qué genera el motor por marca al compilar
- `index.html` con título, descripción, Open Graph, `theme-color`, fuentes y tema inyectado (sin parpadeo de colores).
- `manifest.webmanifest` (PWA del cliente) y `manifest-admin.webmanifest` (panel instalable).
- Iconos 192/512/maskable, `apple-touch-icon` y favicon desde el icono de la marca.
- `robots.txt` (con `/admin` excluido) y `sitemap.xml` si la marca tiene `seo.siteUrl`.
