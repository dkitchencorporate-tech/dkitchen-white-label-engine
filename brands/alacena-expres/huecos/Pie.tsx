import Footer from '../../../src/components/Footer';
import { useZonaStore } from '../../../src/store/zonaStore';

// Pie de Alacena: zonas, horario y aviso legal del alcohol, sobre el pie del motor
// (que mantiene los enlaces legales, contacto y créditos).
export default function Pie() {
  const zonas = useZonaStore((s) => s.zonas);
  return (
    <>
      <section className="bg-[#2A0E12] text-[#F6ECE4] relative overflow-hidden">
        <div className="alacena-grano absolute inset-0 opacity-[.12] mix-blend-overlay pointer-events-none" />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 grid gap-10 md:grid-cols-3 relative">
          <div>
            <p className="font-display text-3xl font-black">Alacena</p>
            <p className="text-[11px] font-extrabold tracking-[.35em] text-[#B8892F] mt-1">EXPRÉS · MADRID</p>
            <p className="mt-4 text-sm text-[#F6ECE4]/75 leading-relaxed max-w-xs">
              Tapeo, ibéricos y vinos gourmet en tu puerta. Seleccionamos cada producto como si fuera para nuestra mesa.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-extrabold tracking-[.25em] uppercase text-[#E7C77E]">Dónde llegamos</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {zonas.map((z) => (
                <li key={z.id} className="flex justify-between gap-4 border-b border-[#F6ECE4]/10 pb-2">
                  <span>{z.name}</span><span className="text-[#F6ECE4]/60 whitespace-nowrap">~{z.eta_minutes} min</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-extrabold tracking-[.25em] uppercase text-[#E7C77E]">Horario</h3>
            <p className="mt-4 text-sm leading-relaxed">Todos los días de 10:00 a 23:30.<br />Viernes y sábado hasta la 01:30.</p>
            <p className="mt-6 text-xs text-[#F6ECE4]/60 leading-relaxed border-l-2 border-[#B8892F] pl-3">
              Prohibida la venta de bebidas alcohólicas a menores de 18 años. El repartidor pedirá el DNI.
              Disfruta de un consumo responsable.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
