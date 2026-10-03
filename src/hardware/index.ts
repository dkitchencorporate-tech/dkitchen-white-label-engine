import { sendToNetworkPrinter } from '../utils/printerService';

// Capa de hardware: cada aparato del negocio (impresora de tickets, datáfono,
// cajón portamonedas, pantalla de cocina…) se maneja con un adaptador que
// cumple una interfaz común. Añadir un aparato nuevo = añadir un adaptador,
// sin tocar las pantallas del motor.

export interface TicketPedido {
  id: string;
  created_at?: string;
  client_name?: string;
  total?: number;
  [k: string]: unknown;
}

export interface Impresora {
  readonly id: string;
  readonly nombre: string;
  /** Devuelve false si el aparato no está disponible (para usar la alternativa). */
  imprimir(ticket: TicketPedido): Promise<boolean>;
}

export type ResultadoDatafono = { estado: 'aprobado'; referencia: string } | { estado: 'rechazado' | 'cancelado'; motivo?: string };

export interface Datafono {
  readonly id: string;
  readonly nombre: string;
  cobrar(importe: number, moneda: string, referenciaPedido: string): Promise<ResultadoDatafono>;
}

/** Impresora térmica ESC/POS en red, a través del puente local (utils/printerService). */
export const impresoraPuenteRed: Impresora = {
  id: 'puente-red',
  nombre: 'Impresora térmica en red (puente local)',
  imprimir: (ticket) => sendToNetworkPrinter(ticket)
};

/** Impresión del sistema (diálogo del navegador). Siempre disponible. */
export const impresoraNavegador: Impresora = {
  id: 'navegador',
  nombre: 'Impresora del sistema',
  async imprimir() {
    window.print();
    return true;
  }
};

/** Datáfono externo no integrado: el cobro se confirma a mano en el panel. */
export const datafonoManual: Datafono = {
  id: 'manual',
  nombre: 'Datáfono externo (confirmación manual)',
  async cobrar(_importe, _moneda, referenciaPedido) {
    return { estado: 'aprobado', referencia: `manual-${referenciaPedido}` };
  }
};

export const IMPRESORAS: Impresora[] = [impresoraPuenteRed, impresoraNavegador];
export const DATAFONOS: Datafono[] = [datafonoManual];

/** Imprime con el primer aparato disponible, en orden de preferencia. */
export async function imprimirTicket(ticket: TicketPedido, preferencia: Impresora[] = IMPRESORAS): Promise<string | null> {
  for (const impresora of preferencia) {
    try {
      if (await impresora.imprimir(ticket)) return impresora.id;
    } catch {
      /* se prueba el siguiente aparato */
    }
  }
  return null;
}
