# Capas de pagos y hardware

Las dos capas siguen el mismo principio: **una interfaz en el motor y un adaptador por proveedor o aparato**. Cada marca usa su propia pasarela y los aparatos que ya tenga o compre, sin tocar el código del motor.

## Pagos (`api/_lib/pagos/proveedor.ts`)

```ts
interface ProveedorPago {
  crearCobro(s: SolicitudCobro): Promise<CobroCreado>;       // redirección a la página de pago
  consultarEstado(referencia): Promise<EstadoCobro>;          // estado REAL en la pasarela
  verificarNotificacion(cabeceras, cuerpoCrudo): Promise<{ referencia } | null>;
}
```

**Reglas:**
1. El importe sale siempre del pedido ya valorado por `process_checkout` (SQL), nunca del navegador.
2. Un webhook solo sirve para disparar `consultarEstado`. El pedido se marca como pagado solo cuando la pasarela lo confirma al consultarla.
3. La pasarela se elige con la variable `PAGOS_PROVEEDOR` (por defecto `manual`: efectivo o datáfono físico).

| Adaptador | Estado | Notas |
|---|---|---|
| `manual` | ✅ Hecho | Efectivo y datáfono físico; el pago online queda desactivado. |
| `sumup` | Pendiente | Referencia funcional: `nestor-pizzas-pwa` (`api/sumup-create-checkout.js`, `api/sumup-webhook.js`, `PaymentVerification.tsx`). Portarlo a la interfaz sin Supabase. |
| `revolut` | Pendiente | Revolut Business Merchant API (pedido → `checkout_url`, webhook firmado). Confirmar si admite Bizum. |
| `whop` | Pendiente | Pasarela actual de la plataforma QR. |

**Pendiente en base de datos (fase de pagos):** tabla `payments` (pedido, proveedor, referencia, estado, importe), estado de pago en `orders` y endpoint `orders?action=pay` con webhook idempotente.

## Hardware (`src/hardware/index.ts`)

```ts
interface Impresora { imprimir(ticket): Promise<boolean> }    // false = no disponible → se prueba la siguiente
interface Datafono  { cobrar(importe, moneda, ref): Promise<ResultadoDatafono> }
```

| Adaptador | Estado | Notas |
|---|---|---|
| `puente-red` (impresora) | ✅ Hecho | ESC/POS a impresora en red (puerto 9100) a través del puente local (`utils/printerService.ts`). |
| `navegador` (impresora) | ✅ Hecho | Diálogo de impresión del sistema; alternativa siempre disponible. |
| `manual` (datáfono) | ✅ Hecho | Datáfono no integrado; el cobro se confirma en el panel. |
| Bluetooth / USB | Pendiente | Web Serial / WebUSB / Web Bluetooth (Chrome en Android y escritorio) para impresoras térmicas sin puente. |
| Datáfono integrado | Pendiente | SumUp Terminal API o Revolut Terminal, según la pasarela de la marca. |
| Cajón portamonedas | Pendiente | Impulso ESC/POS desde la impresora. |
| Pantalla de cocina (KDS) | Pendiente | Vista del panel por estación (cocina o barra) dentro del comandero no fiscal. |

`imprimirTicket(ticket)` prueba los aparatos en orden de preferencia y devuelve el que imprimió. Las pantallas del motor deben usarlo en lugar de llamar a un aparato concreto. La migración de las llamadas actuales a `printerService` está prevista para la fase de comandero.
