import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Zonas de reparto con precio propio (módulo «zonas»). El navegador solo
// muestra precios orientativos: el servidor decide la zona por el código postal
// del pedido y recalcula todo con el mismo redondeo.

export interface Zona {
  id: number;
  name: string;
  postal_codes: string[];
  delivery_fee: number;
  min_order: number;
  free_delivery_over: number | null;
  eta_minutes: number;
  price_adjust_pct: number;
}

interface ZonaState {
  zonas: Zona[];
  codigoPostal: string | null;
  setZonas: (zonas: Zona[]) => void;
  setCodigoPostal: (cp: string | null) => void;
}

export const useZonaStore = create<ZonaState>()(
  persist(
    (set) => ({
      zonas: [],
      codigoPostal: null,
      setZonas: (zonas) => set({ zonas }),
      setCodigoPostal: (codigoPostal) => set({ codigoPostal })
    }),
    { name: 'brand-zona', partialize: (s) => ({ codigoPostal: s.codigoPostal }) }
  )
);

export const zonaDe = (zonas: Zona[], cp: string | null): Zona | null =>
  (cp && zonas.find((z) => z.postal_codes.includes(cp))) || null;

/** Zona elegida por el cliente (o null si no hay zonas o no ha elegido). */
export const useZonaActual = (): Zona | null => useZonaStore((s) => zonaDe(s.zonas, s.codigoPostal));

/** Ajuste de precio de la zona elegida, en %. */
export const ajusteActual = (): number => {
  const s = useZonaStore.getState();
  return zonaDe(s.zonas, s.codigoPostal)?.price_adjust_pct ?? 0;
};

/**
 * Precio con el ajuste de zona, redondeado a céntimos igual que el servidor
 * (round(numeric, 2): la mitad se redondea hacia arriba). Se calcula en
 * céntimos enteros para evitar errores de coma flotante.
 */
export function precioZona(base: number, pct: number = ajusteActual()): number {
  const centimos = Math.round(base * 100);
  if (!pct) return centimos / 100;
  return Math.round((centimos * (10000 + Math.round(pct * 100))) / 10000) / 100;
}

export const formatoEuros = (n: number): string => `${n.toFixed(2).replace('.', ',')} €`;
