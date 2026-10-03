// Genera las fotos de producto de una marca con FLUX a partir de
// brands/<slug>/imagenes.json ([{ slug, prompt }]) y las guarda en
// brands/<slug>/recursos/productos/<slug>.webp (800×600, 4:3).
//
//   npx tsx scripts/imagenes-marca.ts <marca> [--forzar] [--solo slug1,slug2] [--paralelo 3]
//
// Proveedor según el entorno (la clave nunca se escribe en el repositorio):
//   TOGETHER_API_KEY    FLUX.1 schnell en Together AI.
//   POLLINATIONS_TOKEN  FLUX en Pollinations.
//   (ninguna)           AI Horde, red gratuita: Juggernaut XL fotorrealista; lento sin
//                       AI_HORDE_KEY (cola anónima, ~5–10 min por foto).
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const [marca, ...resto] = process.argv.slice(2);
const forzar = resto.includes('--forzar');
const opcion = (n: string) => { const i = resto.indexOf(n); return i >= 0 ? resto[i + 1] : undefined; };
const solo = opcion('--solo')?.split(',');
const paralelo = Math.max(1, Math.min(6, Number(opcion('--paralelo') ?? 3)));
if (!marca || !/^[a-z0-9-]+$/.test(marca)) throw new Error('Uso: npx tsx scripts/imagenes-marca.ts <marca> [--forzar]');
const dir = join('brands', marca);
const lista = (JSON.parse(readFileSync(join(dir, 'imagenes.json'), 'utf8')) as { slug: string; prompt: string; negativo?: string }[])
  .filter((x) => !solo || solo.includes(x.slug));
const destino = join(dir, 'recursos', 'productos');
mkdirSync(destino, { recursive: true });

const together = process.env.TOGETHER_API_KEY;
const pollinations = process.env.POLLINATIONS_TOKEN;
const horde = process.env.AI_HORDE_KEY || '0000000000';
// Cloudflare de AI Horde rechaza clientes sin agente de usuario.
const CABECERAS_HORDE = { apikey: horde, 'content-type': 'application/json', 'client-agent': 'dkitchen-motor:1.0', 'user-agent': 'Mozilla/5.0 dkitchen-motor/1.0' };

async function generarHorde(prompt: string, negativo: string, semilla: number): Promise<Buffer> {
  const r = await fetch('https://aihorde.net/api/v2/generate/async', {
    method: 'POST', headers: CABECERAS_HORDE,
    body: JSON.stringify({
      prompt: `${prompt} ### ${negativo}`, models: ['Juggernaut XL'], nsfw: false, censor_nsfw: true, r2: true,
      params: { width: 1024, height: 768, steps: 30, cfg_scale: 5, sampler_name: 'k_dpmpp_2m', karras: true, seed: String(semilla), n: 1 }
    })
  });
  if (!r.ok) throw new Error(`Horde ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const { id } = (await r.json()) as { id: string };
  const limite = Date.now() + 30 * 60_000;
  while (Date.now() < limite) {
    await new Promise((ok) => setTimeout(ok, 8000));
    const e = (await (await fetch(`https://aihorde.net/api/v2/generate/check/${id}`, { headers: CABECERAS_HORDE })).json()) as { done?: boolean; faulted?: boolean };
    if (e.faulted) throw new Error('Horde: generación fallida');
    if (!e.done) continue;
    const st = (await (await fetch(`https://aihorde.net/api/v2/generate/status/${id}`, { headers: CABECERAS_HORDE })).json()) as { generations: { img: string; censored?: boolean }[] };
    const g = st.generations[0];
    if (!g || g.censored) throw new Error('Horde: imagen censurada por el filtro');
    return Buffer.from(await (await fetch(g.img)).arrayBuffer());
  }
  throw new Error('Horde: tiempo agotado');
}

async function generar(prompt: string, semilla: number, negativo = ''): Promise<Buffer> {
  if (!together && !pollinations) return generarHorde(prompt, negativo, semilla);
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
let siguiente = 0;
async function trabajador(): Promise<void> {
  while (siguiente < lista.length) {
    const i = siguiente++;
    const { slug, prompt, negativo } = lista[i];
    const archivo = join(destino, `${slug}.webp`);
    if (existsSync(archivo) && !forzar) { ok++; continue; }
    let hecho = false;
    for (let intento = 1; intento <= 4 && !hecho; intento++) {
      try {
        const img = await generar(prompt, 1000 + i + (intento - 1) * 7919, negativo);
        await sharp(img).resize(800, 600, { fit: 'cover' }).webp({ quality: 82 }).toFile(archivo);
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
}
await Promise.all(Array.from({ length: paralelo }, trabajador));
console.log(`\n${ok}/${lista.length} imágenes listas.${fallos.length ? ` Fallan: ${fallos.join(', ')}` : ''}`);
process.exitCode = fallos.length ? 1 : 0;
