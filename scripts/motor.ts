// Sincronización motor → clientes (opción «copia + PR por versión»).
//
// En el repo padre (DKitchen):
//   npm run motor -- version <x.y.z>      Sube la versión (va en un PR normal a main).
//   npm run motor -- publicar             Crea la rama motor/v<x.y.z> con las huellas del motor.
// En un repo de cliente:
//   npm run motor -- verificar            Falla si alguien ha editado archivos del motor.
//   npm run motor -- actualizar <x.y.z>   Rama motor/v<x.y.z> con el motor nuevo, lista para PR.
// Para dar de alta un cliente:
//   npm run motor -- crear-cliente <slug> --destino <dir> --nombre "Nombre" --origen <repo del motor>
//                                  [--version x.y.z] [--preajuste …] [--color …] [--logo …] [--icono …] [--ciudad …]
//
// Qué es del motor lo dice motor.json («rutas»). Todo lo demás es del cliente
// (brands/<slug>/, cliente.json…) y la sincronización nunca lo toca.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { crearMarca } from './nueva-marca.js';
import type { Preajuste } from '../src/marca/preajustes.js';

export const ARCHIVO_HUELLAS = 'motor.huellas.json';
export const ARCHIVO_CLIENTE = 'cliente.json';
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export interface Manifiesto { version: string; rutas: string[] }
export interface Huellas { version: string; archivos: Record<string, string> }
export interface Cliente { marca: string; origen: string; creado: string }
export interface Diferencias { modificados: string[]; nuevos: string[]; borrados: string[] }

function git(cwd: string, args: string[], entrada?: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', input: entrada, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

const leerJson = <T>(ruta: string): T => JSON.parse(readFileSync(ruta, 'utf8')) as T;
const escribirJson = (ruta: string, datos: unknown) => writeFileSync(ruta, JSON.stringify(datos, null, 2) + '\n');
export const leerManifiesto = (dir: string) => leerJson<Manifiesto>(join(dir, 'motor.json'));
const rama = (version: string) => `motor/v${version}`;

function compararVersiones(a: string, b: string): number {
  const [x, y] = [a, b].map((v) => (SEMVER.exec(v) ?? []).slice(1).map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

function exigirLimpio(dir: string): void {
  if (git(dir, ['status', '--porcelain'])) throw new Error('Hay cambios sin confirmar. Confírmalos o descártalos antes de seguir.');
}

/** Archivos del motor presentes en el árbol de trabajo (versionados o nuevos, sin los ignorados). */
function archivosMotor(dir: string, rutas: string[]): string[] {
  const salida = git(dir, ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...rutas]);
  return [...new Set(salida.split('\0').filter(Boolean))].filter((f) => existsSync(join(dir, f))).sort();
}

export function calcularHuellas(dir: string): Huellas {
  const m = leerManifiesto(dir);
  const archivos: Record<string, string> = {};
  for (const f of archivosMotor(dir, m.rutas)) {
    archivos[f] = createHash('sha256').update(readFileSync(join(dir, f))).digest('hex');
  }
  return { version: m.version, archivos };
}

export function verificar(dir: string): Diferencias {
  if (!existsSync(join(dir, ARCHIVO_HUELLAS))) throw new Error(`Falta ${ARCHIVO_HUELLAS}: este repo no tiene un motor publicado instalado.`);
  const esperado = leerJson<Huellas>(join(dir, ARCHIVO_HUELLAS)).archivos;
  const actual = calcularHuellas(dir).archivos;
  return {
    modificados: Object.keys(esperado).filter((f) => f in actual && actual[f] !== esperado[f]),
    nuevos: Object.keys(actual).filter((f) => !(f in esperado)),
    borrados: Object.keys(esperado).filter((f) => !(f in actual))
  };
}

const hayDiferencias = (d: Diferencias) => d.modificados.length + d.nuevos.length + d.borrados.length > 0;

// ---------- Repo padre ----------

export function subirVersion(dir: string, version: string): void {
  if (!SEMVER.test(version)) throw new Error('La versión debe ser x.y.z (semver).');
  const m = leerManifiesto(dir);
  if (compararVersiones(version, m.version) <= 0) throw new Error(`La versión ${version} debe ser mayor que la actual (${m.version}).`);
  escribirJson(join(dir, 'motor.json'), { ...leerJson<object>(join(dir, 'motor.json')), version });
  const pkg = leerJson<Record<string, unknown>>(join(dir, 'package.json'));
  escribirJson(join(dir, 'package.json'), { ...pkg, version });
  const lockRuta = join(dir, 'package-lock.json');
  if (existsSync(lockRuta)) {
    const lock = leerJson<{ version?: string; packages?: Record<string, { version?: string }> }>(lockRuta);
    lock.version = version;
    if (lock.packages?.['']) lock.packages[''].version = version;
    escribirJson(lockRuta, lock);
  }
}

/** Crea la rama motor/v<x.y.z> desde HEAD con las huellas; no toca la rama actual. */
export function publicar(dir: string): string {
  exigirLimpio(dir);
  const { version } = leerManifiesto(dir);
  const nombre = rama(version);
  if (git(dir, ['branch', '--list', nombre])) throw new Error(`La versión ${version} ya está publicada (${nombre}). Sube la versión primero.`);
  // Commit con las huellas sobre HEAD, sin cambiar de rama ni de árbol de trabajo.
  const indice = join(git(dir, ['rev-parse', '--absolute-git-dir']), 'motor-publicar.index');
  const env = { ...process.env, GIT_INDEX_FILE: indice };
  const g = (args: string[], entrada?: string) =>
    execFileSync('git', args, { cwd: dir, encoding: 'utf8', input: entrada, env }).trim();
  g(['read-tree', 'HEAD']);
  const blob = g(['hash-object', '-w', '--stdin'], JSON.stringify(calcularHuellas(dir), null, 2) + '\n');
  g(['update-index', '--add', '--cacheinfo', `100644,${blob},${ARCHIVO_HUELLAS}`]);
  const arbol = g(['write-tree']);
  const commit = g(['commit-tree', arbol, '-p', 'HEAD', '-m', `Motor v${version}`]);
  git(dir, ['branch', nombre, commit]);
  git(dir, ['tag', '-a', `v${version}`, commit, '-m', `Motor v${version}`]);
  return nombre;
}

// ---------- Repo de cliente ----------

function traerVersion(dir: string, origen: string, version: string): string {
  const ref = `refs/motor-origen/v${version}`;
  git(dir, ['fetch', '--quiet', '--no-tags', origen, `+refs/heads/${rama(version)}:${ref}`]);
  return ref;
}

function existeEn(dir: string, ref: string, ruta: string): boolean {
  try { git(dir, ['cat-file', '-e', `${ref}:${ruta}`]); return true; } catch { return false; }
}

export interface ResultadoActualizacion {
  rama: string; desde: string; hasta: string;
  archivos: number; migracionesNuevas: string[]; dependenciasCambiadas: boolean;
}

export function actualizar(dir: string, version: string, o: { origen?: string; forzar?: boolean } = {}): ResultadoActualizacion {
  if (!existsSync(join(dir, ARCHIVO_CLIENTE))) throw new Error(`Falta ${ARCHIVO_CLIENTE}: «actualizar» solo se usa en repos de cliente.`);
  exigirLimpio(dir);
  const cliente = leerJson<Cliente>(join(dir, ARCHIVO_CLIENTE));
  const origen = o.origen ?? cliente.origen;
  const anterior = leerManifiesto(dir);
  if (compararVersiones(version, anterior.version) <= 0) throw new Error(`Ya tienes la v${anterior.version}; elige una versión mayor.`);
  if (!o.forzar) {
    const d = verificar(dir);
    if (hayDiferencias(d)) throw new Error('Hay archivos del motor editados en este repo; «verificar» muestra cuáles. Pásalos a brands/<slug> o usa --forzar para descartarlos.');
  }

  const ref = traerVersion(dir, origen, version);
  const nuevo = JSON.parse(git(dir, ['show', `${ref}:motor.json`])) as Manifiesto;
  if (nuevo.version !== version) throw new Error(`La rama ${rama(version)} declara la versión ${nuevo.version}.`);
  const migracionesAntes = new Set(git(dir, ['ls-files', 'db/migraciones']).split('\n'));
  const lockAntes = existsSync(join(dir, 'package-lock.json')) ? readFileSync(join(dir, 'package-lock.json'), 'utf8') : '';

  const nombre = rama(version);
  git(dir, ['checkout', '--quiet', '-b', nombre]);
  // Se borra el motor anterior entero y se trae el nuevo: así desaparecen también
  // los archivos que el motor eliminó, y lo que es del cliente queda intacto.
  git(dir, ['rm', '-r', '--quiet', '--ignore-unmatch', '--', ...new Set([...anterior.rutas, ...nuevo.rutas])]);
  const traer = [...nuevo.rutas, ARCHIVO_HUELLAS].filter((r) => existeEn(dir, ref, r));
  git(dir, ['checkout', ref, '--', ...traer]);

  const archivos = git(dir, ['diff', '--cached', '--name-only', 'HEAD']).split('\n').filter(Boolean).length;
  const migracionesNuevas = git(dir, ['ls-files', 'db/migraciones']).split('\n').filter((f) => f && !migracionesAntes.has(f));
  const dependenciasCambiadas = readFileSync(join(dir, 'package-lock.json'), 'utf8') !== lockAntes;
  git(dir, ['commit', '--quiet', '-m', `Motor v${version} (desde v${anterior.version})`]);
  return { rama: nombre, desde: anterior.version, hasta: version, archivos, migracionesNuevas, dependenciasCambiadas };
}

// ---------- Alta de cliente ----------

export interface OpcionesCliente {
  slug: string; destino: string; nombre: string; origen: string; version?: string;
  preajuste?: string; color?: string; ciudad?: string; logo?: string; icono?: string;
}

/** Repo nuevo con solo el motor publicado + la marca del cliente (sin archivos internos del padre). */
export async function crearCliente(o: OpcionesCliente): Promise<string> {
  const destino = resolve(o.destino);
  if (existsSync(destino)) throw new Error(`Ya existe ${destino}.`);
  const origen = existsSync(o.origen) ? resolve(o.origen) : o.origen;
  const version = o.version ?? ultimaVersion(origen);
  mkdirSync(destino, { recursive: true });
  git(destino, ['init', '--quiet', '--initial-branch=main']);
  const ref = traerVersion(destino, origen, version);
  const m = JSON.parse(git(destino, ['show', `${ref}:motor.json`])) as Manifiesto;
  git(destino, ['checkout', ref, '--', ...[...m.rutas, ARCHIVO_HUELLAS].filter((r) => existeEn(destino, ref, r))]);

  // La plantilla brands/demo es la de la versión instalada.
  await crearMarca({ slug: o.slug, nombre: o.nombre, preajuste: o.preajuste as Preajuste | undefined, color: o.color, ciudad: o.ciudad,
    logo: o.logo && resolve(o.logo), icono: o.icono && resolve(o.icono), raiz: destino });
  escribirJson(join(destino, ARCHIVO_CLIENTE), { marca: o.slug, origen: o.origen, creado: new Date().toISOString().slice(0, 10) });
  git(destino, ['add', '-A']);
  git(destino, ['commit', '--quiet', '-m', `Alta de ${o.nombre} con el motor v${version}`]);
  return version;
}

function ultimaVersion(origen: string): string {
  const versiones = git(process.cwd(), ['ls-remote', '--heads', origen, 'motor/v*'])
    .split('\n').map((l) => l.split('refs/heads/motor/v')[1]).filter((v): v is string => !!v && SEMVER.test(v));
  if (!versiones.length) throw new Error('El origen no tiene ninguna versión publicada del motor.');
  return versiones.sort(compararVersiones).at(-1)!;
}

// ---------- Línea de órdenes ----------

async function main(): Promise<void> {
  const dir = process.cwd();
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      origen: { type: 'string' }, destino: { type: 'string' }, nombre: { type: 'string' }, version: { type: 'string' },
      preajuste: { type: 'string' }, color: { type: 'string' }, ciudad: { type: 'string' },
      logo: { type: 'string' }, icono: { type: 'string' }, forzar: { type: 'boolean' }
    }
  });
  const [orden, arg] = positionals;
  switch (orden) {
    case 'version':
      subirVersion(dir, arg ?? '');
      console.log(`Versión del motor: ${arg}. Confírmala en un PR y, tras fusionarlo, ejecuta «npm run motor -- publicar».`);
      break;
    case 'publicar': {
      const nombre = publicar(dir);
      console.log(`Publicada ${nombre}. Súbela con: git push origin ${nombre} --follow-tags`);
      break;
    }
    case 'verificar': {
      const d = verificar(dir);
      if (!hayDiferencias(d)) { console.log('Motor intacto.'); break; }
      for (const [titulo, lista] of [['Modificados', d.modificados], ['Nuevos', d.nuevos], ['Borrados', d.borrados]] as const) {
        if (lista.length) console.error(`${titulo}:\n  ${lista.join('\n  ')}`);
      }
      console.error('\nEstos archivos son del motor y se sustituyen al actualizar. Lo propio del cliente va en brands/<slug>/.');
      process.exitCode = 1;
      break;
    }
    case 'actualizar': {
      const r = actualizar(dir, arg ?? '', { origen: values.origen, forzar: values.forzar });
      console.log(`Rama ${r.rama}: motor v${r.desde} → v${r.hasta}, ${r.archivos} archivos.`);
      if (r.migracionesNuevas.length) console.log(`Migraciones nuevas (npm run db:migrar al desplegar):\n  ${r.migracionesNuevas.join('\n  ')}`);
      if (r.dependenciasCambiadas) console.log('Cambian las dependencias: ejecuta npm ci.');
      console.log(`Súbela y abre el PR: git push -u origin ${r.rama}`);
      break;
    }
    case 'crear-cliente': {
      if (!arg || !values.destino || !values.nombre || !values.origen) {
        throw new Error('Uso: crear-cliente <slug> --destino <dir> --nombre "Nombre" --origen <repo del motor> [--version x.y.z]');
      }
      const v = await crearCliente({
        slug: arg, destino: values.destino, nombre: values.nombre, origen: values.origen, version: values.version,
        preajuste: values.preajuste, color: values.color, ciudad: values.ciudad, logo: values.logo, icono: values.icono
      });
      console.log(`Cliente creado en ${values.destino} con el motor v${v}. Siguiente: npm ci, revisar brands/${arg}/CHECKLIST.md y subirlo a su repo.`);
      break;
    }
    default:
      console.error('Órdenes: version <x.y.z> · publicar · verificar · actualizar <x.y.z> [--origen] [--forzar] · crear-cliente <slug> …');
      process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
