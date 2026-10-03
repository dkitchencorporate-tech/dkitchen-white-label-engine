# 06 · Pruebas y resultados

Ninguna marca se entrega sin pasar **las seis capas** de esta guía y sin su **informe escrito** (`plantillas/INFORME_PRUEBAS.md`, copiado a `brands/<slug>/INFORME_PRUEBAS.md`). El CI repite las capas 1–5 en cada PR; la 6 (estrés) se ejecuta a mano antes de entregar.

| Capa | Orden | Qué demuestra | Criterio de aceptación |
|---|---|---|---|
| 1. Lint | `npm run lint` | Sin errores de corrección | 0 errores (los avisos no bloquean) |
| 2. Tipos | `npm run typecheck` | TypeScript estricto en frontend, API y marcas | 0 errores |
| 3. Pruebas | `npm test` | API, tienda, seguridad, sincronización y lógica del frontend contra Postgres real | Todas en verde |
| 4. Compilación | `BRAND=<slug> npm run build` | La marca compila; configuración válida; iconos y manifest | Sin errores |
| 5. Punta a punta | `npm run test:e2e` | Un cliente real en móvil compra y el panel lo ve | Todas en verde |
| 6. Estrés | `npx tsx scripts/estres.ts` | Aguanta carga sin vender de más ni descuadrar | Invariantes correctos |

Atajo de las capas 1–4: `npm run verificar`.

## 1–4. Lint, tipos, pruebas y compilación

```bash
service postgresql start                 # si estás en la sesión en la nube
npm run verificar
BRAND=<slug> npm run build
```
- Si falla `npm test` con `ECONNREFUSED 5432`, Postgres está parado (guía 10).
- Si falla la compilación de la marca, el mensaje indica el campo de `brand.config.ts`.

### Qué cubre `npm test` (53 pruebas a día de hoy)

| Archivo | Pruebas | Contenido |
|---|---|---|
| `tests/api.test.ts` | 18 | Cuentas, tokens revocables, límites de peticiones, checkout, puntos, RLS (marca demo) |
| `tests/tienda.test.ts` | 18 | Zonas, alcohol, existencias, concurrencia, regalos y **seguridad** (dark store) |
| `tests/motor.test.ts` | 6 | Publicar, crear cliente, verificar y actualizar el motor con repos simulados |
| `tests/frontend.test.ts` | 6 | Opciones de producto, carrito, tema y preajustes |
| `tests/marca.test.ts` | 5 | Validación de marcas y generador |

## 5. Punta a punta (Playwright)

```bash
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e     # sesión en la nube
npm run test:e2e                                                # otro equipo
```
- Se prueba la **compilación de producción** (`vite build` + `vite preview`) de cada marca en móvil (Pixel 7), contra su propia API y base de datos recién sembradas.
- La preparación (`e2e/preparar.ts`) recrea las bases, siembra cada marca, abre el horario y crea un administrador con contraseña aleatoria guardada solo en `test-results/` (ignorado por git).

### Añadir la e2e de una marca nueva (obligatorio si tiene módulos propios: zonas, alcohol, regalos…)

1. En `playwright.config.ts`, añade un proyecto y sus dos servidores, copiando el bloque `tienda`: puertos libres (API 31xx y web 51xx), `BRAND=<slug>` y su base `motor_e2e_<slug>`.
2. En `e2e/preparar.ts`, añade `prepararBase(<url>, '<slug>', <archivo de credenciales>)`.
3. En CI (`.github/workflows/ci.yml`), crea la base y exporta sus dos variables, como `motor_e2e_tienda`.
4. Crea `e2e/<slug>.spec.ts` con este recorrido mínimo (modelo: `e2e/tienda.spec.ts`):
   - entrar y, si hay zonas, probar un código postal fuera de zona (aviso) y uno válido;
   - comprobar **un precio exacto** en la carta (con el ajuste de zona si lo hay);
   - añadir un producto con opciones y uno con alcohol (si la marca vende alcohol);
   - checkout: rellenar datos y comprobar que **no deja confirmar** sin declarar la edad;
   - mensaje de regalo (si el módulo está activo) y confirmar;
   - entrar al panel y ver el pedido con sus avisos.
5. Usa siempre selectores accesibles (`getByRole`, `getByLabel`, textos visibles). Si un elemento no se puede seleccionar así, es un fallo de accesibilidad del componente: se arregla el componente, no la prueba (ejemplo: la barra del carrito era un `div` y pasó a ser un `button`).

## Seguridad: qué se prueba y cómo se amplía

`tests/tienda.test.ts`, bloque «Seguridad», más las de `tests/api.test.ts`. Ataques cubiertos:

1. Precios, subtotales o totales falsos en el pedido → ignorados.
2. Zona o ajuste de precio falsos → ignorados (el servidor decide por el código postal).
3. Inyección SQL en nombre y notas → se guarda como texto.
4. XSS en el mensaje de regalo → se guarda literal y React lo escapa.
5. Cantidades, líneas o identificadores fuera de rango → 400.
6. Panel sin token, con token de otro secreto o con `alg: none` → 401. Cliente actuando como administrador → 403.
7. Zonas con un código postal duplicado o no válido → 400 (lo impide la base de datos).
8. Imágenes con `javascript:`, `http:`, `data:` o `../` → 400.
9. Rol de la API conectado directamente a la base → no ve perfiles ni pedidos, no cambia precios, no desactiva RLS.
10. Seguimiento de pedidos ajenos → 404 o 400.
11. Fuerza bruta de pedidos → 429 a partir del 11.º por minuto e IP.
12. Alcohol sin declarar la edad o fuera de la franja → 400.
13. Comprar más de las existencias y 30 compras simultáneas por 10 unidades → nunca se vende de más.

**Cada funcionalidad nueva del motor añade al menos una prueba de abuso** en este bloque. Además, antes de cada entrega:
```bash
npm audit --omit=dev      # debe dar 0 vulnerabilidades en producción
```
Si aparece alguna: `npm audit fix` **sin** `--omit=dev` (con `--omit=dev` borra las dependencias de desarrollo, guía 10), y después `npm run verificar`. Lo que no se pueda arreglar se documenta en el informe con su impacto real.

## 6. Estrés

**Nunca contra producción** (crea miles de pedidos). Contra una base local o de pruebas con la semilla de la marca:
```bash
psql <base> -c "UPDATE store_hours SET is_open=true, open_time='00:00', close_time='23:59'; UPDATE store_settings SET alcohol_sale_start=NULL, alcohol_sale_end=NULL;"
API_PORT=3001 APP_DATABASE_URL=<url con motor_api> APP_JWT_SECRET=<48 caracteres> npm run dev:api &
ESTRES_URL=http://localhost:3001 ESTRES_DATABASE_URL=<url del dueño> ESTRES_SEGUNDOS=15 npx tsx scripts/estres.ts
```
El script imprime una tabla en Markdown lista para pegar en el informe:

1. Lectura de la carta con 50 clientes simultáneos.
2. Pedidos con 25 clientes simultáneos y códigos postales de todas las zonas.
3. Carrera: 200 pedidos a la vez por las últimas 50 unidades de un producto.
4. Límite por IP: 15 pedidos seguidos desde la misma IP.
5. Invariantes en la base de datos: ninguna existencia negativa y ningún total descuadrado.

**Criterios de aceptación:**
- termina con «✓ Invariantes correctos»;
- en la carrera se venden **exactamente** las unidades disponibles;
- los 429 empiezan en el pedido 11;
- p99 de pedidos por debajo de 200 ms en local.

Los 400 de la carga de pedidos son normales si se deben a pedidos por debajo del mínimo de una zona; compruébalo si su número es alto.

Resultado de referencia (Alacena, una instancia local): unas 590 lecturas/s y 790 pedidos/s; p99 de 48 ms en pedidos; 50 de 50 vendidos; 0 existencias negativas y 0 descuadres tras más de 10 700 pedidos.

## 7. Capturas (prueba visual)

Con `vite preview` y la API levantados, este script hace capturas en móvil y escritorio, con WebGL por software para que el 3D también salga:
```js
// capturas.mjs — node capturas.mjs <carpeta de salida>
import { chromium, devices } from '@playwright/test';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [n, ctx] of [['movil', devices['Pixel 7']], ['escritorio', { viewport: { width: 1440, height: 900 } }]]) {
  const p = await b.newPage(ctx);
  await p.goto('http://localhost:5175/');
  // Si la marca tiene zonas: rellenar código postal y confirmar.
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `${S}/portada-${n}.png` });
  await p.mouse.wheel(0, 1200); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${S}/carta-${n}.png` });
}
await b.close();
```

## 8. Informe

Copia `docs/manual/plantillas/INFORME_PRUEBAS.md` a `brands/<slug>/INFORME_PRUEBAS.md` y rellénalo con los números reales de cada capa, las fotos rechazadas, los hallazgos y lo que queda pendiente. Se enlaza en el PR y en `ENTREGA.md`. Referencia completa: `docs/PRUEBAS_SEGURIDAD_Y_ESTRES.md`.
