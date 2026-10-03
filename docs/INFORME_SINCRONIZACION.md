# Informe · Sincronización del motor con los repos de cliente (Fase 2)

*3 de octubre de 2026 · Decisión A2: «prototipar ambas y decidir».*

## 1. Resumen

Se han probado en local las dos vías con repos git simulados (un padre y varios clientes):

- **(a) Copia completa + PR por versión** funciona de principio a fin sin trucos. Dar de alta un cliente tarda ~1,3 s; dejarlo compilado, ~10 s.
- **(b) Paquete npm privado** solo compila con tres apaños. Además deja abiertos riesgos que no se pueden cerrar sin rehacer la forma de publicar el motor: la API en Vercel, las migraciones y las pruebas.

**Recomendación: (a)**, con un CI que bloquea editar el motor dentro de un cliente. La vía (b) solo compensaría con decenas de clientes, y aun así exigiría precompilar el motor a JavaScript (ver §5).

## 2. Qué es del motor y qué es del cliente (común a las dos vías)

- **`motor.json`:**
  - lista las rutas del motor (`src/`, `api/`, `db/`, `scripts/`, `brands/demo`, configuraciones…) y su versión (semver, empieza en **1.0.0** con esta base);
  - todo lo demás es del cliente: `brands/<slug>/`, `cliente.json` y lo que añada fuera de esas rutas.
- **`motor.huellas.json`:**
  - SHA-256 de cada archivo del motor en la versión publicada;
  - con él, `npm run motor -- verificar` detecta archivos del motor modificados, añadidos o borrados en un cliente;
  - el CI lo ejecuta en cada PR de los repos de cliente.
- **Archivos internos del padre** (`ESTADO_PROYECTO.md`, `ARRANQUE_AGENTE_NUBE.md`, `.claude/`): no están en `motor.json`, así que nunca llegan a un cliente.

## 3. Vía (a) · Copia completa + PR por versión (implementada)

### Flujo

| Dónde | Orden | Qué hace |
|---|---|---|
| Padre | `npm run motor -- version 1.1.0` | Sube la versión en `motor.json`, `package.json` y el lockfile. Va en un PR normal a `main`. |
| Padre | `npm run motor -- publicar` | Crea la rama `motor/v1.1.0` y la etiqueta `v1.1.0`, con un commit que añade las huellas. No toca `main` ni el árbol de trabajo. |
| Alta | `npm run motor -- crear-cliente <slug> --destino … --nombre … --origen <repo del motor>` | Repo nuevo con solo el motor publicado, la marca creada con `nueva-marca` y `cliente.json`. |
| Cliente | Acción «Actualizar motor» (o `npm run motor -- actualizar 1.1.0`) | Comprueba que el motor no está editado, trae `motor/v1.1.0`, sustituye las rutas del motor (incluidos los archivos que el motor borró), deja intacta la marca, confirma en la rama `motor/v1.1.0` y abre el PR. Avisa si hay migraciones nuevas o cambian las dependencias. |
| Cliente | CI del PR | Motor intacto, lint, tipos, pruebas, compilación y punta a punta. Si está en verde, se fusiona y Vercel despliega. |

### Pruebas (`tests/motor.test.ts`, 6 pruebas en verde)

1. `publicar` crea la rama con huellas, no toca `main` y no deja publicar dos veces la misma versión.
2. Un cliente nuevo lleva el motor y su marca, pero ningún archivo interno del padre, y empieza con «motor intacto».
3. `verificar` detecta un archivo del motor modificado, uno añadido y uno borrado. Lo que hay en `brands/<slug>` no cuenta.
4. La v1.1.0 llega al cliente con un archivo cambiado, uno nuevo, uno borrado y una migración nueva. La marca queda byte a byte igual y el árbol queda limpio.
5. Un cliente con el motor editado no se actualiza. Con `--forzar` se descartan sus cambios al motor, pero se respeta su marca.
6. Rechaza versiones no mayores, formatos no semver y `actualizar` fuera de un repo de cliente.

### Medidas reales (contenedor en la nube, cliente «La Taberna», preajuste bar)

| Paso | Tiempo |
|---|---|
| `crear-cliente` (repo + marca + commit inicial) | 1,3 s |
| `npm ci` (con caché de npm) | 5,6 s |
| `npm run build` con `BRAND=la-taberna` | 2,3 s |
| `motor verificar` · `typecheck` · `lint` | 0,7 s · 1,8 s · 0,7 s |

Repo del cliente: 141 archivos versionados. La compilación lleva la identidad de la marca (nombre, colores e iconos generados).

## 4. Vía (b) · Paquete npm privado (prototipo)

El paquete `@dkitchen/motor` (215 kB empaquetado) se generó con `npm pack`. Se instaló en un cliente de solo 13 archivos: su marca y la configuración mínima. Para compilarlo hizo falta:

1. **Arrancar Vite con `node --import tsx`.** Node se niega a ejecutar TypeScript dentro de `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`).
2. **Reescribir los imports de la marca** (`../../src/…` → `@dkitchen/motor/src/…`).
3. **Calcar en el cliente** `index.html`, `vite.config.ts`, `tailwind.config.js` y `postcss.config.js`, apuntando al paquete.

Con eso compila, y el CSS sale idéntico (mismo hash). Faltan tres cosas:

- **API en Vercel:** las funciones tienen que vivir en `api/` del repo, así que harían falta reexportaciones hacia el paquete. Lo previsible es que Vercel no compile TypeScript dentro de `node_modules`, como le pasa a Node; no se ha comprobado en Vercel. Lo seguro sería publicar la API ya compilada a JavaScript.
- **Migraciones y semilla:** los scripts leen `db/` desde el directorio actual. Habría que adaptarlos para que lean del paquete.
- **Pruebas:** las de API y las de punta a punta del motor no viajan en el paquete, así que el CI del cliente quedaría a ciegas.

## 5. Comparativa

| | (a) Copia + PR | (b) Paquete npm |
|---|---|---|
| Funciona hoy sin cambios en el motor | ✅ | ❌ (apaños 1–3 y precompilar la API) |
| Alta de cliente | 1,3 s, una orden | Plantilla de cliente + publicar el paquete |
| Actualizar | PR automático con diff completo y CI | PR que sube la versión: diff opaco |
| Archivos en el repo del cliente | 141 | 13 |
| Proteger el motor de ediciones | Huellas + CI | Natural: está en `node_modules` |
| Personalización | Huecos, y si hace falta algo excepcional se ve en el diff | Solo huecos |
| Infraestructura extra | Ninguna (ramas git) | Registro privado y tokens de lectura en cada cliente y en Vercel |
| Pruebas del motor en el cliente | Sí (viajan con el motor) | No |
| Migraciones | Llegan en `db/migraciones` y el PR las avisa | Hay que adaptar los scripts |
| Revisar qué cambia | El PR muestra cada línea | Hay que leer el registro de cambios |

## 6. Recomendación y siguientes pasos

1. **Adoptar (a)**: ya está implementada y probada en este PR (`scripts/motor.ts`, `motor.json`, flujos de CI).
2. **En GitHub:** crear dos repos de prueba con `crear-cliente` y lanzar en ellos «Actualizar motor» con una v1.0.1 de prueba. Hace falta crear los repos (lo decide karc0) y los tokens:
   - `MOTOR_REPO_TOKEN`: lectura del motor;
   - `MOTOR_PR_TOKEN`: escritura en el cliente, incluida «Workflows», porque sin ella GitHub rechaza las versiones que cambian `.github/workflows` y no lanza el CI en el PR.
3. **Proteger `main`** en cada cliente: PR obligatorio y CI en verde.
4. **Revisar (b) si se superan unas 30 marcas activas.** Para entonces, el motor debería publicarse ya compilado (`dist/` con la API en JavaScript y un preset de Vite), y los imports de marca ir por `@dkitchen/motor/…`.

## 7. Seguridad

- No hay secretos en el código: los tokens son secretos de GitHub y solo aparecen sus nombres.
- `MOTOR_REPO_TOKEN`:
  - solo se aplica a la URL exacta del motor;
  - se enmascara en los registros;
  - se retira de la configuración de git al terminar.
- Los permisos del flujo se limitan a lo necesario (`contents` y `pull-requests`).
- La versión de entrada se valida con una expresión regular antes de usarla, y se pasa por variable de entorno, nunca interpolada en el script.
- Una actualización nunca se aplica directamente a `main`: siempre llega como PR con CI completo.
- Los cambios locales al motor se detectan y bloquean (huellas), así no se pierden en silencio. Descartarlos exige `--forzar` explícito.
