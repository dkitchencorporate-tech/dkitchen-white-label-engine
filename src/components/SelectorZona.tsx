import { useState } from 'react';
import { moduloActivo } from '../marca';
import { formatoEuros, useZonaActual, useZonaStore, zonaDe } from '../store/zonaStore';

// Selector de zona de reparto por código postal (módulo «zonas»). Se pide al
// entrar si la marca tiene zonas, y queda como un chip para cambiarla.
export default function SelectorZona() {
  const zonas = useZonaStore((s) => s.zonas);
  const setCodigoPostal = useZonaStore((s) => s.setCodigoPostal);
  const zona = useZonaActual();
  const [abierto, setAbierto] = useState(false);
  const [cp, setCp] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!moduloActivo('zonas') || zonas.length === 0) return null;
  const mostrarModal = abierto || !zona;

  const confirmar = (e: React.FormEvent) => {
    e.preventDefault();
    const limpio = cp.trim();
    if (!/^\d{5}$/.test(limpio)) return setError('Escribe un código postal de 5 cifras.');
    if (!zonaDe(zonas, limpio)) return setError(`Todavía no llegamos al ${limpio}. Mira abajo las zonas en las que repartimos.`);
    setCodigoPostal(limpio);
    setError(null);
    setAbierto(false);
  };

  return (
    <>
      {zona && (
        <button
          type="button"
          onClick={() => { setCp(useZonaStore.getState().codigoPostal ?? ''); setAbierto(true); }}
          className="fixed top-[72px] left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur border border-brand-border shadow-lg rounded-full px-4 py-2 text-xs font-bold text-brand-ink flex items-center gap-2 max-w-[92vw]"
          aria-label={`Zona de entrega: ${zona.name}. Cambiar`}
        >
          <span aria-hidden>📍</span>
          <span className="truncate">{useZonaStore.getState().codigoPostal} · {zona.name} · ~{zona.eta_minutes} min</span>
          <span className="text-brand-primary underline">Cambiar</span>
        </button>
      )}

      {mostrarModal && (
        <div className="fixed inset-0 z-[1150] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-zona">
          <form onSubmit={confirmar} className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 id="titulo-zona" className="font-display font-black text-2xl text-brand-ink">¿Dónde te lo llevamos?</h2>
            <p className="text-sm text-brand-inkSoft mt-1">Los precios, el envío y el tiempo de entrega dependen de tu zona.</p>
            <label className="block mt-5 text-xs font-bold uppercase tracking-wider text-brand-inkSoft" htmlFor="cp-zona">Código postal</label>
            <input
              id="cp-zona" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={cp}
              onChange={(e) => setCp(e.target.value.replace(/\D/g, ''))}
              placeholder="28004"
              className="mt-1 w-full border-2 border-brand-border focus:border-brand-primary rounded-2xl px-4 py-3 text-lg font-bold tracking-widest outline-none"
            />
            {error && <p className="mt-2 text-sm font-semibold text-red-600" role="alert">{error}</p>}
            <button type="submit" className="mt-4 w-full bg-brand-primary hover:bg-brand-primaryHover text-white font-display font-black uppercase tracking-wider py-3.5 rounded-2xl">
              Ver precios de mi zona
            </button>
            {zona && (
              <button type="button" onClick={() => setAbierto(false)} className="mt-2 w-full text-sm font-semibold text-brand-inkSoft py-2">Cancelar</button>
            )}
            <ul className="mt-5 space-y-2">
              {zonas.map((z) => (
                <li key={z.id} className="text-xs text-brand-inkSoft border border-brand-border rounded-2xl px-3 py-2">
                  <span className="font-bold text-brand-ink">{z.name}</span> · ~{z.eta_minutes} min · envío {formatoEuros(Number(z.delivery_fee))}
                  {z.free_delivery_over != null && <> (gratis desde {formatoEuros(Number(z.free_delivery_over))})</>}
                  {' '}· mínimo {formatoEuros(Number(z.min_order))}
                  <span className="block text-[11px] mt-0.5 opacity-80">CP {z.postal_codes.slice(0, 8).join(', ')}{z.postal_codes.length > 8 ? '…' : ''}</span>
                </li>
              ))}
            </ul>
          </form>
        </div>
      )}
    </>
  );
}
