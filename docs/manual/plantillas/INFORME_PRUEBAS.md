# Informe de pruebas · <Nombre de la marca> (`brands/<slug>`)

*Fecha:* AAAA-MM-DD · *Versión del motor:* x.y.z · *Commit:* `<sha>` · *Responsable:* <nombre o agente>

## 1. Resumen

| Capa | Orden | Resultado | Criterio |
|---|---|---|---|
| Lint | `npm run lint` | __ errores · __ avisos | 0 errores |
| Tipos | `npm run typecheck` | __ errores | 0 |
| Pruebas | `npm test` | __ / __ | todas |
| Compilación | `BRAND=<slug> npm run build` | ✓ / ✗ (tamaño del paquete principal: __ kB comprimido) | sin errores |
| Punta a punta | `npm run test:e2e` | __ / __ | todas |
| Estrés | `npx tsx scripts/estres.ts` | ✓ / ✗ | invariantes correctos |
| Dependencias | `npm audit --omit=dev` | __ vulnerabilidades | 0 |

## 2. Punta a punta de la marca
Recorrido probado (`e2e/<slug>.spec.ts`): …

## 3. Seguridad
Ataques probados y resultado (lista de la guía 06 + los propios de esta marca): …

## 4. Estrés
(pegar la tabla que imprime `scripts/estres.ts`)

## 5. Fotos
Generadas: __ · Rechazadas y repetidas: __ (motivos: …) · Aportadas por el cliente: __

## 6. Comprobación en producción (guía 07, paso 6)
- [ ] /api/catalog · [ ] PWA instalable · [ ] cabeceras de seguridad · [ ] pedido real y cancelación · [ ] panel · [ ] alcohol bloqueado sin edad

## 7. Hallazgos y correcciones
| Hallazgo | Gravedad | Corrección | Commit |
|---|---|---|---|

## 8. Pendiente y riesgos aceptados
…
