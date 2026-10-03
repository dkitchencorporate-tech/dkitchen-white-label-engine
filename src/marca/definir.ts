import type { BrandConfigInput } from './esquema';

// Las marcas declaran su configuración con defineBrand() para tener tipos y
// autocompletado. La validación (zod) la hace el plugin de Vite al compilar,
// así zod no viaja al navegador.
export function defineBrand(config: BrandConfigInput): BrandConfigInput {
  return config;
}
