# 05 · Fotos de producto

Objetivo: **una foto por producto que parezca una foto real de estudio**, sin rastro de IA (sin marcas de agua, sin texto inventado, sin objetos deformes). Formato final: **WebP 800×600 (4:3)** en `brands/<slug>/recursos/productos/<slug-del-producto>.webp`.

Si el cliente tiene fotos del proveedor, **se usan esas**: se suben desde el panel (Vercel Blob) o se dejan con ese nombre en `recursos/productos/`.

## 1. El archivo de indicaciones (`brands/<slug>/imagenes.json`)

Una entrada por producto:
```json
{ "slug": "queso-manchego-curado-dop", "tipo": "suelto",
  "sujeto": "wedge of cured manchego cheese with zigzag rind and a few slices",
  "prompt": "professional e-commerce product photograph of …", "negativo": "illustration, painting, …" }
```
- `slug` = nombre del archivo = el que usa `image_url` en la semilla.
- `tipo`:
  - **`combo`**: foto cenital del conjunto, con **todo lo que incluye a la vista**;
  - **`suelto`**: el producto solo, centrado, como foto de catálogo.

## 2. Reglas para escribir el `sujeto` (en inglés)

1. Describe **lo que se ve**, no el nombre comercial: «thin round slices of spanish salchichon with black peppercorns», no «salchichón ibérico de bellota».
2. **Botellas y latas**: siempre «completely blank plain cream label with no writing at all» o «plain brushed aluminium cans with no print, no logo and no text». El texto inventado de las etiquetas es lo que más delata la IA.
3. **Nunca** marcas comerciales reales ni logotipos.
4. Combos: enumera cada pieza («a board of sliced iberico ham, manchego wedges, a bowl of olives…»).
5. Misma escena para todo el catálogo, para que se vea coherente:
   - **sueltos**: mesa de nogal, servilleta de lino crema, fondo beige liso, luz suave de estudio desde la izquierda y 45°;
   - **combos**: vista cenital sobre nogal y mantel de lino.

El `prompt` completo y el `negativo` siguen la plantilla de `brands/alacena-expres/imagenes.json`, que conviene copiar tal cual y cambiar solo los sujetos.

## 3. Generar

```bash
npx tsx scripts/imagenes-marca.ts <slug> [--paralelo 5] [--solo slug1,slug2] [--forzar]
```
El proveedor se elige según las variables del entorno; las claves nunca van al repositorio.

| Variable | Proveedor | Calidad / velocidad |
|---|---|---|
| (ninguna) | **AI Horde**, Juggernaut XL, gratis | Fotorrealista. Cola anónima lenta: de 5 a 10 min por foto y horas si la red está saturada |
| `AI_HORDE_KEY` | AI Horde con cuenta gratuita (aihorde.net/register) | Igual, con más prioridad en la cola |
| `TOGETHER_API_KEY` | FLUX.1 schnell en Together AI | Rápido y bueno |
| `POLLINATIONS_TOKEN` | FLUX en Pollinations con token | Bueno |

⚠ **No uses Pollinations sin token**: desde 2026 solo sirve el modelo «sana», de baja calidad y con marca de agua (guía 10).

- El script salta las fotos que ya existen; con `--forzar` las repite.
- Para lanzar el catálogo entero, ejecútalo en segundo plano y vuelve a lanzarlo si se corta: continúa donde lo dejó.

## 4. Revisión una a una (obligatoria)

1. Haz hojas de contactos de 16 fotos:
   ```bash
   node -e "const sharp=require('sharp'),fs=require('fs');(async()=>{const d='brands/<slug>/recursos/productos/';const f=fs.readdirSync(d).sort().slice(0,16);const W=300,H=225;const i=await Promise.all(f.map(x=>sharp(d+x).resize(W,H).toBuffer()));await sharp({create:{width:W*4,height:H*4,channels:3,background:'#fff'}}).composite(i.map((b,k)=>({input:b,left:(k%4)*W,top:Math.floor(k/4)*H}))).jpeg().toFile('hoja.jpg');console.log(f.join(' | '))})()"
   ```
2. **Rechaza** cualquier foto que tenga:
   - texto o marcas en etiquetas o latas (aunque sea ilegible);
   - marca de agua;
   - un producto que no es el que dice (un salchichón que parece jamón) o que no se presenta como se vende (mejillones o berberechos **con concha** en una lata de conserva, ventresca con aspecto de crudo);
   - en un combo, falta de piezas o piezas que no están en la descripción;
   - manos o caras;
   - objetos deformes o duplicados;
   - aspecto de ilustración o 3D;
   - un estilo distinto al resto.
3. Para cada rechazada: corrige su `sujeto` en `imagenes.json` (más concreto), apártala del repo y repítela con `--solo <slug> --forzar`.
4. Apunta en el PR cuántas se rechazaron y por qué (ejemplo de Alacena, primera tanda: 4 de 17, por latas con marca inventada, un salchichón que parecía jamón, una sobrasada glaseada y una tabla de quesos con carne).
5. **Solo se suben al repo las fotos aprobadas.**

## 5. Si el generador rechaza algún producto (por ejemplo, alcohol)

Juggernaut XL vía AI Horde no ha rechazado bebidas alcohólicas. Si algún proveedor lo hiciera, se copian esas entradas de `imagenes.json` (sujeto y prompt) a una lista en el PR para que karc0 genere o consiga esas fotos y las entregue. Se suben con el mismo nombre de archivo.

## 6. Comprobación final

- `ls brands/<slug>/recursos/productos | wc -l` = número de productos con `image_url`.
- Ninguna foto supera ~150 kB (WebP calidad 82).
- `BRAND=<slug> npm run build` y revisión visual de la carta (guía 03 §7).
