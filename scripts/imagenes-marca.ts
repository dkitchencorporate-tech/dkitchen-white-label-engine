// Genera las fotos de producto de una marca con FLUX a partir de
// brands/<slug>/imagenes.json ([{ slug, prompt }]) y las guarda en
// brands/<slug>/recursos/productos/<slug>.webp (800×600, 4:3).
//
//   TOGETHER_API_KEY=… npx tsx scripts/imagenes-marca.ts <marca> [--forzar]
//   POLLINATIONS_TOKEN=… npx tsx scripts/imagenes-marca.ts <marca> [--forzar]
//
// La clave se lee del entorno y nunca se escribe en el repositorio.
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const [marca, ...resto] = process.argv.slice(2);
const forzar = resto.includes('--forzar');
if (!marca || !/^[a-z0-9-]+$/.test(marca)) throw new Error('Uso: npx tsx scripts/imagenes-marca.ts <marca> [--forzar]');
const dir = join('brands', marca);
const lista = JSON.parse(readFileSync(join(dir, 'imagenes.json'), 'utf8')) as { slug: string; prompt: string }[];
const destino = join(dir, 'recursos', 'productos');
mkdirSync(destino, { recursive: true });

const together = process.env.TOGETHER_API_KEY;
const pollinations = process.env.POLLINATIONS_TOKEN;
if (!together && !pollinations) throw new Error('Define TOGETHER_API_KEY o POLLINATIONS_TOKEN en el entorno.');

async function generar(prompt: string, semilla: number): Promise<Buffer> {
  if (together) {
    const r = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: { authorization: `Bearer ${together}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'black-forest-labs/FLUX.1-schnell-Free', prompt, width: 1024, height: 768, steps: 4, n: 1, seed: semilla, response_format: 'b64_json' }),
      signal: AbortSignal.timeout(120_000)
    });
    if (!r.ok) throw new Error(`Together ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = (await r.json()) as { data: { b64_json: string }[] };
    return Buffer.from(j.data[0].b64_json, 'base64');
  }
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=1024&height=768&nologo=true&private=true&seed=${semilla}`;
  const r = await fetch(url, { headers: { authorization: `Bearer ${pollinations}` }, signal: AbortSignal.timeout(180_000) });
  if (!r.ok) throw new Error(`Pollinations ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

let ok = 0;
const fallos: string[] = [];
for (const [i, { slug, prompt }] of lista.entries()) {
  const archivo = join(destino, `${slug}.webp`);
  if (existsSync(archivo) && !forzar) { ok++; continue; }
  let hecho = false;
  for (let intento = 1; intento <= 5 && !hecho; intento++) {
    try {
      const img = await generar(prompt, 1000 + i);
      await sharp(img).resize(800, 600, { fit: 'cover' }).webp({ quality: 80 }).toFile(archivo);
      console.log(`✓ ${slug}`);
      ok++;
      hecho = true;
    } catch (e) {
      console.log(`… ${slug} (intento ${intento}): ${e instanceof Error ? e.message : e}`);
      await new Promise((r) => setTimeout(r, 5000 * intento));
    }
  }
  if (!hecho) fallos.push(slug);
}
console.log(`\n${ok}/${lista.length} imágenes listas.${fallos.length ? ` Fallan: ${fallos.join(', ')}` : ''}`);
process.exitCode = fallos.length ? 1 : 0;
