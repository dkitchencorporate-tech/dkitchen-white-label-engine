# 10 · Problemas conocidos y soluciones

Todo lo que ya ha fallado alguna vez mientras se pulía el motor, para no volver a perder tiempo en ello.

| Síntoma | Causa | Solución |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:5432` en las pruebas | El contenedor en la nube para Postgres tras un rato inactivo | `service postgresql start` y repetir |
| `pkill -f …` termina con código 144 y corta la orden | El patrón coincide con la propia línea de órdenes y el shell se mata a sí mismo | Ejecuta `pkill` **sola** en su propia orden y con un corchete en el patrón: `pkill -f "scripts/servidor-api.t[s]"` |
| `npm audit fix --omit=dev` y después fallan los tipos («Cannot find module 'vitest'») | `--omit=dev` borra las dependencias de desarrollo de `node_modules` | `npm ci` para reinstalarlas. Para auditar, `npm audit --omit=dev`; para arreglar, `npm audit fix` sin `--omit=dev` |
| `Error: http://localhost:5175 is already used` en Playwright | Quedó un `vite preview` o una API de pruebas viva | Paralos con `pkill` (fila anterior) y repite |
| La e2e falla una vez justo después de `npm ci` | El modo desarrollo de Vite optimiza dependencias y recarga la página | Ya resuelto: la e2e usa `vite build` + `vite preview`. No vuelvas al modo desarrollo en la e2e |
| Pollinations devuelve imágenes flojas con marca de agua | Sin token, solo sirve el modelo «sana» (`/models` → `["sana"]`). `model=flux` se ignora | Usa AI Horde, Together AI o Pollinations con token (guía 05) |
| AI Horde responde `403 error code: 1010` | Cloudflare bloquea clientes sin agente de usuario | Cabeceras `User-Agent` y `Client-Agent` (ya incluidas en `scripts/imagenes-marca.ts`) |
| AI Horde tarda horas | Cola anónima saturada (cientos de peticiones para unas 17 máquinas) | Clave gratuita `AI_HORDE_KEY`; el script continúa donde lo dejó si se relanza |
| Las fotos de botellas o latas «se ven de IA» | Texto falso en etiquetas | Etiquetas lisas sin texto en el sujeto y «writing on label, fake text» en el negativo |
| Neon: `action restricted; organization is managed by Vercel` | La organización de Neon está vinculada a Vercel | Crea la base desde Vercel → Storage → Neon (guía 07) |
| GitHub: crear un repo da 404 | La app de GitHub de la sesión no tiene permiso para crear repos en la organización | Lo crea karc0 vacío; después el agente lo rellena con `crear-cliente` |
| `La migración 000X ya aplicada ha cambiado` | Se editó una migración ya aplicada en esa base | Nunca se editan migraciones aplicadas: crea una nueva. En local, recrea la base (`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`) |
| El panel se rompía al mostrar algunas direcciones | La API devuelve la dirección como objeto `{ text, postal_code }` | Resuelto en `formatAddress`: acepta texto, JSON y objeto |
| Los importes llegan como texto desde `pg` | `NUMERIC` se devuelve como cadena | `api/_lib/db.ts` convierte `NUMERIC` a número. El cálculo sigue en SQL |
| Textos del club con «4 puntos» y «25 puntos» en todas las marcas | Valores fijos en las traducciones | Resuelto: marcadores `{pts}` y `{meta}` con los ajustes de la marca (`useClub()`) |
| En un hueco, `React Hook … is called conditionally` | El hook está después de un `return` anticipado | Llama a los hooks al principio del componente (el lint lo detecta) |
| `refs/motor/vX` es ambiguo en la sincronización | La referencia traída coincidía con el nombre de la rama | Resuelto: se usa el espacio `refs/motor-origen/` |
| TypeScript 7 no funciona con typescript-eslint | TypeScript 7 (nativo) no tiene API de JavaScript | Se usa oxlint |
| Rutas `.ts` dentro de `node_modules` no se ejecutan | Node no quita tipos dentro de `node_modules` | Por eso el motor no se distribuye como paquete npm (informe de sincronización) |
