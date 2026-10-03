import { generateSafeUUID } from '../utils/uuid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { precioZona } from './zonaStore';

export interface CartItem {
  id: string;
  // Identificador UUID del producto en base de datos Postgres/Neon.
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  extras?: string[];
  /** Ids de las opciones elegidas (el servidor las valida y les pone precio). */
  options?: string[];
  size?: string;
  /** Producto con alcohol (exige declarar la mayoría de edad al pedir). */
  isAlcohol?: boolean;
}

interface CartState {
  items: CartItem[];
  kioskClientInfo?: { name: string; phone: string; email: string };
  setKioskClientInfo: (info?: { name: string; phone: string; email: string }) => void;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  /** Total con el ajuste de precio de la zona elegida (pct = 0 para precios base). */
  getTotal: (pct?: number) => number;
  lastUpdated: number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      lastUpdated: Date.now(),
      kioskClientInfo: undefined,
      setKioskClientInfo: (info) => set({ kioskClientInfo: info, lastUpdated: Date.now() }),
      addItem: (item) => set((state) => {
        return { items: [...state.items, { ...item, id: generateSafeUUID() }], lastUpdated: Date.now() };
      }),
      removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        lastUpdated: Date.now()
      })),
      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, quantity } : item
        ),
        lastUpdated: Date.now()
      })),
      clearCart: () => set({ items: [], kioskClientInfo: undefined, lastUpdated: Date.now() }),
      getTotal: (pct) => {
        const items = get().items;
        return Math.round(items.reduce((total, item) => total + precioZona(item.price, pct) * item.quantity, 0) * 100) / 100;
      }
    }),
    {
      name: 'brand-cart'
    }
  )
);
