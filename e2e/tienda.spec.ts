// Dark store «Alacena Exprés»: zona por código postal con precio propio, alcohol
// con declaración de mayoría de edad, regalo con mensaje y aviso en el panel.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { ARCHIVO_CREDENCIALES_TIENDA } from './preparar.js';

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: '' }));
});

test('pedido con zona, alcohol y regalo de principio a fin', async ({ page }) => {
  await page.goto('/');

  // 1. Zona: fuera de reparto → aviso; Salamanca → precios +5 %
  const zona = page.getByRole('dialog', { name: /Dónde te lo llevamos/ });
  await expect(zona).toBeVisible({ timeout: 20_000 });
  await zona.getByLabel('Código postal').fill('48001');
  await zona.getByRole('button', { name: /Ver precios/ }).click();
  await expect(zona.getByRole('alert')).toContainText('Todavía no llegamos al 48001');
  await zona.getByLabel('Código postal').fill('28001');
  await zona.getByRole('button', { name: /Ver precios/ }).click();
  await expect(page.getByRole('button', { name: /Zona de entrega: Salamanca/ })).toBeVisible();

  // 2. Precio de zona en la carta: 7,90 € × 1,05 = 8,30 €
  const queso = page.locator('div.group', { hasText: 'Queso manchego curado DOP' }).first();
  await queso.scrollIntoViewIfNeeded();
  await expect(queso).toContainText('8,30');

  // 3. Vino (alcohol) y dos quesos
  await page.getByRole('heading', { name: 'Rioja Crianza DOCa' }).first().click();
  await page.getByRole('button', { name: /Añadir al pedido/i }).click();
  await page.getByRole('heading', { name: 'Queso manchego curado DOP' }).first().click();
  await page.getByRole('button', { name: '+' }).click();
  await expect(page.getByRole('button', { name: /Añadir al pedido/i })).toContainText('16,60');
  await page.getByRole('button', { name: /Añadir al pedido/i }).click();

  // 4. Checkout: el CP llega relleno, el pedido exige declarar la edad
  await page.getByRole('button', { name: /Tramitar/i }).click();
  await page.getByRole('button', { name: /Pasarela de Pago/i }).click();
  await page.getByPlaceholder('Ej. Carlos Mendoza').fill('Cliente Tienda E2E');
  await page.getByPlaceholder('Ej. 679 00 00 00').fill('+34 600 222 333');
  await page.getByPlaceholder('28013').fill('28001');
  await page.locator('input[placeholder="1"]').fill('10');
  await page.getByPlaceholder('Ej. Calle Amapola').fill('Calle de Serrano');
  const confirmar = page.getByRole('button', { name: /Confirmar Pedido/i });
  await expect(page.getByText(/Envío · Salamanca/)).toBeVisible();
  await expect(confirmar).toBeDisabled();
  await page.getByText(/Tengo 18 años o más/).click();
  await page.getByText('🎁 Es un regalo').click();
  await page.getByLabel('Mensaje de regalo').fill('¡Feliz cumpleaños, Marta!');
  await expect(confirmar).toBeEnabled();
  await confirmar.click();
  await expect(page.getByText(/Pedido|pedido/).first()).toBeVisible({ timeout: 15_000 });

  // 5. Panel: el pedido avisa del DNI y del regalo
  const { email, password } = JSON.parse(readFileSync(ARCHIVO_CREDENCIALES_TIENDA, 'utf8'));
  await page.goto('/admin');
  await page.locator('input[type="email"], input[type="text"]').first().fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText('Cliente Tienda E2E').first()).toBeVisible({ timeout: 20_000 });
  await page.getByText('Cliente Tienda E2E').first().click();
  await expect(page.getByText(/pedir DNI/)).toBeVisible();
  await expect(page.getByText('¡Feliz cumpleaños, Marta!')).toBeVisible();
});
