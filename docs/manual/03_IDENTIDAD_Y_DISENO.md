# 03 · Identidad y diseño de autor

Todo lo de esta guía vive en `brands/<slug>/`. **El motor no se toca.**

## 1. `brand.config.ts` campo a campo

| Bloque | Qué rellenar | Notas |
|---|---|---|
| `slug`, `preajuste`, `modulos` | Los de la guía 02. `modulos` solo lleva lo que cambia respecto al preajuste | Alacena: `{ recogida: false }` (dark store sin mostrador) |
| `name`, `shortName`, `legalName`, `slogan`, `cif` | Datos comerciales y fiscales | `shortName` ≤ 12 caracteres (icono de la PWA) |
| `phone`, `email`, `address`, `city` | Contacto | |
| `tema` | 11 colores + `radius` + `scheme` | Ver §2 |
| `fuentes` | `sans`, `display` y la URL de Google Fonts | La CSP solo permite `fonts.googleapis.com` y `fonts.gstatic.com` |
| `assets` | `logoUrl`, `heroBannerUrl`, `placeholderProductUrl`, `iconoFuente` | Rutas `/marca/…` = `recursos/…` |
| `splash` | Título, subtítulo y duración | Solo si no hay preloader propio |
| `loyalty` | Textos del club | Los **números** (puntos por 10 € y meta) van en la semilla (guía 04) |
| `orderDefaults` | Moneda, tiempos orientativos, aviso de sugerencias, prefijo del ticket | |
| `seo` | `title` ≤ 60 caracteres, `description` ≤ 160, `lang` | |
| `pwa` | `themeColor`, `backgroundColor`, `adminName` | |
| `creditos` | Mostrar o no «Tecnología DKitchen» | |

Comprobación: `BRAND=<slug> npm run build`. La validación zod indica el campo exacto si algo falla.

## 2. Paleta

1. Parte del color principal de la marca. `nueva-marca` ya deriva `primaryHover` (−15 % luz) y `primaryLight` (+90 %).
2. Completa `accent` (segundo color), `surface` (fondo de página), `card`, `ink` (texto), `inkSoft`, `border`.
3. **Contraste mínimo AA**: el texto (`ink`) sobre `surface` y el blanco sobre `primary` deben tener contraste ≥ 4,5:1. Compruébalo con cualquier verificador de contraste.
4. Alacena: burdeos `#7A1E2C`, oro `#B8892F`, crema `#FBF7F0`, tinta `#2A1A14`.

## 3. Logo e icono

- `recursos/logo.svg`: horizontal, en SVG con los textos ya en curvas o con una tipografía de respaldo (`Georgia`, `Arial`).
- `recursos/icono.svg`: cuadrado, sin texto pequeño, que se lea a 48 px. De él salen al compilar todos los iconos de la PWA (192, 512 y *maskable*).
- Comprobación: tras `npm run build`, revisa `dist/iconos/` y abre `dist/manifest.webmanifest`.

## 4. Diseño de autor con huecos

Los **huecos** son los puntos donde la marca pone componentes propios. Se registran en `brands/<slug>/huecos.tsx`:

| Hueco | Dónde aparece | Props |
|---|---|---|
| `Preloader` | Pantalla de carga inicial | `{ saliendo: boolean }` (fundido de salida) |
| `Logo` | Cabecera | `{ className?, variante? }` |
| `Hero` | Portada encima de la carta | `{}` |
| `Pie` | Pie de página | `{}` |

Pasos (como en Alacena):
1. Crea `brands/<slug>/huecos/` con un componente por hueco (`Portada.tsx`, `Preloader.tsx`, `Pie.tsx`).
2. Importa desde el motor solo lo público: `src/store/zonaStore`, `src/components/Footer`, `src/marca/huecos` (tipos).
3. Registra:
   ```tsx
   import type { Huecos } from '../../src/marca/huecos';
   import Portada from './huecos/Portada';
   import Preloader from './huecos/Preloader';
   import Pie from './huecos/Pie';
   import './estilos.css';
   const huecos: Huecos = { Hero: Portada, Preloader, Pie };
   export default huecos;
   ```
4. **El pie propio debe incluir el pie del motor** (`<Footer />`), que lleva los enlaces legales, el contacto y los créditos. Si no, se pierden los textos legales.

## 5. Efectos (`estilos.css` de la marca)

`huecos.tsx` importa `brands/<slug>/estilos.css`, que **solo se carga con esa marca**. Para dar estilo a piezas del motor sin tocarlo, el motor expone atributos estables:

| Selector | Pieza |
|---|---|
| `[data-motor="tarjeta-producto"]` | Tarjeta de cada producto |
| `[data-motor="barra-carrito"]` | Barra flotante del carrito |
| `.motor-latido` | Latido del contador del carrito (ya incluido) |

Reglas obligatorias:
- Toda animación dentro de `@media (prefers-reduced-motion: no-preference)`.
- Animaciones ligadas al scroll (`animation-timeline: view()`) dentro de `@supports`.
- Texturas en SVG en línea (`data:`), sin descargas externas (la CSP lo exige).

Alacena incluye: elevación dorada de tarjetas, aparición al hacer scroll, botón oro, grano de papel, preloader que se dibuja y entrada escalonada del titular (`brands/alacena-expres/estilos.css`).

## 6. 3D (opcional, solo si el cliente lo pide)

Patrón de `brands/alacena-expres/huecos/Escaparate3D.tsx`:
1. **three.js en diferido**: la portada lo importa con `lazy(() => import('./Escaparate3D'))`. Así el paquete principal no crece; el 3D llega en su propio fragmento (~133 kB comprimido).
2. **Modelos por código** (LatheGeometry para botellas, ExtrudeGeometry para cuñas, cajas y toros para lazos), con texturas dibujadas en `canvas`. No hay archivos `.glb` que alojar ni licencias que gestionar.
3. Luz de estudio (hemisférica + foco con sombras suaves + contraluz), `ACESFilmicToneMapping`, `SRGBColorSpace`.
4. Obligatorio:
   - pausa fuera de pantalla (`IntersectionObserver`) y con la pestaña oculta;
   - imagen fija con «reducir movimiento»;
   - nada sin WebGL (`try/catch` al crear el renderer);
   - liberar geometrías, materiales y texturas al desmontar;
   - `aria-hidden` en el canvas;
   - `touch-pan-y` para no bloquear el scroll del móvil.

## 7. Comprobación visual (obligatoria)

1. `BRAND=<slug> npm run build` y `npx vite preview` con la API local.
2. Capturas en **móvil (Pixel 7)** y **escritorio (1440×900)** de preloader, portada, carta, ficha, checkout y panel. Script de ejemplo en la guía 06 §6.
3. Revisa:
   - en móvil, lo esencial de la portada (titular, botones y 3D) cabe en la primera pantalla;
   - no hay textos cortados;
   - el contraste es legible;
   - el 3D se ve entero.
4. Guarda las capturas en el PR.
