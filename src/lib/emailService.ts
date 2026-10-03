/**
 * Los correos transaccionales (confirmación de pedido, aviso al negocio,
 * verificación de cuenta) los envía el servidor en el momento en que ocurre
 * cada acción. El navegador ya no puede pedir envíos de correo: así nadie
 * puede usar la web para mandar correos en nombre de la marca.
 *
 * Se conserva esta interfaz para no romper llamadas existentes; no hace nada.
 */
export const emailService = {
  sendOrderConfirmation: (_clientEmail: string, _orderDetails: unknown) => undefined,
  sendOrderToAdmin: (_orderDetails: unknown) => undefined,
  sendWelcomeEmail: (_email: string, _name?: string) => undefined
};
