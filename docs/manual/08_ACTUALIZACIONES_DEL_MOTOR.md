# 08 · Actualizaciones del motor en las marcas

Detalle técnico y comparativa en `docs/INFORME_SINCRONIZACION.md`. Aquí, el procedimiento.

## Qué es del motor y qué es de la marca

- **Motor**: todo lo que lista `motor.json` → `rutas` (`src/`, `api/`, `db/`, `scripts/`, `brands/demo`, configuraciones…). En un repo de cliente **no se edita**: el CI lo comprueba con huellas SHA-256 (`motor.huellas.json`).
- **Marca**: `brands/<slug>/`, `cliente.json` y todo lo que no esté en esa lista. Una actualización **nunca** lo toca.

## Publicar una versión nueva del motor (repo del motor)

1. PR normal con los cambios + `npm run motor -- version x.y.z` (semver: parche para correcciones, menor para funcionalidades, mayor si rompe algo).
2. Tras fusionar, en `main` actualizado:
   ```bash
   npm run motor -- publicar
   git push origin motor/vx.y.z --follow-tags
   ```
3. Anota en `ESTADO_PROYECTO.md` qué trae la versión, si tiene **migraciones nuevas** y si **rompe** algo en las marcas.

## Actualizar un cliente (forma A, repo propio)

**Automático:** en el repo del cliente, Actions → **Actualizar motor** → versión `x.y.z`. Crea la rama `motor/vx.y.z` y abre el PR.

Secretos del repo del cliente (solo los nombres van al repo):

| Secreto | Permisos | Para qué |
|---|---|---|
| `MOTOR_REPO_TOKEN` | Token de grano fino, solo lectura de «Contents» del repo del motor | Traer la versión |
| `MOTOR_PR_TOKEN` | Token de grano fino del repo del cliente con «Contents», «Pull requests» y «Workflows» en escritura | Subir la rama y abrir el PR; sin él, GitHub no lanza el CI y rechaza las versiones que cambian `.github/workflows` |

**Manual:**
```bash
npm run motor -- verificar            # «Motor intacto»; si no, mueve los cambios a brands/<slug>
npm run motor -- actualizar x.y.z     # rama motor/vx.y.z + commit
git push -u origin motor/vx.y.z       # y abre el PR
```

Antes de fusionar ese PR:
1. CI en verde (incluye «Motor intacto»).
2. Si el PR avisa de **migraciones nuevas**: `npm run db:migrar` contra la base de producción justo antes del despliegue.
3. Si avisa de **dependencias nuevas**: el CI ya ejecuta `npm ci`; no hay que hacer nada más.
4. Revisión visual rápida de la marca (guía 03 §7).

## Marca dentro del repo del motor (forma B)

Se despliega desde el propio repo del motor con `BRAND=<slug>`. Cada fusión en `main` redespliega la marca, así que **todo PR del motor debe pasar la e2e de esa marca** (por eso está en `playwright.config.ts`).

## Si el motor no cubre algo que la marca necesita

- **No** se edita el motor en el repo del cliente.
- Se abre un PR en el motor que lo resuelva de forma general (con interruptor de módulo si no aplica a todos). Se publica una versión y se actualiza el cliente.
- Ejemplos hechos así: zonas, existencias, alcohol y regalos (migración 0004); atributos `data-motor` para dar estilo desde la marca.
