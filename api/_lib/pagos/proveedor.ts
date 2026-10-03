import { HttpError } from '../http.js';

// Capa de pagos: cada pasarela (SumUp, Revolut Business, Whop, Redsys…) es un
// adaptador que cumple esta interfaz. El motor nunca depende de una pasarela
// concreta y nunca confía en el navegador: el importe sale del pedido ya
// calculado en SQL y el estado final se consulta siempre en la pasarela.

export type EstadoCobro = 'pendiente' | 'pagado' | 'fallido' | 'caducado';

export interface SolicitudCobro {
  /** Pedido ya creado y valorado por process_checkout. */
  pedidoId: string;
  /** Importe en la moneda indicada, tal como lo calculó el servidor. */
  importe: number;
  moneda: string;
  descripcion: string;
  /** URL a la que vuelve el cliente tras pagar (página de verificación). */
  urlRetorno: string;
}

export interface CobroCreado {
  /** Identificador del cobro en la pasarela. */
  referencia: string;
  /** Página de pago alojada por la pasarela (redirección). */
  urlPago: string;
}

export interface ProveedorPago {
  readonly id: string;
  readonly nombre: string;
  crearCobro(s: SolicitudCobro): Promise<CobroCreado>;
  /** Estado real consultado en la pasarela (nunca el que diga el navegador). */
  consultarEstado(referencia: string): Promise<EstadoCobro>;
  /**
   * Verifica que una notificación (webhook) es auténtica y devuelve la
   * referencia del cobro. El webhook solo dispara una nueva consulta del
   * estado; nunca marca un pedido como pagado por sí mismo.
   */
  verificarNotificacion(cabeceras: Record<string, string | string[] | undefined>, cuerpoCrudo: string): Promise<{ referencia: string } | null>;
}

/** Sin pasarela online: efectivo y datáfono físico, que se cobran en el local o en la entrega. */
export const proveedorManual: ProveedorPago = {
  id: 'manual',
  nombre: 'Efectivo / datáfono físico',
  async crearCobro() {
    throw new HttpError(400, 'El pago online no está activado en este local.');
  },
  async consultarEstado() {
    return 'pendiente';
  },
  async verificarNotificacion() {
    return null;
  }
};

const PROVEEDORES: Record<string, ProveedorPago> = {
  manual: proveedorManual
  // sumup: proveedorSumUp,      → docs/PAGOS_Y_HARDWARE.md (referencia: integración de Néstor Pizzas)
  // revolut: proveedorRevolut,  → Revolut Business Merchant API
  // whop: proveedorWhop,
};

/** Pasarela configurada para esta marca (variable PAGOS_PROVEEDOR; por defecto «manual»). */
export function proveedorPago(): ProveedorPago {
  const id = process.env.PAGOS_PROVEEDOR || 'manual';
  const p = PROVEEDORES[id];
  if (!p) throw new Error(`Pasarela de pago desconocida: ${id}`);
  return p;
}
