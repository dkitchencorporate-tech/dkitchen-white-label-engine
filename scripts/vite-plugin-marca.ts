// Plugin de Vite: compila la PWA para la marca indicada en BRAND (por defecto
// «demo»). Inyecta en index.html los metadatos y el tema (sin parpadeo),
// sirve y emite los recursos de brands/<slug>/recursos en /marca/*, genera los
// iconos de la PWA desde el logo, los manifest y robots/sitemap.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { tsImport } from 'tsx/esm/api';
import sharp from 'sharp';
import { validarMarca, type BrandConfig } from '../src/marca/esquema.js';
import { variablesTema } from '../src/marca/tema.js';

const TIPOS: Record<string, string> = {
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2'
};

const escapar = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

export async function cargarMarca(slug: string): Promise<{ dir: string; brand: BrandConfig }> {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`BRAND no válido: ${slug}`);
  const dir = resolve(process.cwd(), 'brands', slug);
  const archivo = join(dir, 'brand.config.ts');
  if (!existsSync(archivo)) throw new Error(`No existe la marca «${slug}» (${archivo}).`);
  const mod = await tsImport(archivo, import.meta.url);
  return { dir, brand: validarMarca(mod.default?.default ?? mod.default) };
}

async function generarIconos(dir: string, b: BrandConfig): Promise<Record<string, Buffer>> {
  const fuente = readFileSync(join(dir, b.assets.iconoFuente));
  const png = (size: number) => sharp(fuente, { density: 384 }).resize(size, size).png().toBuffer();
  const relleno = Math.round(512 * 0.1);
  const maskable = await sharp(fuente, { density: 384 })
    .resize(512 - relleno * 2, 512 - relleno * 2)
    .extend({ top: relleno, bottom: relleno, left: relleno, right: relleno, background: b.pwa.themeColor })
    .png()
    .toBuffer();
  return {
    'iconos/icono-192.png': await png(192),
    'iconos/icono-512.png': await png(512),
    'iconos/icono-maskable-512.png': maskable,
    'iconos/apple-touch-icon.png': await png(180),
    'iconos/favicon-32.png': await png(32)
  };
}

function manifest(b: BrandConfig, admin: boolean): string {
  return JSON.stringify(
    {
      id: admin ? `${b.slug}-admin` : b.slug,
      name: admin ? `${b.pwa.adminName} · ${b.name}` : b.name,
      short_name: admin ? b.pwa.adminName : b.shortName,
      description: b.seo.description,
      lang: b.seo.lang,
      start_url: admin ? '/admin' : '/',
      scope: admin ? '/admin' : '/',
      display: 'standalone',
      orientation: admin ? 'any' : 'portrait',
      background_color: b.pwa.backgroundColor,
      theme_color: b.pwa.themeColor,
      icons: [
        { src: '/iconos/icono-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/iconos/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/iconos/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    null,
    2
  );
}

function robots(b: BrandConfig): string {
  return `User-agent: *\nAllow: /\nDisallow: /admin\n${b.seo.siteUrl ? `Sitemap: ${b.seo.siteUrl.replace(/\/$/, '')}/sitemap.xml\n` : ''}`;
}

function sitemap(b: BrandConfig): string | null {
  if (!b.seo.siteUrl) return null;
  const base = b.seo.siteUrl.replace(/\/$/, '');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${base}/</loc></url>\n  <url><loc>${base}/registro</loc></url>\n</urlset>\n`;
}

function cabecera(b: BrandConfig): string {
  const vars = Object.entries(variablesTema(b.tema, b.fuentes)).map(([k, v]) => `${k}:${v}`).join(';');
  const fuentes = b.fuentes.googleFontsUrl
    ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${escapar(b.fuentes.googleFontsUrl)}">`
    : '';
  return [
    `<title>${escapar(b.seo.title)}</title>`,
    `<meta name="description" content="${escapar(b.seo.description)}">`,
    `<meta property="og:title" content="${escapar(b.seo.title)}">`,
    `<meta property="og:description" content="${escapar(b.seo.description)}">`,
    `<meta property="og:type" content="website">`,
    `<meta name="theme-color" content="${b.pwa.themeColor}">`,
    `<meta name="apple-mobile-web-app-capable" content="yes">`,
    `<meta name="apple-mobile-web-app-title" content="${escapar(b.shortName)}">`,
    `<link id="manifest-link" rel="manifest" href="/manifest.webmanifest">`,
    `<link rel="icon" type="image/png" sizes="32x32" href="/iconos/favicon-32.png">`,
    `<link rel="apple-touch-icon" href="/iconos/apple-touch-icon.png">`,
    fuentes,
    `<style>:root{${vars};color-scheme:${b.tema.scheme}}</style>`
  ].join('\n    ');
}

function listarRecursos(dir: string, base = ''): string[] {
  const abs = join(dir, base);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).flatMap((f) => {
    const rel = join(base, f);
    return statSync(join(dir, rel)).isDirectory() ? listarRecursos(dir, rel) : [rel];
  });
}

export default function marca(): Plugin {
  const slug = process.env.BRAND || 'demo';
  let datos: { dir: string; brand: BrandConfig } | null = null;
  let iconos: Record<string, Buffer> | null = null;
  let config: ResolvedConfig;
  const cargar = async () => (datos ??= await cargarMarca(slug));
  const getIconos = async () => (iconos ??= await generarIconos((await cargar()).dir, (await cargar()).brand));

  return {
    name: 'motor-marca',
    config: () => ({ resolve: { alias: { '@marca': resolve(process.cwd(), 'brands', slug) } } }),
    configResolved(c) {
      config = c;
    },
    // La configuración llega al navegador ya validada (sin zod en el bundle).
    resolveId: (id) => (id === 'virtual:marca-config' ? '\0virtual:marca-config' : null),
    async load(id) {
      if (id !== '\0virtual:marca-config') return null;
      return `export default ${JSON.stringify((await cargar()).brand)};`;
    },
    async transformIndexHtml(html) {
      const { brand } = await cargar();
      return html.replace('<!--marca:cabecera-->', cabecera(brand)).replace('<html lang="es">', `<html lang="${brand.seo.lang}">`);
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0];
        try {
          const { dir, brand } = await cargar();
          if (url.startsWith('/marca/')) {
            const archivo = resolve(dir, 'recursos', url.slice('/marca/'.length));
            if (!archivo.startsWith(resolve(dir, 'recursos')) || !existsSync(archivo)) return next();
            res.setHeader('Content-Type', TIPOS[extname(archivo)] || 'application/octet-stream');
            return res.end(readFileSync(archivo));
          }
          if (url.startsWith('/iconos/')) {
            const buf = (await getIconos())[url.slice(1)];
            if (!buf) return next();
            res.setHeader('Content-Type', 'image/png');
            return res.end(buf);
          }
          if (url === '/manifest.webmanifest' || url === '/manifest-admin.webmanifest') {
            res.setHeader('Content-Type', 'application/manifest+json');
            return res.end(manifest(brand, url.includes('admin')));
          }
          if (url === '/robots.txt') return res.end(robots(brand));
          if (url === '/sitemap.xml' && sitemap(brand)) return res.end(sitemap(brand));
        } catch (err) {
          config.logger.error(String(err));
        }
        next();
      });
    },
    async generateBundle() {
      const { dir, brand } = await cargar();
      const emitir = (fileName: string, source: string | Buffer) => this.emitFile({ type: 'asset', fileName, source });
      for (const rel of listarRecursos(join(dir, 'recursos'))) emitir(`marca/${rel}`, readFileSync(join(dir, 'recursos', rel)));
      for (const [nombre, buf] of Object.entries(await getIconos())) emitir(nombre, buf);
      emitir('manifest.webmanifest', manifest(brand, false));
      emitir('manifest-admin.webmanifest', manifest(brand, true));
      emitir('robots.txt', robots(brand));
      const sm = sitemap(brand);
      if (sm) emitir('sitemap.xml', sm);
    }
  };
}
