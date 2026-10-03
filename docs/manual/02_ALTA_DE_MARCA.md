# 02 · Alta de la marca

Hay dos formas. Elige según cómo se vaya a desplegar (decisión con karc0 en cada cliente):

| Forma | Cuándo | Orden |
|---|---|---|
| **A. Repo propio del cliente** (recomendada, decisión A1) | Cliente real que recibirá actualizaciones del motor por PR | `npm run motor -- crear-cliente …` |
| **B. Marca dentro del repo del motor** | Marcas de demostración o pruebas del motor (como `alacena-expres`) | `npm run nueva-marca -- …` |

## 1. Elegir los datos de partida

Apunta antes de empezar:
- **slug**: 2–40 caracteres, minúsculas, números y guiones (`alacena-expres`). Es el nombre de la carpeta y el valor de `BRAND`. No se cambia después.
- **Nombre comercial**, **ciudad**, **color principal** (`#RRGGBB`).
- **Preajuste** según el negocio: `restaurante`, `bar`, `dark_kitchen` o `dark_store`. Decide qué módulos vienen activados (tabla en `src/marca/preajustes.ts`):

| Módulo | restaurante | bar | dark_kitchen | dark_store |
|---|:-:|:-:|:-:|:-:|
| domicilio | ✅ | — | ✅ | ✅ |
| recogida | ✅ | ✅ | ✅ | ✅ |
| pedidoEnMesa, editorSala, comandero | ✅ | ✅ | — | — |
| kiosko | ✅ | ✅ | ✅ | — |
| reservas | ✅ | — | — | — |
| fidelizacion | ✅ | ✅ | ✅ | ✅ |
| inventario | — | — | — | ✅ |
| marcasVirtuales | — | — | ✅ | — |
| **zonas** (precio y envío por código postal) | — | — | ✅ | ✅ |
| **regalos** (mensaje de regalo) | — | — | — | ✅ |

- Logo (SVG o PNG) e icono cuadrado (SVG o PNG de 512 px o más). Si no los hay aún, se crean en la guía 03.

## 2A. Repo propio del cliente

1. karc0 crea en GitHub un **repo vacío y privado** `<slug>-pwa` en la organización (la app de GitHub de la sesión no tiene permiso para crearlo).
2. Desde el repo del motor, con la versión publicada que toque:
   ```bash
   npm run motor -- crear-cliente <slug> --destino ../<slug>-pwa --nombre "Nombre" \
     --origen https://github.com/dkitchencorporate-tech/dkitchen-white-label-engine.git \
     --preajuste dark_store --color "#7A1E2C" --ciudad Madrid [--logo ruta] [--icono ruta] [--version x.y.z]
   ```
   Crea un repo con **solo** el motor publicado (sin `ESTADO_PROYECTO.md`, `ARRANQUE_AGENTE_NUBE.md` ni `.claude/`), la marca y `cliente.json`.
3. Sube el repo:
   ```bash
   cd ../<slug>-pwa && git remote add origin <url del repo> && git push -u origin main
   ```
4. Comprobación: `npm ci && npm run motor -- verificar` → «Motor intacto».

## 2B. Marca dentro del repo del motor

```bash
npm run nueva-marca -- <slug> --nombre "Nombre" --preajuste dark_store --color "#7A1E2C" --ciudad Madrid [--logo ruta] [--icono ruta]
```

Crea `brands/<slug>/` copiando la plantilla `brands/demo`:

| Archivo | Qué es | Guía |
|---|---|---|
| `brand.config.ts` | Identidad validada con zod al compilar | 03 |
| `huecos.tsx` | Componentes propios (portada, preloader, pie…) | 03 |
| `recursos/` | Logo, icono, placeholder, `productos/` con fotos | 03, 05 |
| `semilla.sql` | Carta, zonas, horario y ajustes | 04 |
| `CHECKLIST.md` | Lista de pendientes de esa marca | todas |

Comprobación inmediata:
```bash
BRAND=<slug> npm run build        # valida brand.config.ts y genera iconos y manifest
BRAND=<slug> npm run dev          # http://localhost:5173 (con `npm run dev:api` en otra terminal)
```
Si `brand.config.ts` tiene un error, la compilación se para con el campo exacto que falla (validación zod).

## 3. Rama y PR

- Trabajo en rama `nube/<fase-o-marca>`; nunca en `main`.
- El PR lleva la **lista maestra** de `00_INDICE.md` y la sección **Seguridad**.

Ejemplo resuelto: `brands/alacena-expres/` se creó con
`npm run nueva-marca -- alacena-expres --nombre "Alacena Exprés" --preajuste dark_store --color "#7A1E2C" --ciudad Madrid`.
