// Prototipo de sincronización (opción «copia + PR por versión») con repos git
// simulados: un padre y dos clientes en un directorio temporal.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actualizar, crearCliente, leerManifiesto, publicar, subirVersion, verificar } from '../scripts/motor.js';

const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const ENV_GIT = { GIT_AUTHOR_NAME: 'Prueba', GIT_AUTHOR_EMAIL: 'prueba@example.com', GIT_COMMITTER_NAME: 'Prueba', GIT_COMMITTER_EMAIL: 'prueba@example.com' };

let base: string;
let padre: string;
let clienteA: string;
let clienteB: string;
const envPrevio = { ...process.env };

beforeAll(async () => {
  Object.assign(process.env, ENV_GIT);
  base = mkdtempSync(join(tmpdir(), 'motor-sync-'));
  padre = join(base, 'padre');
  clienteA = join(base, 'cliente-a');
  clienteB = join(base, 'cliente-b');

  // Padre: copia del árbol de trabajo actual (archivos versionados y nuevos, sin ignorados).
  const raiz = process.cwd();
  const archivos = git(raiz, 'ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean);
  for (const f of archivos) {
    if (!existsSync(join(raiz, f))) continue;
    mkdirSync(dirname(join(padre, f)), { recursive: true });
    cpSync(join(raiz, f), join(padre, f));
  }
  git(padre, 'init', '--quiet', '--initial-branch=main');
  git(padre, 'add', '-A');
  git(padre, 'commit', '--quiet', '-m', 'Padre');
  publicar(padre);

  await crearCliente({ slug: 'casa-a', destino: clienteA, nombre: 'Casa A', origen: padre, preajuste: 'bar', color: '#0F766E' });
  await crearCliente({ slug: 'casa-b', destino: clienteB, nombre: 'Casa B', origen: padre });
}, 120_000);

afterAll(() => {
  process.env = envPrevio;
  if (base) rmSync(base, { recursive: true, force: true });
});

describe('Sincronización motor → clientes', () => {
  it('publicar crea la rama motor/v1.0.0 con huellas sin tocar la rama actual', () => {
    expect(git(padre, 'branch', '--list', 'motor/v1.0.0')).toContain('motor/v1.0.0');
    expect(git(padre, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('main');
    expect(existsSync(join(padre, 'motor.huellas.json'))).toBe(false);
    expect(git(padre, 'show', 'motor/v1.0.0:motor.huellas.json')).toContain('"src/App.tsx"');
    expect(() => publicar(padre)).toThrow(/ya está publicada/);
  });

  it('un cliente nuevo lleva el motor y su marca, pero no los archivos internos del padre', () => {
    expect(existsSync(join(clienteA, 'brands/casa-a/brand.config.ts'))).toBe(true);
    expect(readFileSync(join(clienteA, 'brands/casa-a/brand.config.ts'), 'utf8')).toContain('Casa A');
    expect(existsSync(join(clienteA, 'brands/demo/brand.config.ts'))).toBe(true);
    expect(existsSync(join(clienteA, 'ESTADO_PROYECTO.md'))).toBe(false);
    expect(existsSync(join(clienteA, 'ARRANQUE_AGENTE_NUBE.md'))).toBe(false);
    expect(existsSync(join(clienteA, '.claude'))).toBe(false);
    expect(JSON.parse(readFileSync(join(clienteA, 'cliente.json'), 'utf8')).marca).toBe('casa-a');
    expect(verificar(clienteA)).toEqual({ modificados: [], nuevos: [], borrados: [] });
  });

  it('verificar detecta ediciones del motor hechas en un cliente', () => {
    writeFileSync(join(clienteB, 'src/App.tsx'), readFileSync(join(clienteB, 'src/App.tsx'), 'utf8') + '\n// parche local\n');
    writeFileSync(join(clienteB, 'src/extra.ts'), 'export {};\n');
    rmSync(join(clienteB, 'vercel.json'));
    writeFileSync(join(clienteB, 'brands/casa-b/notas.md'), 'Lo del cliente no cuenta.\n');
    const d = verificar(clienteB);
    expect(d.modificados).toEqual(['src/App.tsx']);
    expect(d.nuevos).toEqual(['src/extra.ts']);
    expect(d.borrados).toEqual(['vercel.json']);
    git(clienteB, 'add', '-A');
    git(clienteB, 'commit', '--quiet', '-m', 'Parche local en el motor');
  });

  it('la v1.1.0 llega al cliente en su rama: cambios, borrados y migraciones, sin tocar su marca', () => {
    // Nueva versión en el padre: un cambio, un archivo nuevo, uno borrado y una migración.
    writeFileSync(join(padre, 'src/marca/nuevo-modulo.ts'), 'export const NUEVO = true;\n');
    writeFileSync(join(padre, 'db/migraciones/0004_ejemplo.sql'), '-- ejemplo\nSELECT 1;\n');
    writeFileSync(join(padre, 'README.md'), readFileSync(join(padre, 'README.md'), 'utf8') + '\nCambio de la v1.1.0.\n');
    rmSync(join(padre, 'tests/frontend.test.ts'));
    subirVersion(padre, '1.1.0');
    git(padre, 'add', '-A');
    git(padre, 'commit', '--quiet', '-m', 'v1.1.0');
    publicar(padre);

    const marcaAntes = readFileSync(join(clienteA, 'brands/casa-a/brand.config.ts'), 'utf8');
    const r = actualizar(clienteA, '1.1.0');
    expect(r).toMatchObject({ rama: 'motor/v1.1.0', desde: '1.0.0', hasta: '1.1.0', migracionesNuevas: ['db/migraciones/0004_ejemplo.sql'] });
    expect(r.dependenciasCambiadas).toBe(true); // la versión del lockfile cambia
    expect(git(clienteA, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('motor/v1.1.0');
    expect(existsSync(join(clienteA, 'src/marca/nuevo-modulo.ts'))).toBe(true);
    expect(existsSync(join(clienteA, 'tests/frontend.test.ts'))).toBe(false);
    expect(readFileSync(join(clienteA, 'README.md'), 'utf8')).toContain('Cambio de la v1.1.0.');
    expect(readFileSync(join(clienteA, 'brands/casa-a/brand.config.ts'), 'utf8')).toBe(marcaAntes);
    expect(existsSync(join(clienteA, 'cliente.json'))).toBe(true);
    expect(leerManifiesto(clienteA).version).toBe('1.1.0');
    expect(verificar(clienteA)).toEqual({ modificados: [], nuevos: [], borrados: [] });
    expect(git(clienteA, 'status', '--porcelain')).toBe('');
    expect(git(clienteA, 'log', '-1', '--format=%s')).toBe('Motor v1.1.0 (desde v1.0.0)');
  });

  it('no actualiza un cliente con el motor editado salvo con --forzar, y entonces respeta su marca', () => {
    expect(() => actualizar(clienteB, '1.1.0')).toThrow(/archivos del motor editados/);
    expect(git(clienteB, 'rev-parse', '--abbrev-ref', 'HEAD')).toBe('main');
    actualizar(clienteB, '1.1.0', { forzar: true });
    expect(readFileSync(join(clienteB, 'src/App.tsx'), 'utf8')).not.toContain('parche local');
    expect(existsSync(join(clienteB, 'src/extra.ts'))).toBe(false);
    expect(existsSync(join(clienteB, 'vercel.json'))).toBe(true);
    expect(existsSync(join(clienteB, 'brands/casa-b/notas.md'))).toBe(true);
  });

  it('rechaza versiones no mayores y repos que no son de cliente', () => {
    expect(() => subirVersion(padre, '1.0.5')).toThrow(/mayor/);
    expect(() => subirVersion(padre, 'v2')).toThrow(/semver/);
    expect(() => actualizar(padre, '1.2.0')).toThrow(/cliente\.json/);
  });
});
