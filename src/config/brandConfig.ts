// Compatibilidad: los componentes del motor importan BRAND_CONFIG desde aquí.
// La identidad real vive en brands/<slug>/brand.config.ts (validada con zod);
// este módulo solo la reexporta. No añadas datos de ninguna marca aquí.
import { BRAND } from '../marca';

export type { BrandConfig } from '../marca';

export const BRAND_CONFIG = {
  ...BRAND,
  /** Alias del nombre antiguo del tema. */
  theme: BRAND.tema,
  loyalty: { ...BRAND.loyalty, enabled: BRAND.modulosActivos.fidelizacion }
};
