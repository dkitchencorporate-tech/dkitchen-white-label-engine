// Pruebas de la capa de marca: esquema, preajustes y alta de marcas nuevas.
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { validarMarca } from '../src/marca/esquema.js';
import { cargarMarca } from '../scripts/vite-plugin-marca.js';
import { crearMarca } from '../scripts/nueva-marca.js';

const SLUG = 'prueba-automatica';
afterAll(() => rmSync(join('brands', SLUG), { recursive: true, force: true }));

describe('Configuración de marca', () => {
  it('la marca demo es válida y aplica su preajuste', async () => {
    const { brand } = await cargarMarca('demo');
    expect(brand.slug).toBe('demo');
    expect(brand.modulosActivos.reservas).toBe(true); // preajuste restaurante
  });

  it('rechaza colores mal escritos con un mensaje claro', async () => {
    const { brand } = await cargarMarca('demo');
    expect(() => validarMarca({ ...brand, tema: { ...brand.tema, primary: 'rojo' } })).toThrow(/tema\.primary/);
  });

  it('los módulos de la marca prevalecen sobre el preajuste', async () => {
    const { brand } = await cargarMarca('demo');
    const r = validarMarca({ ...brand, preajuste: 'dark_kitchen', modulos: { kiosko: false } });
    expect(r.modulosActivos.pedidoEnMesa).toBe(false); // del preajuste
    expect(r.modulosActivos.marcasVirtuales).toBe(true);
    expect(r.modulosActivos.kiosko).toBe(false); // de la marca
  });
});

describe('npm run nueva-marca', () => {
  it('crea una marca válida con su paleta, semilla y checklist', async () => {
    const dir = await crearMarca({ slug: SLUG, nombre: "L'Osteria Prueba", preajuste: 'bar', color: '#0E7490', ciudad: 'Granada' });
    for (const f of ['brand.config.ts', 'huecos.tsx', 'semilla.sql', 'CHECKLIST.md', 'recursos/logo.svg']) {
      expect(existsSync(join(dir, f))).toBe(true);
    }
    const { brand } = await cargarMarca(SLUG);
    expect(brand.name).toBe("L'Osteria Prueba");
    expect(brand.tema.primary).toBe('#0E7490');
    expect(brand.pwa.themeColor).toBe('#0E7490');
    expect(brand.modulosActivos.domicilio).toBe(false); // preajuste bar
    const semilla = readFileSync(join(dir, 'semilla.sql'), 'utf8');
    expect(semilla).toContain("business_name = 'L''Osteria Prueba'");
    expect(semilla).not.toContain('Marca Demo');
  });

  it('no sobrescribe una marca existente ni acepta slugs inválidos', async () => {
    await expect(crearMarca({ slug: SLUG, nombre: 'Otra' })).rejects.toThrow(/Ya existe/);
    await expect(crearMarca({ slug: 'Con Espacios', nombre: 'X' })).rejects.toThrow(/slug/);
    await expect(crearMarca({ slug: 'demo', nombre: 'X' })).rejects.toThrow(/plantilla/);
  });
});
