// Alta de una marca nueva a partir de la plantilla brands/demo.
// Uso:
//   npm run nueva-marca -- <slug> --nombre "Nombre" [--preajuste restaurante|bar|dark_kitchen|dark_store]
//                                  [--color #RRGGBB] [--logo ruta.svg|png] [--icono ruta.svg|png] [--ciudad "Ciudad"]
// Crea brands/<slug>/ (configuración validada, recursos, huecos, semilla SQL y
// CHECKLIST.md con los pasos y variables pendientes). No toca ninguna base de datos.
import { cpSync, existsSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { cargarMarca } from './vite-plugin-marca.js';
import { PREAJUSTES, type Preajuste } from '../src/marca/preajustes.js';


function mezclar(hex: string, con: string, peso: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(con.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(((a >> s) & 255) * (1 - peso) + ((b >> s) & 255) * peso));
  return `#${c.map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

const escaparTs = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

export interface OpcionesMarca {
  slug: string;
  nombre: string;
  preajuste?: Preajuste;
  color?: string;
  logo?: string;
  icono?: string;
  ciudad?: string;
  /** Raíz del repo donde se crea la marca (por defecto, el directorio actual). */
  raiz?: string;
}

export async function crearMarca(o: OpcionesMarca): Promise<string> {
  if (!/^[a-z0-9-]{2,40}$/.test(o.slug)) throw new Error('El slug debe tener 2–40 caracteres: minúsculas, números y guiones.');
  const RAIZ = resolve(o.raiz ?? process.cwd(), 'brands');
  if (o.slug === 'demo') throw new Error('«demo» es la plantilla; elige otro slug.');
  const destino = join(RAIZ, o.slug);
  if (existsSync(destino)) throw new Error(`Ya existe brands/${o.slug}.`);
  const preajuste = o.preajuste ?? 'restaurante';
  if (!(preajuste in PREAJUSTES)) throw new Error(`Preajuste desconocido: ${preajuste}`);
  const color = (o.color ?? '#18181B').toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(color)) throw new Error('El color debe tener formato #RRGGBB.');

  cpSync(join(RAIZ, 'demo'), destino, { recursive: true });
  try {
    let logoUrl = '/marca/logo.svg';
    let iconoFuente = 'recursos/icono.svg';
    if (o.logo) {
      const ext = extname(o.logo).toLowerCase();
      if (!['.svg', '.png', '.webp', '.jpg', '.jpeg'].includes(ext)) throw new Error('Logo: usa SVG, PNG, WebP o JPG.');
      copyFileSync(o.logo, join(destino, 'recursos', `logo${ext}`));
      if (ext !== '.svg') rmSync(join(destino, 'recursos', 'logo.svg'));
      logoUrl = `/marca/logo${ext}`;
    }
    const icono = o.icono ?? o.logo;
    if (icono) {
      const ext = extname(icono).toLowerCase();
      copyFileSync(icono, join(destino, 'recursos', `icono${ext}`));
      if (ext !== '.svg') rmSync(join(destino, 'recursos', 'icono.svg'));
      iconoFuente = `recursos/icono${ext}`;
    }

    const nombre = escaparTs(o.nombre);
    const corto = escaparTs(o.nombre.length > 24 ? o.nombre.slice(0, 24) : o.nombre);
    let cfg = readFileSync(join(RAIZ, 'demo', 'brand.config.ts'), 'utf8')
      .replace("// Marca neutra de ejemplo. Es la plantilla de `npm run nueva-marca`.", `// Marca «${nombre}». Generada con \`npm run nueva-marca\`: revisa CHECKLIST.md.`)
      .replace("slug: 'demo'", `slug: '${o.slug}'`)
      .replace("preajuste: 'restaurante'", `preajuste: '${preajuste}'`)
      .replace("name: 'Marca Demo'", `name: '${nombre}'`)
      .replace("shortName: 'Demo'", `shortName: '${corto}'`)
      .replace("legalName: 'Marca Demo S.L.'", "legalName: ''")
      .replace("slogan: 'Cocina de temporada'", "slogan: ''")
      .replace("email: 'hola@marca-demo.example'", "email: ''")
      .replace("city: 'Ciudad Demo'", `city: '${escaparTs(o.ciudad ?? '')}'`)
      .replace("primary: '#18181B'", `primary: '${color}'`)
      .replace("primaryHover: '#27272A'", `primaryHover: '${mezclar(color, '#000000', 0.15)}'`)
      .replace("primaryLight: '#F4F4F5'", `primaryLight: '${mezclar(color, '#FFFFFF', 0.9)}'`)
      .replace("logoUrl: '/marca/logo.svg'", `logoUrl: '${logoUrl}'`)
      .replace("iconoFuente: 'recursos/icono.svg'", `iconoFuente: '${iconoFuente}'`)
      .replace("splash: { title: 'Marca Demo'", `splash: { title: '${nombre}'`)
      .replace("clubName: 'Club Demo'", `clubName: 'Club ${corto}'`)
      .replace("ticketPrefix: 'DEMO'", `ticketPrefix: '${o.slug.replace(/[^a-z0-9]/g, '').slice(0, 6).toUpperCase() || 'PED'}'`)
      .replace("legal: { contactEmail: 'hola@marca-demo.example', dpoEmail: '' }", "legal: { contactEmail: '', dpoEmail: '' }")
      .replace("title: 'Marca Demo · Pide online'", `title: '${nombre} · Pide online'`)
      .replace("pwa: { themeColor: '#18181B', backgroundColor: '#FFFFFF', adminName: 'Panel Demo' }",
               `pwa: { themeColor: '${color}', backgroundColor: '#FFFFFF', adminName: 'Panel ${corto}' }`);
    writeFileSync(join(destino, 'brand.config.ts'), cfg);

    const semilla = readFileSync(join(destino, 'semilla.sql'), 'utf8')
      .replace("-- Semilla de la marca neutra «demo».", `-- Semilla inicial de «${o.nombre}» (copiada de la demo: sustituye la carta de ejemplo por la real).`)
      .replace("business_name = 'Marca Demo'", `business_name = '${o.nombre.replace(/'/g, "''")}'`)
      .replace("business_legal_name = 'Marca Demo S.L.'", 'business_legal_name = NULL')
      .replace("business_email = 'hola@marca-demo.example'", 'business_email = NULL')
      .replace("business_city = 'Ciudad Demo'", `business_city = ${o.ciudad ? `'${o.ciudad.replace(/'/g, "''")}'` : 'NULL'}`);
    writeFileSync(join(destino, 'semilla.sql'), semilla);

    // Validación completa: esquema de la marca e iconos generables.
    await cargarMarca(o.slug, resolve(RAIZ, '..'));

    writeFileSync(join(destino, 'CHECKLIST.md'), checklist(o.slug, o.nombre));
    return destino;
  } catch (err) {
    rmSync(destino, { recursive: true, force: true });
    throw err;
  }
}

function checklist(slug: string, nombre: string): string {
  return `# Alta de «${nombre}» (brands/${slug})

## Identidad (brands/${slug}/brand.config.ts)
- [ ] Datos legales: razón social, CIF, dirección, correo de contacto.
- [ ] Paleta completa (se ha derivado del color principal) y tipografías.
- [ ] Logo e icono definitivos en \`recursos/\` (icono cuadrado de 512 px o SVG).
- [ ] Textos del club de puntos, SEO (\`seo.siteUrl\` para el sitemap) y redes sociales.
- [ ] Módulos: revisa el preajuste y activa o desactiva lo que no aplique.
- [ ] Diseño de autor (opcional): componentes propios en \`huecos.tsx\`.

## Carta y negocio (brands/${slug}/semilla.sql)
- [ ] Sustituir la carta de ejemplo por la real: categorías, productos, precios, alérgenos y opciones.
- [ ] Tarifas de envío, pedido mínimo, envío gratis y códigos postales de reparto.
- [ ] Horario semanal (tabla store_hours).

## Base de datos (Neon)
- [ ] Crear el proyecto o la rama de Neon de la marca.
- [ ] \`MIGRATIONS_DATABASE_URL=… npm run db:migrar\`
- [ ] \`MIGRATIONS_DATABASE_URL=… npm run db:semilla -- ${slug}\`
- [ ] \`MIGRATIONS_DATABASE_URL=… npm run crear-admin -- <correo>\` → guardar la contraseña en el gestor.
- [ ] \`CREATE ROLE motor_api LOGIN PASSWORD '<aleatoria>' IN ROLE motor_app;\`

## Despliegue (Vercel)
- [ ] \`BRAND=${slug}\`
- [ ] \`APP_DATABASE_URL\` (rol motor_api, nunca el dueño)
- [ ] \`APP_JWT_SECRET\` (\`openssl rand -hex 32\`)
- [ ] \`APP_URL\` (dominio definitivo)
- [ ] Opcional: \`SMTP_*\`, \`VAPID_*\`, \`BLOB_READ_WRITE_TOKEN\`, \`PAGOS_PROVEEDOR\`
- [ ] Dominio o subdominio y comprobación de la PWA instalable en móvil.

## Comprobación final
- [ ] \`BRAND=${slug} npm run build\` sin errores.
- [ ] Pedido de prueba de punta a punta y ticket impreso.
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      nombre: { type: 'string' }, preajuste: { type: 'string' }, color: { type: 'string' },
      logo: { type: 'string' }, icono: { type: 'string' }, ciudad: { type: 'string' }
    }
  });
  const slug = positionals[0];
  if (!slug || !values.nombre) {
    console.error('Uso: npm run nueva-marca -- <slug> --nombre "Nombre" [--preajuste restaurante] [--color #RRGGBB] [--logo ruta] [--icono ruta] [--ciudad "Ciudad"]');
    process.exit(1);
  }
  crearMarca({ slug, nombre: values.nombre, preajuste: values.preajuste as Preajuste, color: values.color, logo: values.logo, icono: values.icono, ciudad: values.ciudad })
    .then((dir) => {
      console.log(`✓ Marca creada en ${dir}`);
      console.log(`  Siguiente: revisa ${dir}/CHECKLIST.md y prueba con: BRAND=${slug} npm run dev`);
    })
    .catch((err) => {
      console.error(`✗ ${err.message}`);
      process.exit(1);
    });
}
