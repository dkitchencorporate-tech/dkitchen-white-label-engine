import { defineConfig, devices } from '@playwright/test';

// Pruebas de punta a punta: API local + PWA (Vite) contra un Postgres real.
// Variables: E2E_DATABASE_URL (dueño) y E2E_API_DATABASE_URL (rol motor_api).
const API_PORT = 3102;
const WEB_PORT = 5174;
const API_DB = process.env.E2E_API_DATABASE_URL || 'postgres://motor_api:motor_api_local@localhost:5432/motor_e2e';
// Segunda marca (dark store) con su propia API y base de datos.
const TIENDA_API_PORT = 3103;
const TIENDA_WEB_PORT = 5175;
const TIENDA_API_DB = process.env.E2E_TIENDA_API_DATABASE_URL || 'postgres://motor_api:motor_api_local@localhost:5432/motor_e2e_tienda';
const navegador = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/preparar.ts',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Fuentes externas fuera: las pruebas no dependen de la red.
    serviceWorkers: 'block'
  },
  projects: [
    { name: 'movil', testMatch: /flujo-compra/, use: { ...devices['Pixel 7'], launchOptions: navegador } },
    {
      name: 'tienda',
      testMatch: /tienda/,
      use: { ...devices['Pixel 7'], launchOptions: navegador, baseURL: `http://localhost:${TIENDA_WEB_PORT}` }
    }
  ],
  webServer: [
    {
      command: 'npx tsx scripts/servidor-api.ts',
      port: API_PORT,
      reuseExistingServer: false,
      env: { API_PORT: String(API_PORT), APP_DATABASE_URL: API_DB, APP_JWT_SECRET: 'e2e-'.repeat(12) }
    },
    {
      // Se prueba la compilación de producción (sin optimizador ni recargas del modo desarrollo).
      command: `npx vite build --outDir node_modules/.e2e-demo --emptyOutDir && npx vite preview --outDir node_modules/.e2e-demo --port ${WEB_PORT} --strictPort`,
      port: WEB_PORT,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { API_PORT: String(API_PORT), BRAND: 'demo' }
    },
    {
      command: 'npx tsx scripts/servidor-api.ts',
      port: TIENDA_API_PORT,
      reuseExistingServer: false,
      env: { API_PORT: String(TIENDA_API_PORT), APP_DATABASE_URL: TIENDA_API_DB, APP_JWT_SECRET: 'e2e-tienda-'.repeat(6) }
    },
    {
      command: `npx vite build --outDir node_modules/.e2e-tienda --emptyOutDir && npx vite preview --outDir node_modules/.e2e-tienda --port ${TIENDA_WEB_PORT} --strictPort`,
      port: TIENDA_WEB_PORT,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { API_PORT: String(TIENDA_API_PORT), BRAND: 'alacena-expres' }
    }
  ]
});
