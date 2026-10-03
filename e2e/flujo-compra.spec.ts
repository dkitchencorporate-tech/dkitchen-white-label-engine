// Flujo completo: carta → producto con opciones → carrito → pedido → panel.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { ARCHIVO_CREDENCIALES } from './preparar.js';

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: '' }));
});

test('un cliente pide un plato con extras y el pedido aparece en el panel', async ({ page }) => {
  // 1. Carta servida por la API
  await page.goto('/');
  await expect(page.getByText('Plato de la casa').first()).toBeVisible({ timeout: 20_000 });

  // 2. Producto con opciones de la carta (el total lo recalcula el servidor)
  await page.getByText('Plato de la casa').first().click();
  await page.getByRole('button', { name: /Queso extra/ }).click();
  await page.getByRole('button', { name: /Bacon/ }).click();
  await expect(page.getByRole('button', { name: /Añadir al pedido/i })).toContainText('13,40');
  await page.getByRole('button', { name: /Añadir al pedido/i }).click();

  // 3. Carrito → sugerencias → checkout
  await page.getByRole('button', { name: /Tramitar/i }).click();
  await page.getByRole('button', { name: /Pasarela de Pago/i }).click();

  // 4. Datos del cliente, recogida en local
  await page.getByPlaceholder('Ej. Carlos Mendoza').fill('Cliente E2E');
  await page.getByPlaceholder('Ej. 679 00 00 00').fill('+34 600 123 456');
  await page.getByText('Para Recoger').click();
  await page.getByRole('button', { name: /Confirmar Pedido/i }).click();
  await expect(page.getByText(/Pedido Confirmado|Recogida|pedido/i).first()).toBeVisible({ timeout: 15_000 });

  // 5. Panel: el administrador ve el pedido con el total correcto
  const { email, password } = JSON.parse(readFileSync(ARCHIVO_CREDENCIALES, 'utf8'));
  await page.goto('/admin');
  await page.locator('input[type="email"], input[type="text"]').first().fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText('Cliente E2E').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/13[,.]40/).first()).toBeVisible();
});

test('el panel rechaza credenciales incorrectas', async ({ page }) => {
  await page.goto('/admin');
  await page.locator('input[type="email"], input[type="text"]').first().fill('admin@e2e.example');
  await page.locator('input[type="password"]').fill('contraseña-incorrecta');
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText(/incorrect/i)).toBeVisible({ timeout: 10_000 });
});
