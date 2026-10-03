import brand from 'virtual:marca-config';
import type { BrandConfig, Modulos } from './esquema';
import { variablesTema } from './tema';
export { hexARgb, variablesTema } from './tema';

// Punto único de acceso a la identidad de la marca activa. `@marca` apunta a
// brands/<slug> según la variable BRAND al compilar (por defecto «demo»).
export const BRAND: BrandConfig = brand;
export type { BrandConfig, Modulos };

export const moduloActivo = (m: keyof Modulos): boolean => BRAND.modulosActivos[m];

/** Aplica un tema en caliente (vista previa del editor en vivo). */
export function aplicarTema(t: BrandConfig['tema'], f: BrandConfig['fuentes'] = BRAND.fuentes): void {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(variablesTema(t, f))) root.style.setProperty(k, v);
  root.style.colorScheme = t.scheme;
}
