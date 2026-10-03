// Servidor local de la API: emula las rutas de vercel.json y ejecuta las
// funciones de api/*.ts sin necesidad de cuenta de Vercel.
// Uso: npm run dev:api   (Vite redirige /api a este puerto)
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Req, Res } from '../api/_lib/http.js';

const PUERTO = Number(process.env.API_PORT || 3001);
const MAX_CUERPO = 5 * 1024 * 1024;

interface Ruta { src: string; dest?: string }
const rutas: { re: RegExp; dest: string }[] = (JSON.parse(readFileSync('vercel.json', 'utf8')).routes as Ruta[])
  .filter((r) => r.dest?.startsWith('/api/'))
  .map((r) => ({ re: new RegExp(`^${r.src}`), dest: r.dest as string }));

function resolver(pathname: string): { fn: string; query: Record<string, string> } | null {
  let destino = pathname;
  for (const r of rutas) {
    if (r.re.test(pathname)) {
      destino = r.dest;
      break;
    }
  }
  const [ruta, qs] = destino.split('?');
  const m = /^\/api\/([a-z-]+)$/.exec(ruta);
  if (!m) return null;
  return { fn: m[1], query: Object.fromEntries(new URLSearchParams(qs ?? '')) };
}

function leerCuerpo(req: IncomingMessage): Promise<unknown> {
  return new Promise((ok, mal) => {
    let tam = 0;
    const trozos: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      tam += c.length;
      if (tam > MAX_CUERPO) {
        mal(new Error('Cuerpo demasiado grande'));
        req.destroy();
      } else trozos.push(c);
    });
    req.on('end', () => {
      const txt = Buffer.concat(trozos).toString('utf8');
      if (!txt) return ok(undefined);
      try {
        ok(JSON.parse(txt));
      } catch {
        ok(undefined);
      }
    });
    req.on('error', mal);
  });
}

function adaptarRes(res: ServerResponse): Res {
  const r: Res = {
    status(code) {
      res.statusCode = code;
      return r;
    },
    json(body) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(body));
    },
    setHeader(n, v) {
      res.setHeader(n, String(v));
    }
  };
  return r;
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PUERTO}`);
  const destino = resolver(url.pathname);
  if (!destino) {
    res.statusCode = 404;
    res.end('{"error":"Ruta no encontrada"}');
    return;
  }
  try {
    const mod = await import(pathToFileURL(join(process.cwd(), 'api', `${destino.fn}.ts`)).href);
    const body = await leerCuerpo(req);
    const query = { ...Object.fromEntries(url.searchParams), ...destino.query };
    const r: Req = { method: req.method, url: req.url, query, body, headers: req.headers, socket: { remoteAddress: req.socket.remoteAddress } };
    await mod.default(r, adaptarRes(res));
  } catch (err) {
    console.error('Error en el servidor local:', (err as Error).message);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('{"error":"Error interno"}');
    }
  }
}).listen(PUERTO, () => console.log(`API local en http://localhost:${PUERTO}`));
