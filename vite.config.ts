import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import marca from './scripts/vite-plugin-marca';

// BRAND=<slug> elige la marca de brands/<slug> (por defecto «demo»).
export default defineConfig({
  plugins: [react(), marca()],
  // Una caché por marca: permite servir dos marcas a la vez sin pisarse.
  cacheDir: `node_modules/.vite-${process.env.BRAND || 'demo'}`,
  server: {
    port: 5173,
    open: false,
    // La API local (npm run dev:api) atiende /api durante el desarrollo.
    proxy: { '/api': `http://localhost:${process.env.API_PORT || 3001}` }
  }
});
