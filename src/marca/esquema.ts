import { z } from 'zod';
import { PREAJUSTES, type Preajuste } from './preajustes.js';

// Esquema de la configuración de una marca (brands/<slug>/brand.config.ts).
// Se valida al compilar y al arrancar: una marca mal configurada no llega a
// producción. Toda la identidad sale de aquí; el motor no conoce ninguna marca.

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color en formato #RRGGBB');
const url = z.string().url();
const ruta = z.string().regex(/^\/[^\s]*$/, 'Ruta absoluta que empiece por /');

export const temaSchema = z.object({
  primary: hex,
  primaryHover: hex,
  primaryLight: hex,
  accent: hex,
  accentHover: hex,
  surface: hex,
  card: hex,
  cardHover: hex,
  ink: hex,
  inkSoft: hex,
  border: hex,
  /** Radio base de tarjetas y botones (rem). */
  radius: z.number().min(0).max(3).default(1.5),
  /** Esquema de color de la interfaz del sistema (barra de estado, formularios). */
  scheme: z.enum(['light', 'dark']).default('light')
});

export const modulosSchema = z.object({
  domicilio: z.boolean(),
  recogida: z.boolean(),
  pedidoEnMesa: z.boolean(),
  kiosko: z.boolean(),
  reservas: z.boolean(),
  editorSala: z.boolean(),
  comandero: z.boolean(),
  fidelizacion: z.boolean(),
  inventario: z.boolean(),
  marcasVirtuales: z.boolean(),
  /** Zonas de reparto por código postal con precio, envío y tiempo propios. */
  zonas: z.boolean(),
  /** Pedido como regalo con mensaje. */
  regalos: z.boolean()
});
export type Modulos = z.infer<typeof modulosSchema>;

export const brandSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]{2,40}$/, 'slug en minúsculas, números y guiones'),
    preajuste: z.enum(Object.keys(PREAJUSTES) as [Preajuste, ...Preajuste[]]),
    /** Activa o desactiva módulos respecto al preajuste. */
    modulos: modulosSchema.partial().default({}),

    // Identidad
    name: z.string().min(1).max(80),
    shortName: z.string().min(1).max(24),
    legalName: z.string().max(200).default(''),
    slogan: z.string().max(120).default(''),
    cif: z.string().max(20).default(''),

    // Contacto
    phone: z.string().max(30).default(''),
    email: z.string().email().or(z.literal('')).default(''),
    address: z.string().max(200).default(''),
    city: z.string().max(100).default(''),

    tema: temaSchema,
    fuentes: z
      .object({
        sans: z.string().min(1).default('system-ui'),
        display: z.string().min(1).default('system-ui'),
        /** Hoja de Google Fonts (opcional). Vacío = solo fuentes del sistema o autoalojadas. */
        googleFontsUrl: url.startsWith('https://fonts.googleapis.com/').optional()
      })
      .default({ sans: 'system-ui', display: 'system-ui' }),

    // Recursos (archivos en brands/<slug>/recursos/, servidos en /marca/*)
    assets: z.object({
      logoUrl: ruta,
      logoDarkUrl: ruta.optional(),
      heroBannerUrl: ruta.or(z.literal('')).default(''),
      placeholderProductUrl: ruta,
      /** Imagen cuadrada (≥ 512 px) de la que salen los iconos de la PWA. */
      iconoFuente: z.string().min(1)
    }),

    splash: z.object({
      title: z.string().max(80),
      subtitle: z.string().max(120).default(''),
      durationMs: z.number().int().min(0).max(5000).default(1200)
    }),

    loyalty: z.object({
      clubName: z.string().max(60),
      badgeText: z.string().max(40),
      heroTitle: z.string().max(80),
      heroSubtitle: z.string().max(80),
      heroDescription: z.string().max(240),
      rewardDescription: z.string().max(120)
    }),

    orderDefaults: z.object({
      currency: z.string().length(3).default('EUR'),
      currencySymbol: z.string().max(3).default('€'),
      estimatedDeliveryMinutes: z.string().max(20).default('30-45 min'),
      estimatedPickupMinutes: z.string().max(20).default('15-20 min'),
      upsellNotice: z.string().max(120).default(''),
      ticketPrefix: z.string().regex(/^[A-Z0-9]{1,6}$/).default('PED')
    }),

    social: z
      .object({
        instagram: url.optional(),
        tiktok: url.optional(),
        googleReviewUrl: url.optional(),
        whatsapp: z.string().max(20).optional()
      })
      .default({}),

    legal: z
      .object({
        contactEmail: z.string().email().or(z.literal('')).default(''),
        dpoEmail: z.string().email().or(z.literal('')).default('')
      })
      .default({ contactEmail: '', dpoEmail: '' }),

    seo: z.object({
      title: z.string().max(70),
      description: z.string().max(170),
      siteUrl: url.optional(),
      lang: z.string().default('es')
    }),

    pwa: z.object({
      themeColor: hex,
      backgroundColor: hex,
      adminName: z.string().max(40).default('Panel')
    }),

    /** Firma del estudio en el pie (configurable por marca). */
    creditos: z
      .object({ mostrar: z.boolean(), texto: z.string().max(80), url: url.optional() })
      .default({ mostrar: false, texto: '' })
  })
  .transform((b) => ({ ...b, modulosActivos: { ...PREAJUSTES[b.preajuste], ...b.modulos } as Modulos }));

export type BrandConfigInput = z.input<typeof brandSchema>;
export type BrandConfig = z.output<typeof brandSchema>;

/** Valida la configuración de una marca. Lanza con un mensaje claro si algo falla. */
export function validarMarca(config: BrandConfigInput): BrandConfig {
  const r = brandSchema.safeParse(config);
  if (!r.success) {
    const detalle = r.error.issues.map((i) => `  · ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Configuración de marca no válida:\n${detalle}`);
  }
  return r.data;
}
