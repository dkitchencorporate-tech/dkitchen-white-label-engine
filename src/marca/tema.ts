import type { BrandConfig } from './esquema.js';

// Funciones puras del tema: se usan en el navegador y en el plugin de Vite (Node).

/** Convierte #RRGGBB en "R G B" para usarlo con opacidad en CSS: rgb(var(--x) / 0.3). */
export function hexARgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Variables CSS del tema. La usa el plugin de Vite al compilar y el editor en vivo. */
export function variablesTema(t: BrandConfig['tema'], f: BrandConfig['fuentes']): Record<string, string> {
  return {
    '--brand-primary': t.primary,
    '--brand-primary-rgb': hexARgb(t.primary),
    '--brand-primary-hover': t.primaryHover,
    '--brand-primary-light': t.primaryLight,
    '--brand-accent': t.accent,
    '--brand-accent-hover': t.accentHover,
    '--brand-surface': t.surface,
    '--brand-card': t.card,
    '--brand-card-hover': t.cardHover,
    '--brand-ink': t.ink,
    '--brand-ink-soft': t.inkSoft,
    '--brand-muted': t.inkSoft,
    '--brand-border': t.border,
    '--brand-radius': `${t.radius}rem`,
    '--font-sans': `'${f.sans}', system-ui, sans-serif`,
    '--font-display': `'${f.display}', system-ui, sans-serif`
  };
}

