import { lazy, Suspense, useEffect, useRef } from 'react';
import { useZonaActual, useZonaStore } from '../../../src/store/zonaStore';

// Portada de Alacena: foto a sangre con parallax, titular editorial, llamadas a la
// acción y escaparate 3D (three.js se descarga después, sin frenar la carta).
const Escaparate3D = lazy(() => import('./Escaparate3D'));

const irACombos = () => {
  const titulo = Array.from(document.querySelectorAll('h2')).find((h) => h.textContent?.trim().toLowerCase() === 'combos');
  (titulo ?? document.querySelector('main'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export default function Portada() {
  const foto = useRef<HTMLDivElement>(null);
  const zona = useZonaActual();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let marco = 0;
    const alDesplazar = () => {
      cancelAnimationFrame(marco);
      marco = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 900);
        if (foto.current) foto.current.style.transform = `translate3d(0, ${y * 0.35}px, 0) scale(1.08)`;
      });
    };
    window.addEventListener('scroll', alDesplazar, { passive: true });
    return () => { window.removeEventListener('scroll', alDesplazar); cancelAnimationFrame(marco); };
  }, []);

  return (
    <section className="alacena-portada relative overflow-hidden isolate text-[#FBF7F0]" aria-label="Alacena Exprés">
      <div ref={foto} className="absolute inset-0 -z-20 will-change-transform" style={{ transform: 'scale(1.08)' }}>
        <img src="/marca/productos/pack-reunion-expres.webp" alt="" className="w-full h-full object-cover" fetchPriority="high" />
      </div>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(105deg,rgba(28,10,12,.92)_0%,rgba(42,14,18,.78)_45%,rgba(42,14,18,.35)_100%)]" />
      <div className="alacena-grano absolute inset-0 -z-10 opacity-[.18] mix-blend-overlay pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-20 pb-6 sm:pt-28 sm:pb-14 grid lg:grid-cols-[1.1fr_.9fr] gap-2 sm:gap-6 items-center">
        <div className="alacena-entrada">
          <p className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-extrabold tracking-[.25em] uppercase text-[#E7C77E]">
            <span className="w-8 h-px bg-[#E7C77E]" aria-hidden /> Madrid · en 30 minutos
          </p>
          <h1 className="mt-3 font-display font-black text-[2.05rem] leading-[1.03] sm:text-6xl lg:text-7xl tracking-tight">
            La despensa gourmet <em className="not-italic text-[#E7C77E]">que llega</em> a tu puerta
          </h1>
          <p className="mt-4 max-w-xl text-sm sm:text-lg text-[#F6ECE4]/85 leading-relaxed">
            Ibéricos a cuchillo, quesos DOP, conservas, vinos, cava y cerveza bien fría.
            <span className="hidden sm:inline"> Para el día a día, la fiesta de esta noche o un regalo de último momento.</span>
          </p>
          <div className="mt-5 sm:mt-7 flex gap-2 sm:gap-3">
            <button type="button" onClick={irACombos}
              className="alacena-boton-oro shrink-0 px-5 sm:px-6 py-3 sm:py-3.5 rounded-full font-extrabold text-xs sm:text-sm uppercase tracking-wider text-[#2A1A14]">
              Ver combos
            </button>
            <button type="button" onClick={() => useZonaStore.getState().setCodigoPostal(null)}
              className="min-w-0 truncate px-4 sm:px-6 py-3 sm:py-3.5 rounded-full font-bold text-xs sm:text-sm border border-[#F6ECE4]/40 hover:border-[#E7C77E] hover:text-[#E7C77E] transition-colors backdrop-blur-sm">
              {zona ? `Entrega en ${zona.name} · ~${zona.eta_minutes} min` : 'Elegir mi zona'}
            </button>
          </div>
          <ul className="mt-5 sm:mt-8 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] sm:text-xs font-semibold text-[#F6ECE4]/75">
            <li>✦ Envío gratis desde 60 €</li>
            <li>✦ Pago al recibir</li>
            <li>✦ Regalos con tarjeta</li>
            <li>✦ +18 · DNI en la entrega</li>
          </ul>
        </div>

        <div className="relative h-[250px] sm:h-[380px] lg:h-[460px]">
          <div className="absolute inset-x-6 bottom-6 h-24 rounded-full bg-[#E7C77E]/20 blur-3xl" aria-hidden />
          <Suspense fallback={null}>
            <Escaparate3D className="absolute inset-0" />
          </Suspense>
          <p className="absolute bottom-1 inset-x-0 text-center text-[10px] uppercase tracking-[.3em] text-[#F6ECE4]/50">Arrastra para girar</p>
        </div>
      </div>
    </section>
  );
}
