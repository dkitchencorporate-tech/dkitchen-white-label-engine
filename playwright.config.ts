import { defineConfig, devices } from '@playwright/test';

// Pruebas de punta a punta: API local + PWA (Vite) contra un Postgres real.
// Variables: E2E_DATABASE_URL (dueño) y E2E_API_DATABASE_URL (rol motor_api).
const API_PORT = 3102;
const WEB_PORT = 5174;
const API_DB = process.env.E2E_API_DATABASE_URL || 'postgres://motor_api:motor_api_local@localhost:5432/motor_e2e';

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
    {
      name: 'movil',
      use: {
        ...devices['Pixel 7'],
        launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}
      }
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
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      port: WEB_PORT,
      reuseExistingServer: false,
      env: { API_PORT: String(API_PORT), BRAND: 'demo' }
    }
  ]
});
