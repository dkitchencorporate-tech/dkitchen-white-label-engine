// Módulos activos por defecto según el tipo de negocio. Cada marca puede
// activar o desactivar módulos concretos en su brand.config.ts.
// Los módulos marcados como futuros existen ya como interruptor para que la
// configuración de las marcas no cambie cuando se implementen.

export const PREAJUSTES = {
  restaurante: {
    domicilio: true, recogida: true, pedidoEnMesa: true, kiosko: true,
    reservas: true, editorSala: true, comandero: true, fidelizacion: true,
    inventario: false, marcasVirtuales: false
  },
  bar: {
    domicilio: false, recogida: true, pedidoEnMesa: true, kiosko: true,
    reservas: false, editorSala: true, comandero: true, fidelizacion: true,
    inventario: false, marcasVirtuales: false
  },
  dark_kitchen: {
    domicilio: true, recogida: true, pedidoEnMesa: false, kiosko: true,
    reservas: false, editorSala: false, comandero: false, fidelizacion: true,
    inventario: false, marcasVirtuales: true
  },
  dark_store: {
    domicilio: true, recogida: true, pedidoEnMesa: false, kiosko: false,
    reservas: false, editorSala: false, comandero: false, fidelizacion: true,
    inventario: true, marcasVirtuales: false
  }
} as const;

export type Preajuste = keyof typeof PREAJUSTES;
