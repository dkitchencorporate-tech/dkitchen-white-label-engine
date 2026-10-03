/** @type {import('tailwindcss').Config} */
// Tailwind compilado en el build (antes se generaba en el navegador desde una
// CDN). Los colores y tipografías salen de variables CSS que define la marca
// activa (brands/<slug>/brand.config.ts), así una misma compilación del motor
// sirve para cualquier identidad.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './brands/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          // <alpha-value> permite opacidades: bg-brand-primary/10, ring-brand-primary/30…
          primary: 'rgb(var(--brand-primary-rgb) / <alpha-value>)',
          primaryHover: 'var(--brand-primary-hover)',
          primaryLight: 'var(--brand-primary-light)',
          accent: 'var(--brand-accent)',
          accentHover: 'var(--brand-accent-hover)',
          surface: 'var(--brand-surface)',
          card: 'var(--brand-card)',
          cardHover: 'var(--brand-card-hover)',
          ink: 'var(--brand-ink)',
          inkSoft: 'var(--brand-ink-soft)',
          muted: 'var(--brand-muted)',
          border: 'var(--brand-border)',
          charcoal: '#1E293B',
          charcoalDark: '#0F172A'
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)']
      },
      borderRadius: {
        brand: 'var(--brand-radius)'
      },
      boxShadow: {
        premium: '0 20px 45px -15px rgba(24, 24, 27, 0.12), 0 0 1px 1px rgba(24, 24, 27, 0.04)',
        'premium-hover': '0 28px 55px -15px rgb(var(--brand-primary-rgb) / 0.30)',
        glass: '0 8px 32px 0 rgba(24, 24, 27, 0.10)'
      }
    }
  },
  plugins: []
};
