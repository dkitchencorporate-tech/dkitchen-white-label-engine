import type { PropsPreloader } from '../../../src/marca/huecos';

// Preloader: el arco de la alacena se dibuja, se llenan las baldas y aparece el nombre.
export default function Preloader({ saliendo }: PropsPreloader) {
  return (
    <div className={`fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#2A0E12] transition-opacity duration-700 ${saliendo ? 'opacity-0' : 'opacity-100'}`}
      role="status" aria-label="Cargando Alacena Exprés">
      <svg viewBox="0 0 512 512" className="w-28 h-28 alacena-preloader" aria-hidden>
        <path className="arco" d="M136 400V232c0-66 54-120 120-120s120 54 120 120v168" fill="none" stroke="#F6ECE4" strokeWidth="22" strokeLinecap="round" />
        <path className="balda b1" d="M166 290h180" stroke="#B8892F" strokeWidth="16" strokeLinecap="round" />
        <path className="balda b2" d="M166 350h180" stroke="#B8892F" strokeWidth="16" strokeLinecap="round" />
        <path className="rayo" d="M262 312l-24 34h20l-10 30 32-42h-20l12-22z" fill="#B8892F" />
      </svg>
      <p className="mt-6 font-display text-3xl font-black text-[#F6ECE4] tracking-tight alacena-nombre">Alacena</p>
      <p className="mt-1 text-[11px] font-extrabold tracking-[.35em] text-[#B8892F] alacena-nombre">EXPRÉS · MADRID</p>
    </div>
  );
}
