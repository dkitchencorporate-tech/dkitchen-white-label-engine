// Pruebas unitarias de la lógica del frontend (sin navegador).
import { beforeEach, describe, expect, it } from 'vitest';
import { getOptionGroups } from '../src/data/products';
import { hexARgb, variablesTema } from '../src/marca/tema';
import { PREAJUSTES } from '../src/marca/preajustes';

describe('Opciones de producto', () => {
  it('lee los grupos del customization_schema y normaliza precios', () => {
    const g = getOptionGroups({
      customization_schema: {
        badge: 'Nuevo',
        groups: [{ id: 'extras', name: 'Extras', min: 0, max: 2, options: [{ id: 'queso', name: 'Queso', price: '1.5' }, { id: 'sal', name: 'Sal' }] }]
      }
    });
    expect(g).toHaveLength(1);
    expect(g[0].options[0].price).toBe(1.5);
    expect(g[0].options[1].price).toBe(0);
    expect(g[0].max).toBe(2);
  });

  it('tolera esquemas vacíos o mal formados sin romper la carta', () => {
    expect(getOptionGroups(null)).toEqual([]);
    expect(getOptionGroups({ customization_schema: {} })).toEqual([]);
    expect(getOptionGroups({ customization_schema: { groups: 'no-es-lista' } })).toEqual([]);
    expect(getOptionGroups({ customization_schema: { groups: [{ name: 'sin id', options: [] }] } })).toEqual([]);
  });
});

describe('Carrito', () => {
  let useCartStore: typeof import('../src/store/cartStore').useCartStore;
  beforeEach(async () => {
    ({ useCartStore } = await import('../src/store/cartStore'));
    useCartStore.getState().clearCart();
  });

  it('suma líneas por precio y cantidad, y actualiza cantidades', () => {
    const c = useCartStore.getState();
    c.addItem({ id: 'x', productId: '1', name: 'Plato', price: 10.9, quantity: 2, options: ['queso'] });
    c.addItem({ id: 'y', productId: '2', name: 'Agua', price: 1.5, quantity: 1 });
    expect(useCartStore.getState().getTotal()).toBeCloseTo(23.3, 2);
    const linea = useCartStore.getState().items.find((i) => i.productId === '2')!;
    useCartStore.getState().updateQuantity(linea.id, 3);
    expect(useCartStore.getState().getTotal()).toBeCloseTo(26.3, 2);
    useCartStore.getState().removeItem(linea.id);
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('conserva los ids de las opciones elegidas para que el servidor las valide', () => {
    useCartStore.getState().addItem({ id: 'z', productId: '1', name: 'Plato', price: 13.4, quantity: 1, options: ['queso', 'bacon'] });
    expect(useCartStore.getState().items[0].options).toEqual(['queso', 'bacon']);
  });
});

describe('Tema de marca', () => {
  it('convierte colores y genera todas las variables CSS', () => {
    expect(hexARgb('#B91C1C')).toBe('185 28 28');
    const v = variablesTema(
      { primary: '#B91C1C', primaryHover: '#991B1B', primaryLight: '#FEE2E2', accent: '#000000', accentHover: '#111111',
        surface: '#FFFFFF', card: '#FFFFFF', cardHover: '#FAFAFA', ink: '#111111', inkSoft: '#555555', border: '#E5E5E5',
        radius: 1, scheme: 'light' },
      { sans: 'Inter', display: 'Inter' }
    );
    expect(v['--brand-primary-rgb']).toBe('185 28 28');
    expect(v['--brand-radius']).toBe('1rem');
    expect(v['--font-sans']).toContain('Inter');
  });

  it('los cuatro preajustes definen todos los módulos', () => {
    const claves = Object.keys(PREAJUSTES.restaurante).sort();
    for (const p of Object.values(PREAJUSTES)) expect(Object.keys(p).sort()).toEqual(claves);
  });
});
