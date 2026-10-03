import { defineConfig } from 'vitest/config';
import marca from './scripts/vite-plugin-marca';

export default defineConfig({
  // El plugin de marca resuelve `virtual:marca-config` y `@marca/*` también en las pruebas.
  plugins: [marca()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 60000,
    fileParallelism: false
  }
});
