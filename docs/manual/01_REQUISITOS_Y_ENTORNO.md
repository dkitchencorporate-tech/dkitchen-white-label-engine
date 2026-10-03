# 01 · Requisitos y entorno

## Qué hace falta

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | 20 o superior (CI usa 22) | Compilar, scripts, pruebas |
| PostgreSQL | 16 (local) | Pruebas de API, tienda, seguridad y punta a punta |
| Chromium | El de Playwright | Pruebas de punta a punta en móvil |
| Git | 2.28 o superior | Sincronización del motor con los clientes |
| Python 3 | Cualquiera reciente | Solo para regenerar catálogos grandes (`herramientas/catalogo.py`) |

> El equipo local de karc0 (Celeron, 3,8 GB) **no compila**: todo se hace en la sesión en la nube, que ya tiene Node, Postgres y Chromium.

## Paso a paso (sesión en la nube o equipo de desarrollo)

1. **Instalar dependencias**
   ```bash
   npm ci
   ```
   Comprobación: termina sin errores. Si `npm ci` falla por el lockfile, no se edita a mano: se regenera con `npm install` y se revisa el diff.

2. **Arrancar Postgres local**
   ```bash
   service postgresql start   # en la sesión en la nube
   ```
   Comprobación: `psql postgres://postgres:postgres@localhost:5432/postgres -c "select 1"` devuelve `1`.
   ⚠ El contenedor en la nube puede parar Postgres cuando queda inactivo: si las pruebas fallan con `ECONNREFUSED 127.0.0.1:5432`, vuelve a arrancarlo (ver guía 10).

3. **Crear las bases y el rol de la API (una sola vez)**
   ```bash
   for db in motor_dev motor_test motor_e2e motor_tienda motor_e2e_tienda; do
     psql postgres://postgres:postgres@localhost:5432/postgres -c "CREATE DATABASE $db" ; done
   psql postgres://postgres:postgres@localhost:5432/postgres -c "CREATE ROLE motor_app NOLOGIN NOBYPASSRLS"
   psql postgres://postgres:postgres@localhost:5432/postgres -c "CREATE ROLE motor_api LOGIN PASSWORD 'motor_api_local' IN ROLE motor_app"
   ```
   La contraseña `motor_api_local` **solo existe en local**. En CI se genera al azar en cada ejecución; en producción la genera Neon.

4. **Navegador de pruebas**
   - En la sesión en la nube ya está instalado: usa `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`. **No** ejecutes `playwright install`.
   - En otro equipo: `npx playwright install chromium`.

5. **Comprobar que todo funciona antes de empezar una marca**
   ```bash
   npm run verificar                                   # lint + tipos + pruebas + compilación
   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e
   ```
   Resultado esperado hoy: lint 0 errores, tipos 0 errores, 53 pruebas Vitest y 3 de punta a punta en verde.

## Variables de entorno

Todas están en `.env.example` (solo nombres). Las de producción se explican en la guía 07. Para pruebas locales no hace falta ninguna: los scripts usan el Postgres local por defecto.

| Variable | Dónde se usa |
|---|---|
| `TEST_DATABASE_URL`, `TEST_API_DATABASE_URL` | `tests/api.test.ts` (base `motor_test`, marca demo) |
| `TIENDA_DATABASE_URL`, `TIENDA_API_DATABASE_URL` | `tests/tienda.test.ts` (base `motor_tienda`, marca alacena-expres) |
| `E2E_DATABASE_URL`, `E2E_API_DATABASE_URL` | Playwright, marca demo (`motor_e2e`) |
| `E2E_TIENDA_DATABASE_URL`, `E2E_TIENDA_API_DATABASE_URL` | Playwright, dark store (`motor_e2e_tienda`) |
| `ESTRES_URL`, `ESTRES_DATABASE_URL`, `ESTRES_SEGUNDOS` | `scripts/estres.ts` |
| `TOGETHER_API_KEY`, `POLLINATIONS_TOKEN`, `AI_HORDE_KEY` | `scripts/imagenes-marca.ts` (guía 05) |
