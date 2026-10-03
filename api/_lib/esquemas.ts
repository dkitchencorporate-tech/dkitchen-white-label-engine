import { z } from 'zod';

// Validación de entrada de toda la API. Los importes NUNCA se aceptan del
// cliente: los campos de precio que envíe el frontend se descartan.

export const ALERGENOS = [
  'gluten', 'crustaceos', 'huevos', 'pescado', 'cacahuetes', 'soja', 'lacteos',
  'frutos_cascara', 'apio', 'mostaza', 'sesamo', 'sulfitos', 'altramuces', 'moluscos'
] as const;

const texto = (max: number) => z.string().trim().max(max);
const textoObligatorio = (max: number) => z.string().trim().min(1, 'Obligatorio').max(max);
export const telefono = z.string().trim().regex(/^[\d\s+\-()]{6,25}$/, 'Teléfono no válido');
export const email = z.string().trim().toLowerCase().email('Correo no válido').max(255);
export const uuid = z.string().uuid('Identificador no válido');
const idNumerico = z.coerce.number().int().positive();

// ---------- Cuentas ----------
export const loginSchema = z
  .object({
    identifier: texto(255).optional(),
    email: texto(255).optional(),
    phone: texto(30).optional(),
    password: z.string().min(1).max(128)
  })
  .transform((d) => ({ identificador: (d.identifier || d.email || d.phone || '').toLowerCase(), password: d.password }))
  .refine((d) => d.identificador.length > 0, { message: 'Faltan credenciales' });

const direccion = z.record(z.string(), z.unknown()).refine((o) => JSON.stringify(o).length <= 1000, 'Dirección demasiado larga');

export const registroSchema = z.object({
  full_name: textoObligatorio(150).refine((s) => s.length >= 2, 'Nombre demasiado corto'),
  phone: telefono,
  email,
  password: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres').max(128),
  address: direccion.optional().nullable()
});

export const perfilUpdateSchema = z.object({
  full_name: textoObligatorio(150).optional(),
  phone: telefono.optional(),
  email: email.optional(),
  address: direccion.optional().nullable()
});

// ---------- Pedidos ----------
const lineaPedido = z.object({
  product_id: idNumerico,
  quantity: z.coerce.number().int().min(1).max(50),
  options: z.array(texto(80)).max(20).optional(),
  notes: texto(200).optional(),
  // Compatibilidad con el frontend actual (extras por nombre dentro de customization_details).
  customization_details: z
    .object({ extras: z.array(texto(80)).max(20).optional(), notes: texto(200).optional() })
    .passthrough()
    .optional()
});

export const checkoutSchema = z.object({
  client_name: textoObligatorio(70),
  client_phone: telefono,
  delivery_method: z.enum(['delivery', 'pickup', 'local']),
  delivery_address: z.union([texto(250), direccion]).optional().nullable(),
  items: z.array(lineaPedido).min(1).max(30),
  points_redeemed: z.boolean().optional().default(false),
  notes: texto(300).optional().nullable(),
  payment_method: z.enum(['cash', 'card_delivery', 'tpv', 'physical', 'online']).optional().default('cash'),
  scheduled_for: z.string().datetime({ offset: true }).optional().nullable(),
  scheduled_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable(),
  idempotency_key: uuid.optional().nullable(),
  source: z.enum(['web', 'kiosk']).optional().default('web')
});

export const reviewSchema = z.object({
  orderId: uuid,
  rating: z.coerce.number().int().min(1).max(5),
  comment: texto(1000).optional().nullable()
});

// ---------- Catálogo (admin) ----------
export const customizationSchema = z
  .object({
    badge: texto(50).optional(),
    groups: z
      .array(
        z.object({
          id: z.string().trim().regex(/^[a-z0-9_-]{1,40}$/, 'Id de grupo no válido'),
          name: textoObligatorio(60),
          min: z.number().int().min(0).max(20).default(0),
          max: z.number().int().min(1).max(20).optional(),
          options: z
            .array(
              z.object({
                id: z.string().trim().regex(/^[a-z0-9_-]{1,40}$/, 'Id de opción no válido'),
                name: textoObligatorio(80),
                price: z.number().min(0).max(999).default(0)
              })
            )
            .min(1)
            .max(40)
        })
      )
      .max(10)
      .optional()
  })
  .passthrough();

const categoria = z.object({
  name: textoObligatorio(100),
  subtitle: texto(150).optional().nullable(),
  description: texto(2000).optional().nullable(),
  sort_order: z.coerce.number().int().optional(),
  is_active: z.boolean().optional()
});

const subcategoria = z.object({
  category_id: idNumerico,
  name: textoObligatorio(100),
  sort_order: z.coerce.number().int().optional(),
  is_active: z.boolean().optional()
});

const producto = z.object({
  category_id: idNumerico.nullable().optional(),
  subcategory_id: idNumerico.nullable().optional(),
  name: textoObligatorio(150),
  description: texto(2000).optional().nullable(),
  price: z.coerce.number().min(0).max(9999),
  image_url: z.string().trim().url().max(1000).optional().nullable().or(z.literal('')),
  is_available: z.boolean().optional(),
  is_upsell: z.boolean().optional(),
  badge: texto(50).optional().nullable(),
  allergens: z.array(z.enum(ALERGENOS)).max(14).optional(),
  customization_schema: customizationSchema.optional(),
  sort_order: z.coerce.number().int().optional()
});

export const catalogoAltaSchema = z.discriminatedUnion('type', [
  categoria.extend({ type: z.literal('category') }),
  subcategoria.extend({ type: z.literal('subcategory') }),
  producto.extend({ type: z.literal('product') })
]);

export const catalogoEdicionSchema = z.discriminatedUnion('type', [
  categoria.partial().extend({ type: z.literal('category'), id: idNumerico }),
  subcategoria.partial().extend({ type: z.literal('subcategory'), id: idNumerico }),
  producto.partial().extend({ type: z.literal('product'), id: idNumerico })
]);

export const catalogoBorradoSchema = z.object({
  type: z.enum(['category', 'subcategory', 'product']),
  id: idNumerico
});

// ---------- Ajustes (admin) ----------
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const ajustesSchema = z.object({
  settings: z
    .object({
      is_store_open: z.boolean(),
      saturation_mode: z.boolean(),
      delivery_enabled: z.boolean(),
      pickup_enabled: z.boolean(),
      delivery_fee: z.coerce.number().min(0).max(100),
      min_order_delivery: z.coerce.number().min(0).max(1000),
      free_delivery_threshold: z.coerce.number().min(0).max(1000).nullable(),
      estimated_prep_time: texto(50),
      prep_minutes: z.coerce.number().int().min(0).max(240),
      postal_codes_allowed: z.array(z.string().regex(/^\d{5}$/)).max(200),
      loyalty_enabled: z.boolean(),
      loyalty_points_per_10: z.coerce.number().int().min(0).max(100),
      loyalty_reward_points: z.coerce.number().int().min(1).max(10000),
      business_name: texto(150).nullable(),
      business_legal_name: texto(200).nullable(),
      business_cif: texto(50).nullable(),
      business_phone: texto(50).nullable(),
      business_whatsapp: texto(50).nullable(),
      business_email: z.string().trim().email().max(150).nullable().or(z.literal('')),
      business_address: texto(255).nullable(),
      business_city: texto(100).nullable(),
      business_postal_code: texto(20).nullable()
    })
    .partial()
    .optional(),
  hours: z
    .array(z.object({ day_of_week: z.number().int().min(0).max(6), is_open: z.boolean(), open_time: hora, close_time: hora }))
    .max(7)
    .optional()
});

export const pedidoAdminSchema = z.object({
  id: uuid,
  status: z.enum(['pending', 'cooking', 'ready', 'delivering', 'delivered', 'cancelled']).optional(),
  notes: texto(500).optional().nullable(),
  estimated_ready_at: z.string().datetime({ offset: true }).optional().nullable(),
  payment_method: z.enum(['cash', 'card_delivery', 'tpv', 'physical', 'online']).optional(),
  items: z
    .array(
      z.object({
        id: z.coerce.number().int().positive(),
        is_sent_to_kitchen: z.boolean().optional(),
        customization_details: z.record(z.string(), z.unknown()).optional()
      })
    )
    .max(100)
    .optional()
});

export const clienteKioskoSchema = z.object({
  phone: telefono,
  name: texto(150).optional().nullable(),
  address: z.union([texto(250), direccion]).optional().nullable(),
  originalPhone: telefono.optional().nullable()
});

export const upsellSchema = z.object({
  product_id: idNumerico,
  category: textoObligatorio(100),
  sort_order: z.coerce.number().int().optional()
});

export const campanaSchema = z.object({
  subject: textoObligatorio(150),
  headline: texto(150).optional().nullable(),
  message: textoObligatorio(5000),
  flyerUrl: z.string().url().startsWith('https://').max(1000).optional().nullable().or(z.literal('')),
  ctaText: texto(40).optional().nullable(),
  ctaUrl: z.string().url().startsWith('https://').max(1000).optional().nullable().or(z.literal('')),
  recipients: z.array(email).max(2000).optional()
});

export const pushSchema = z.object({
  phone: telefono,
  subscription: z.object({
    endpoint: z.string().url().startsWith('https://').max(1000),
    keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) })
  })
});
