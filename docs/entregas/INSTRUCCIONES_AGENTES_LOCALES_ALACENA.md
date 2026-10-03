# Instrucciones para los agentes locales · Despliegue de «Alacena Exprés»

**De:** agente del motor DKitchen (sesión en la nube)
**Para:** agentes locales de karc0 con acceso a Vercel, a Neon (vía Vercel) y a la consola del navegador
**Objetivo:** dejar preparado el proyecto de Vercel y su base de datos Neon para que la sesión en la nube termine el despliegue de la marca `alacena-expres` (dark store gourmet en Madrid), **sin afectar a ningún otro proyecto**.
**Tiempo estimado:** 20–30 minutos.

---

## 0. Reglas (léelas antes de empezar)

1. **No toques ningún otro proyecto** de Vercel ni de Neon. En Neon ya existen, y no se modifican:
   - `damp-bread-00679784` (Wing Boss);
   - `nameless-river-21661491` (Seven Food Fries);
   - `silent-block-36604595` y `sparkling-pine-08948845` (ajenos);
   - cualquier recurso de **Néstor Pizzas**.
2. **Ninguna contraseña, clave ni cadena de conexión** se pega en el chat con la sesión en la nube, ni en un archivo del repositorio. Se copian **directamente** de la consola de Neon a las variables de Vercel o a un gestor de contraseñas.
3. Haz los pasos **en orden**. Donde pone **⏸ PARA**, espera a que la sesión en la nube confirme antes de seguir.
4. Si algo no coincide con lo que se describe, no improvises: anota el mensaje exacto de error y pásalo en el informe del paso 8.

## Datos fijos

| Dato | Valor |
|---|---|
| Organización de GitHub | `dkitchencorporate-tech` |
| Repositorio | `dkitchen-white-label-engine` (el repo del motor; decisión de karc0) |
| Rama con la marca | `nube/fase-3-prueba-de-fuego` (PR #6). La sesión en la nube la fusionará en `main` cuando estén las fotos |
| Marca | `alacena-expres` |
| Región (funciones y base de datos) | **Frankfurt** (Vercel `fra1` · Neon `aws-eu-central-1`) |
| Nombre del proyecto en Vercel | `alacena-expres` |
| Nombre de la base en Neon | `alacena-expres` |

---

## 1. Crear el proyecto en Vercel

1. Vercel → *Add New…* → **Project** → *Import Git Repository* → `dkitchencorporate-tech/dkitchen-white-label-engine`.
   - Si no aparece, en *Adjust GitHub App Permissions* da acceso a ese repo.
2. **Project Name**: `alacena-expres`.
3. **Framework Preset**: `Vite`. **Root Directory**: `./` (la raíz). No cambies *Build Command* ni *Output Directory*: `vercel.json` ya indica `vite build` y `dist`.
4. **Environment Variables**: añade, para **Production y Preview**:
   - `BRAND` = `alacena-expres`
5. Pulsa **Deploy**. Este primer despliegue sale de `main` y mostrará la marca de demostración o fallará al pedir datos: es normal, aún no hay base de datos.
6. Settings → **Functions** → *Function Region* → **Frankfurt, Germany (fra1)** → Save.
7. Settings → **Git** → comprueba que *Production Branch* es `main`.

✅ **Comprobación:** el proyecto `alacena-expres` existe, con `BRAND` en Production y Preview y la región `fra1`.

## 2. Crear la base de datos Neon desde Vercel

La organización de Neon de DKitchen **la gestiona Vercel**: la base se crea desde Vercel, no desde la consola de Neon.

1. En el proyecto `alacena-expres` → pestaña **Storage** → *Create Database* → **Neon** (Serverless Postgres) → *Continue*.
2. **Región**: *Frankfurt (eu-central-1)*. **Nombre**: `alacena-expres`. Plan: el mismo que los demás proyectos (gratuito).
3. *Create* → en *Connect Project* elige `alacena-expres` y marca **Production y Preview** → *Connect*.
4. Vercel añadirá variables como `DATABASE_URL`, `PGHOST`… **No las borres y no las uses en la API**: son del dueño de la base. La API usará su propio rol restringido (paso 5).

✅ **Comprobación:** en Storage aparece la base `alacena-expres` conectada al proyecto. En la consola de Neon (*Open in Neon*) se ve un proyecto nuevo con la base `neondb` (o la que haya creado Vercel).

## 3. Avisar a la sesión en la nube (sin secretos)

Pega en la sesión en la nube este mensaje, rellenado:

```
Alacena lista para migrar.
- Proyecto Vercel: alacena-expres (URL: https://<lo-que-asigne-vercel>.vercel.app)
- Proyecto Neon: <nombre del proyecto en Neon> (id: <id del proyecto, p. ej. xxxx-xxxx-12345678>)
- Base de datos: <nombre de la base, p. ej. neondb> · Región: aws-eu-central-1
```

El id del proyecto está en la consola de Neon → *Settings* → *General* → *Project ID*. **No pegues contraseñas ni cadenas de conexión.**

**⏸ PARA.** La sesión en la nube, con su conector de Neon:
- aplica las migraciones `0001–0004` y las registra con su checksum;
- carga la semilla de Alacena (88 productos, 4 zonas de Madrid, horario y ajustes);
- crea el rol de grupo `motor_app` con sus permisos y la seguridad por filas (RLS).

Espera su respuesta «Base migrada y sembrada» antes de seguir.

## 4. Crear el rol restringido de la API (por SQL, no desde «Roles»)

> **Importante:** no crees `motor_api` desde la pantalla *Roles* de Neon. Los roles creados ahí entran en `neon_superuser`, que tiene privilegios de más. Se crea por SQL para que **solo** sea miembro de `motor_app`.

1. Genera una contraseña en tu terminal y guárdala **directamente** en el gestor de contraseñas:
   ```bash
   openssl rand -hex 24
   ```
2. Consola de Neon → **SQL Editor** (base de Alacena, rama `main`) → ejecuta, sustituyendo `<CONTRASEÑA>`:
   ```sql
   CREATE ROLE motor_api LOGIN PASSWORD '<CONTRASEÑA>' NOBYPASSRLS NOCREATEDB NOCREATEROLE IN ROLE motor_app;
   ```
3. Comprobación en el mismo editor:
   ```sql
   SELECT r.rolname, r.rolbypassrls, r.rolcreaterole, array_agg(m.roleid::regrole) AS miembro_de
   FROM pg_roles r LEFT JOIN pg_auth_members m ON m.member = r.oid
   WHERE r.rolname = 'motor_api' GROUP BY 1, 2, 3;
   ```
   Debe salir `motor_api | false | false | {motor_app}`. Si aparece `neon_superuser`, ejecuta `REVOKE neon_superuser FROM motor_api;` y repite la comprobación.

## 5. Variables de la API en Vercel

Proyecto `alacena-expres` → Settings → **Environment Variables**. Para **Production y Preview**:

| Variable | Valor | De dónde sale |
|---|---|---|
| `APP_DATABASE_URL` | `postgresql://motor_api:<CONTRASEÑA>@<HOST-POOLER>/<BASE>?sslmode=require` | En la consola de Neon → **Connect** (con *Connection pooling* activado) copia el **host** (el que lleva `-pooler`) y el nombre de la base; el usuario es `motor_api` y la contraseña la del paso 4. **Nunca** uses la cadena del dueño |
| `APP_JWT_SECRET` | 64 caracteres aleatorios | `openssl rand -hex 32` |
| `APP_URL` | `https://<dominio o URL de Vercel del proyecto>` | La URL de producción del proyecto |

No pongas `MIGRATIONS_DATABASE_URL` en Vercel.

Después: Deployments → el último → **⋯ → Redeploy**.

## 6. Crear el administrador (la contraseña nunca sale de tu equipo)

En una terminal con Node.js 18 o superior:
```bash
mkdir -p /tmp/alacena-admin && cd /tmp/alacena-admin && npm init -y >/dev/null && npm i bcryptjs >/dev/null
node -e "
const b=require('bcryptjs'),c=require('crypto');
const a='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#%*+-=?';
let p='';for(let i=0;i<20;i++)p+=a[c.randomInt(a.length)];
console.log('CONTRASEÑA (al gestor, no al chat):',p);
console.log('HASH:',b.hashSync(p,12));"
```
1. Guarda la **contraseña** en el gestor de contraseñas. El usuario será `dkitchen@dkitchencorporate.es`, el mismo que en los demás proyectos de DKitchen.
2. Consola de Neon → SQL Editor → ejecuta **todo junto**, sustituyendo `<HASH>` por el hash impreso (empieza por `$2a$12$` o `$2b$12$`):
   ```sql
   BEGIN;
   SELECT set_config('app.trusted', 'on', true);
   INSERT INTO profiles (email, password_hash, full_name, is_admin, is_email_verified)
   VALUES (lower('dkitchen@dkitchencorporate.es'), '<HASH>', 'DKitchen', true, true)
   ON CONFLICT ((lower(email))) DO UPDATE
     SET password_hash = EXCLUDED.password_hash, is_admin = true,
         token_version = profiles.token_version + 1;
   COMMIT;
   ```
3. Comprobación:
   ```sql
   SELECT email, is_admin, is_email_verified FROM profiles WHERE is_admin;
   ```
   Debe salir una fila: `dkitchen@dkitchencorporate.es | true | true`.
4. Borra la carpeta temporal: `rm -rf /tmp/alacena-admin`.

## 7. Comprobación rápida

Con la URL de producción (o la de *Preview* de la rama `nube/fase-3-prueba-de-fuego`, que ya incluye el diseño nuevo):
1. `https://<url>/api/catalog` → JSON con `products` (88) y `zones` (4).
2. La web pide el código postal. Con `28004`, la carta muestra precios.
3. `https://<url>/admin` → entra con el administrador del paso 6.
4. `curl -sI https://<url> | grep -iE "content-security-policy|strict-transport|x-content-type"` → aparecen las tres cabeceras.

> Mientras la rama no se fusione en `main`, la URL de **producción** puede mostrar la versión anterior. Usa la URL de **Preview** de la rama para comprobar el diseño nuevo.

## 8. Informe para la sesión en la nube (sin secretos)

Pega en la sesión en la nube:

```
Alacena preparada.
- Rol motor_api creado por SQL, miembro solo de motor_app (comprobación del paso 4): sí/no
- Variables en Vercel (Production y Preview): APP_DATABASE_URL sí/no · APP_JWT_SECRET sí/no · APP_URL = https://…
- Administrador creado (dkitchen@dkitchencorporate.es): sí/no (contraseña guardada en el gestor)
- Redeploy hecho: sí/no · URL producción: https://… · URL preview de la rama: https://…
- Comprobación rápida: /api/catalog __ productos y __ zonas · código postal OK/KO · /admin OK/KO · cabeceras OK/KO
- Errores (texto exacto, si los hubo): …
```

Con eso, la sesión en la nube hará la comprobación completa en producción (guía `docs/manual/07_BASE_DE_DATOS_Y_DESPLIEGUE.md`, paso 6):
- pedido real con alcohol bloqueado sin edad;
- cancelación con devolución de existencias;
- PWA instalable.

Después fusionará el PR #6 y dejará el informe final en `brands/alacena-expres/INFORME_PRUEBAS.md`.

## 9. Opcional: acelerar las fotos

Las fotos de producto se generan gratis en una cola pública lenta. Para acelerar, añade en los ajustes del **entorno de la sesión en la nube** (barra de título → entorno → *Edit* → variables de entorno) **una** de estas variables. La recoge la siguiente sesión.

| Variable | Dónde se obtiene |
|---|---|
| `AI_HORDE_KEY` | aihorde.net/register (gratis) |
| `TOGETHER_API_KEY` | together.ai, FLUX.1 schnell gratuito |

---

*Procedimiento general para cualquier marca: `docs/manual/00_INDICE.md`.*
