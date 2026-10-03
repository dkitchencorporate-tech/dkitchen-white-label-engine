# 07 · Base de datos (Neon) y despliegue (Vercel)

> **Importante:** la organización de Neon de DKitchen **la gestiona Vercel**. Los proyectos de Neon nuevos **no se pueden crear desde la API de Neon** (responde «organization is managed by Vercel»). Se crean desde Vercel → Storage, y así quedan enlazados al proyecto de Vercel. Cada marca tiene **su propio proyecto de Neon**: nunca se comparte base de datos entre marcas.

## Paso 1 · Proyecto en Vercel (lo hace karc0 o quien tenga acceso)

1. Vercel → **Add New → Project** → importa el repo:
   - forma A: el repo del cliente `<slug>-pwa`;
   - forma B: el repo del motor, con `BRAND=<slug>`.
2. *Framework*: Vite. *Build command*: `vite build`. *Output*: `dist` (ya lo indica `vercel.json`).
3. **Settings → Functions → Region**: la más cercana a los clientes. Para España, **Frankfurt (fra1)**.
4. **Environment Variables** (Production y Preview):
   - `BRAND` = `<slug>` (forma B; en la A también conviene ponerla).

## Paso 2 · Base de datos Neon desde Vercel

1. En el proyecto de Vercel: **Storage → Create Database → Neon**.
2. Nombre `<slug>`, región **la misma que las funciones** (Frankfurt para España). Conéctala al proyecto.
3. Vercel añade variables como `DATABASE_URL`, que son las del **dueño** de la base. **La API no debe usarlas** (ver paso 4).

## Paso 3 · Migrar, sembrar y crear roles

Lo puede hacer el agente con el conector de Neon (en cuanto el proyecto existe, aparece en `list_projects`) o una persona con la conexión del dueño:

```bash
export MIGRATIONS_DATABASE_URL='<conexión del dueño, copiada de la consola de Neon>'
npm run db:migrar                         # aplica db/migraciones/0001…000N y registra sus checksums
npm run db:semilla -- <slug>              # carta, zonas, horario y ajustes
npm run crear-admin -- <correo> "Nombre"  # muestra la contraseña UNA vez → al gestor de contraseñas
```
Rol restringido de la API (sin privilegios de dueño; RLS siempre activa):
```sql
CREATE ROLE motor_api LOGIN PASSWORD '<aleatoria, 32+ caracteres>' IN ROLE motor_app;
```
- En Neon también puede crearse en la consola, en **Roles → New role** (`motor_api`), y añadirse a `motor_app` con `GRANT motor_app TO motor_api;`.

Si se aplican las migraciones con el conector de Neon (SQL a mano) en vez de con `db:migrar`, hay que registrar cada archivo en `schema_migrations` con su checksum SHA-256. Si no, la próxima ejecución de `db:migrar` intentará reaplicarlas:
```bash
sha256sum db/migraciones/*.sql
```
```sql
INSERT INTO schema_migrations (version, checksum) VALUES ('0001_esquema.sql', '<sha256>'), …;
```

Comprobación:
```sql
SELECT version FROM schema_migrations ORDER BY 1;         -- todas las migraciones
SELECT count(*) FROM products;                            -- carta cargada
SELECT rolname FROM pg_roles WHERE rolname IN ('motor_app', 'motor_api');
```

## Paso 4 · Variables de la API en Vercel

| Variable | Valor | Cómo se obtiene |
|---|---|---|
| `APP_DATABASE_URL` | Conexión con el rol **motor_api** | Consola de Neon → *Connect* → rol `motor_api` (con *pooled connection*). Nunca la del dueño |
| `APP_JWT_SECRET` | 64 caracteres aleatorios | `openssl rand -hex 32` |
| `APP_URL` | `https://<dominio>` | El dominio final o el de Vercel |
| `SMTP_*` | Correo saliente (opcional) | Proveedor de correo del cliente |
| `VAPID_*` | Notificaciones push (opcional) | `npx web-push generate-vapid-keys` |
| `BLOB_READ_WRITE_TOKEN` | Subir fotos desde el panel (opcional) | Vercel → Storage → Blob |

`MIGRATIONS_DATABASE_URL` **no** se pone en Vercel: solo se usa desde la máquina o el CI que migra.

**Las contraseñas nunca se pegan en el chat ni en el repositorio.** Se copian de la consola de Neon a Vercel directamente.

## Paso 5 · Desplegar

1. Fusiona el PR de la marca en `main` (o en la rama de producción configurada) y espera al despliegue.
2. Si cambias variables, **Redeploy** para que se apliquen.

## Paso 6 · Comprobación en producción (obligatoria, apuntar resultados en el informe)

1. `https://<dominio>/api/catalog` devuelve JSON con productos (y `zones` si las hay).
2. La web carga, el preloader y la portada se ven, y en móvil la PWA se puede instalar (icono correcto).
3. Cabeceras: `curl -sI https://<dominio>` lleva `Content-Security-Policy`, `Strict-Transport-Security` y `X-Content-Type-Options`.
4. Pedido real de prueba de punta a punta (con el método de pago «efectivo») → aparece en el panel → se cancela desde el panel → las existencias vuelven.
5. Panel: inicio de sesión con el administrador creado; credenciales erróneas → error.
6. Si la marca vende alcohol: pedido con alcohol sin declarar la edad → bloqueado.
7. Borra el pedido de prueba desde el panel.

## Vuelta atrás

- Vercel → Deployments → el despliegue anterior → **Promote to production**.
- Una migración ya aplicada **no se edita jamás**: se corrige con una migración nueva (`000N+1_…sql`).
- Neon guarda historial (6 h en el plan actual): en caso de desastre, **Branches → Restore**. Ninguna operación destructiva se hace sin el visto bueno de karc0.
