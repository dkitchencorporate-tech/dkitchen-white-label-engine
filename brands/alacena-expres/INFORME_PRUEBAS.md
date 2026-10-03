# Informe de pruebas · Alacena Exprés (`brands/alacena-expres`)

*Fecha:* 2026-10-03 · *Versión del motor:* 1.0.0 (más los cambios de la Fase 3, PR #6) · *Commit:* `d0fa47e` · *Responsable:* agente en la nube

Hecho con la plantilla `docs/manual/plantillas/INFORME_PRUEBAS.md` y el procedimiento de `docs/manual/06_PRUEBAS.md`.

## 1. Resumen

| Capa | Orden | Resultado | Criterio |
|---|---|---|---|
| Lint | `npm run lint` | 0 errores · 315 avisos (heredados: `any` y reglas del compilador de React) | 0 errores ✓ |
| Tipos | `npm run typecheck` | 0 errores | 0 ✓ |
| Pruebas | `npm test` | 53 / 53 (api 18, tienda 18, motor 6, frontend 6, marca 5) | todas ✓ |
| Compilación | `BRAND=alacena-expres npm run build` | ✓ · paquete principal 103 kB comprimido; escaparate 3D aparte (133 kB, en diferido) | sin errores ✓ |
| Punta a punta | `npm run test:e2e` | 3 / 3, sobre la compilación de producción, tres veces seguidas | todas ✓ |
| Estrés | `npx tsx scripts/estres.ts` | Invariantes correctos | ✓ |
| Dependencias | `npm audit --omit=dev` | 0 vulnerabilidades | 0 ✓ |

## 2. Punta a punta de la marca (`e2e/tienda.spec.ts`, móvil Pixel 7)

1. Al entrar se pide la zona. 48001 → «Todavía no llegamos al 48001». 28001 → zona Salamanca.
2. Precio de zona en la carta: queso manchego 7,90 € × 1,05 = **8,30 €**.
3. Rioja (alcohol) al carrito; 2 quesos → el botón muestra **16,60 €**.
4. Checkout:
   - el código postal llega relleno y se ve «Envío · Salamanca»;
   - **«Confirmar» desactivado** hasta marcar «Tengo 18 años o más»;
   - mensaje de regalo «¡Feliz cumpleaños, Marta!».
5. Panel: el pedido aparece con «🔞 pedir DNI en la entrega» y el mensaje de regalo.

## 3. Seguridad (`tests/tienda.test.ts`)

Todos los ataques de la guía 06 están bloqueados:
- precios, zona y ajuste falsos;
- inyección SQL;
- XSS en el regalo;
- rangos;
- tokens falsos y `alg: none`;
- cliente actuando como administrador;
- códigos postales duplicados;
- URLs de imagen maliciosas;
- rol de la API directo a la base;
- seguimiento ajeno;
- fuerza bruta (429 desde el pedido 11);
- alcohol sin edad o fuera de franja;
- sobreventa concurrente (30 compras por 10 unidades → 10).

## 4. Estrés (una instancia local, pool de 5 conexiones, 15 s por escenario)

| Escenario | Peticiones | Por segundo | p50 (ms) | p95 (ms) | p99 (ms) | Máx. (ms) | Respuestas |
|---|---|---|---|---|---|---|---|
| GET /api/catalog · 50 concurrentes | 8926 | 591 | 81 | 107 | 124 | 197 | 200: 8926 |
| POST /api/checkout · 25 concurrentes | 11826 | 787 | 31 | 40 | 48 | 93 | 200: 10672, 400: 1154 |

- **Carrera:** 200 pedidos simultáneos por 50 unidades → **50 vendidos**, existencias finales 0.
- **Límite por IP:** 200 × 10 y después 429 × 5.
- **Invariantes:** 0 existencias negativas y 0 totales descuadrados tras 10 732 pedidos.
- **Los 400** son pedidos aleatorios por debajo del mínimo de la zona de Pozuelo (40 €).

## 5. Fotos

- **Generador:** Juggernaut XL vía AI Horde, gratis.
- **Estado:** generación en curso (30 aprobadas de 88; 42 revisadas).
- **Rechazadas hasta ahora:** 15 de 42 revisadas. Los 8 vinos, por texto inventado en la etiqueta: los productos con etiqueta pasan a los agentes locales (`docs/entregas/FOTOS_PARA_AGENTES_LOCALES_ALACENA.md`). Mejillones y berberechos, por salir con concha. La ventresca, por parecer cruda. Y estas 4:
  - latas con una marca inventada;
  - un salchichón que parecía jamón;
  - una sobrasada glaseada;
  - una tabla de quesos con carne.
- **Descartado:** Pollinations sin token (modelo «sana», baja calidad, marca de agua).

## 6. Comprobación en producción (guía 07, paso 6)

Pendiente: karc0 tiene que crear el proyecto de Vercel y su base Neon.
- [ ] /api/catalog
- [ ] PWA instalable
- [ ] cabeceras de seguridad
- [ ] pedido real y cancelación
- [ ] panel
- [ ] alcohol bloqueado sin edad

## 7. Hallazgos y correcciones

| Hallazgo | Gravedad | Corrección |
|---|---|---|
| `nodemailer` vulnerable (fuga de credenciales SMTP entre transportes, DoS) | Alta | Actualizado |
| `dompurify` (XSS en un modo no usado) | Baja | Actualizado |
| El panel aceptaba imágenes por `http://` | Media | Solo `https://` o `/marca/…` |
| El panel de pedidos se rompía con direcciones en objeto | Alta (funcional) | `formatAddress` |
| El checkout permitía pedir bajo el mínimo y el servidor lo rechazaba | Media (funcional) | Mismas reglas que el servidor |
| Textos del club fijos (4 puntos y 25 para canjear) | Media (funcional) | `{pts}` y `{meta}` desde los ajustes |
| La e2e en modo desarrollo podía recargar la página en frío | Baja (pruebas) | e2e sobre la compilación de producción |

## 8. Pendiente y riesgos aceptados

- Terminar las 88 fotos y su revisión una a una.
- Despliegue y comprobación en producción.
- `braces` (vulnerabilidad de desarrollo, a través de Tailwind 3): solo afecta a la compilación; requiere migrar a Tailwind 4.
- 2FA del panel (pendiente del motor).
- La franja del alcohol y los alérgenos los confirma el cliente.
