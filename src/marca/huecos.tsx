import type { ComponentType, ReactNode } from 'react';
import huecosMarca from '@marca/huecos';

// Huecos: puntos del motor donde una marca puede poner un componente propio
// (diseño de autor) sin tocar el código del motor. Si la marca no rellena un
// hueco, se usa el componente por defecto del motor.

export interface PropsPreloader { saliendo: boolean }
export interface PropsLogo { className?: string; variante?: 'claro' | 'oscuro' }
export interface PropsHero { onVerCarta?: () => void }
export type PropsPie = Record<string, never>;

export interface Huecos {
  Preloader?: ComponentType<PropsPreloader>;
  Logo?: ComponentType<PropsLogo>;
  Hero?: ComponentType<PropsHero>;
  Pie?: ComponentType<PropsPie>;
}

export const HUECOS: Huecos = huecosMarca;

/** Renderiza el componente de la marca para `nombre` o, si no existe, `porDefecto`. */
export function Hueco<K extends keyof Huecos>({
  nombre,
  props,
  porDefecto
}: {
  nombre: K;
  props: NonNullable<Huecos[K]> extends ComponentType<infer P> ? P : never;
  porDefecto: ReactNode;
}) {
  const Componente = HUECOS[nombre] as ComponentType<unknown> | undefined;
  return Componente ? <Componente {...(props as object)} /> : <>{porDefecto}</>;
}
