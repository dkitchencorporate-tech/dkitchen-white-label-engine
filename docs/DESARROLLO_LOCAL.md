# Desarrollo local y despliegue

## Requisitos
- Node 20 o superior.
- PostgreSQL 15 o superior en local (o Docker), o una rama de Neon para desarrollo.

## 1. Base de datos local

```bash
# Crear las bases de desarrollo y de pruebas (como superusuario de Postgres)
psql -U postgres -c 'CREATE DATABASE motor_dev;' -c 'CREATE DATABASE motor_test;'

# Esquema, funciones y seguridad (migraciones numeradas de db/migraciones/)
export MIGRATIONS_DATABASE_URL=postgres://postgres:postgres@localhost:5432/motor_dev
npm run db:migrar

# Semilla de la marca (brands/<slug>/semilla.sql) y administrador (la contraseña se muestra una sola vez)
npm run db:semilla -- demo
npm run crear-admin -- admin@demo.example "Admin Demo"

# Rol de login de la API: miembro de motor_app, sin BYPASSRLS y sin ser dueño
psql -U postgres -d motor_dev -c "CREATE ROLE motor_api LOGIN PASSWORD 'motor_api_local' IN ROLE motor_app;"
```

## 2. Variables y arranque

Copia `.env.example` a `.env.local`. Para la API local basta con:

```bash
export APP_DATABASE_URL=postgres://motor_api:motor_api_local@localhost:5432/motor_dev
export APP_JWT_SECRET=$(openssl rand -hex 32)
npm run dev:api     # API en http://localhost:3001 (emula las rutas de vercel.json)
npm run dev         # PWA en http://localhost:5173 (redirige /api a la API local)
BRAND=otra npm run dev   # la misma PWA con la identidad de brands/otra
```

## 3. Calidad y pruebas

```bash
npm run lint        # oxlint (errores bloquean; avisos se van reduciendo)
npm run typecheck   # TypeScript estricto del frontend y de la API
npm test            # Vitest: lógica del frontend + integración de la API contra Postgres real
npm run build       # compilación de la marca indicada en BRAND (demo por defecto)
npm run verificar   # todo lo anterior seguido
npm run test:e2e    # Playwright: carta → carrito → pedido → panel, en móvil
```

- Las pruebas de API usan `TEST_DATABASE_URL` (dueño) y `TEST_API_DATABASE_URL` (rol `motor_api`) y recrean `motor_test` desde cero.
- Las de punta a punta usan `E2E_DATABASE_URL` y `E2E_API_DATABASE_URL` (base `motor_e2e`). Arrancan solas la API (puerto 3102) y Vite (5174), siembran la marca demo y crean un administrador con contraseña aleatoria que solo vive en `test-results/` (ignorado por git).
- Si no se definen, todas usan el Postgres local de arriba (`CREATE DATABASE motor_test; CREATE DATABASE motor_e2e;`).
- En este contenedor, Chromium ya está instalado: `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e`. En otra máquina: `npx playwright install chromium`.
- **CI** (`.github/workflows/ci.yml`): cada PR ejecuta lint, tipos, pruebas, compilación y punta a punta contra un Postgres 16 efímero. La contraseña del rol de la API se genera al azar en cada ejecución.

## 4. Producción (Neon + Vercel)

1. En Neon, con el rol dueño (`neondb_owner`):
   - `MIGRATIONS_DATABASE_URL=<conexión del dueño> npm run db:migrar`;
   - `npm run db:semilla -- <marca>` (o la semilla de la marca);
   - `npm run crear-admin -- <correo>` (guarda la contraseña en un gestor, nunca en el repo);
   - crear el rol de la API con contraseña aleatoria: `CREATE ROLE motor_api LOGIN PASSWORD '<aleatoria>' IN ROLE motor_app;`.
2. En Vercel, configurar las variables de `.env.example`:
   - `APP_DATABASE_URL` con el rol `motor_api`, **nunca** con el dueño;
   - `APP_JWT_SECRET` (32 o más caracteres);
   - `APP_URL`.
3. `MIGRATIONS_DATABASE_URL` **no** va en Vercel: solo se usa desde la máquina o el CI que migra.

## 5. Reglas de la API

- **Precios y totales:** siempre en SQL (`process_checkout`, `motor_calcular_lineas`). Los precios que envía el navegador se descartan.
- **Entrada:** toda se valida con zod (`api/_lib/esquemas.ts`).
- **Errores de negocio:** se lanzan en SQL con `ERRCODE P0001` y un mensaje apto para el cliente. Cualquier otro error devuelve un mensaje genérico con `requestId` y se registra sin datos personales.
- **Seguridad en base de datos:** RLS en todas las tablas. La API fija `app.user_id` con el usuario del JWT, y las políticas y funciones deciden con eso.
- **Tokens:** llevan `token_version`. Al incrementarla en la BD, los tokens anteriores dejan de valer al instante.
- **Cambios de esquema:** siempre con una migración nueva (`0004_…sql`). Nunca se editan las migraciones ya aplicadas en una base real.
