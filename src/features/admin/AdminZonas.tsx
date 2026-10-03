import { useEffect, useState } from 'react';
import { api } from '../../lib/apiClient';

// Zonas de reparto (módulo «zonas»): códigos postales con envío, mínimo,
// tiempo y ajuste de precio propios. El servidor valida todo al guardar.

interface Zona {
  id?: number;
  name: string;
  postal_codes: string[];
  delivery_fee: number;
  min_order: number;
  free_delivery_over: number | null;
  eta_minutes: number;
  price_adjust_pct: number;
  is_active: boolean;
}

const NUEVA: Zona = {
  name: '', postal_codes: [], delivery_fee: 2.9, min_order: 15, free_delivery_over: 50,
  eta_minutes: 45, price_adjust_pct: 0, is_active: true
};

const campo = 'w-full bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-zinc-900';

export default function AdminZonas() {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [editando, setEditando] = useState<Zona | null>(null);
  const [cps, setCps] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    try {
      const { zones } = await api.get('/admin/zones');
      setZonas(zones || []);
    } catch (e: any) {
      setError(e.message || 'No se pudieron cargar las zonas.');
    }
  };
  useEffect(() => { cargar(); }, []);

  const abrir = (z: Zona) => { setEditando({ ...z }); setCps(z.postal_codes.join(', ')); setError(''); };

  const guardar = async () => {
    if (!editando) return;
    setGuardando(true);
    setError('');
    const datos = {
      ...editando,
      postal_codes: cps.split(/[\s,;]+/).map((c) => c.trim()).filter(Boolean),
      delivery_fee: Number(editando.delivery_fee), min_order: Number(editando.min_order),
      free_delivery_over: editando.free_delivery_over === null || String(editando.free_delivery_over) === '' ? null : Number(editando.free_delivery_over),
      eta_minutes: Number(editando.eta_minutes), price_adjust_pct: Number(editando.price_adjust_pct)
    };
    try {
      if (editando.id) await api.put('/admin/zones', datos);
      else await api.post('/admin/zones', datos);
      setEditando(null);
      await cargar();
    } catch (e: any) {
      setError(e.message || 'No se pudo guardar la zona.');
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (z: Zona) => {
    if (!z.id || !confirm(`¿Borrar la zona «${z.name}»? Los pedidos antiguos no se ven afectados.`)) return;
    await api.del('/admin/zones', { id: z.id });
    await cargar();
  };

  const set = (k: keyof Zona, v: unknown) => setEditando((e) => (e ? { ...e, [k]: v } : e));

  return (
    <section className="p-4 sm:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-black text-zinc-900">Zonas de reparto</h2>
          <p className="text-xs text-zinc-500">Cada código postal pertenece a una sola zona. El ajuste de precio se aplica a toda la carta en esa zona.</p>
        </div>
        <button onClick={() => abrir(NUEVA)} className="bg-zinc-900 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl">Nueva zona</button>
      </div>

      {error && !editando && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="grid gap-3">
        {zonas.map((z) => (
          <div key={z.id} className={`border rounded-2xl p-4 bg-white ${z.is_active ? 'border-zinc-200' : 'border-dashed border-zinc-300 opacity-60'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-zinc-900">{z.name} {!z.is_active && <span className="text-[10px] uppercase text-zinc-500">(inactiva)</span>}</p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Envío {Number(z.delivery_fee).toFixed(2)} € · mínimo {Number(z.min_order).toFixed(2)} €
                  {z.free_delivery_over != null && ` · gratis desde ${Number(z.free_delivery_over).toFixed(2)} €`} · ~{z.eta_minutes} min
                  {Number(z.price_adjust_pct) !== 0 && ` · precios ${Number(z.price_adjust_pct) > 0 ? '+' : ''}${Number(z.price_adjust_pct)} %`}
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">{z.postal_codes.join(', ')}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => abrir(z)} className="text-xs font-bold border border-zinc-300 rounded-lg px-3 py-1.5">Editar</button>
                <button onClick={() => borrar(z)} className="text-xs font-bold text-red-600 border border-red-200 rounded-lg px-3 py-1.5">Borrar</button>
              </div>
            </div>
          </div>
        ))}
        {zonas.length === 0 && <p className="text-sm text-zinc-500">Sin zonas: se usan la tarifa y los códigos postales generales de Ajustes.</p>}
      </div>

      {editando && (
        <div className="fixed inset-0 z-[3000] bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl p-5 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-zinc-900">{editando.id ? 'Editar zona' : 'Nueva zona'}</h3>
            <label className="block text-xs font-bold text-zinc-600">Nombre<input className={campo} value={editando.name} onChange={(e) => set('name', e.target.value)} maxLength={80} /></label>
            <label className="block text-xs font-bold text-zinc-600">Códigos postales (separados por comas)
              <textarea className={campo} rows={3} value={cps} onChange={(e) => setCps(e.target.value)} placeholder="28001, 28004, 28010" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-zinc-600">Envío (€)<input type="number" step="0.01" min="0" className={campo} value={editando.delivery_fee} onChange={(e) => set('delivery_fee', e.target.value)} /></label>
              <label className="block text-xs font-bold text-zinc-600">Pedido mínimo (€)<input type="number" step="0.01" min="0" className={campo} value={editando.min_order} onChange={(e) => set('min_order', e.target.value)} /></label>
              <label className="block text-xs font-bold text-zinc-600">Envío gratis desde (€)<input type="number" step="0.01" min="0" className={campo} value={editando.free_delivery_over ?? ''} onChange={(e) => set('free_delivery_over', e.target.value === '' ? null : e.target.value)} placeholder="Nunca" /></label>
              <label className="block text-xs font-bold text-zinc-600">Tiempo de entrega (min)<input type="number" min="5" className={campo} value={editando.eta_minutes} onChange={(e) => set('eta_minutes', e.target.value)} /></label>
              <label className="block text-xs font-bold text-zinc-600">Ajuste de precio (%)<input type="number" step="0.5" min="-50" max="100" className={campo} value={editando.price_adjust_pct} onChange={(e) => set('price_adjust_pct', e.target.value)} /></label>
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-600 mt-5"><input type="checkbox" checked={editando.is_active} onChange={(e) => set('is_active', e.target.checked)} />Activa</label>
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setEditando(null)} className="text-sm font-bold px-4 py-2">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="bg-zinc-900 text-white text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-50">{guardando ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
