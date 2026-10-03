import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    // La API local (npm run dev:api) atiende /api durante el desarrollo.
    proxy: { '/api': `http://localhost:${process.env.API_PORT || 3001}` },
    watch: {
      ignored: ['**/Escritorio/**', '**/Skills_Agentes/**']
    }
  }
});
