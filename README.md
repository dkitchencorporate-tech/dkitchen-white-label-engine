# DKitchen · Motor de marca blanca

Motor de replicación de PWAs para hostelería (restaurante, bar, dark kitchen, dark store): carta, pedidos a domicilio y recogida, kiosko/TPV de mostrador, panel de gestión y fidelización. El código se reutiliza; la identidad visual de cada marca es única.

> Estado: en pleno pulido (Fases 1A y 1B completadas: API y base de datos nuevas; motor separado de la marca). Plan y decisiones en `docs/ANALISIS_PRODUCTO.md`; estado vivo en `ESTADO_PROYECTO.md`.

## Arquitectura

| Capa | Tecnología |
|---|---|
| PWA y panel | React 19 + Vite, Zustand, Tailwind compilado |
| Marcas | `brands/<slug>/` (configuración validada con zod, tema, huecos, recursos, semilla); `BRAND=<slug>` al compilar |
| API | Funciones de Vercel en TypeScript estricto (`api/*.ts`), validación con zod |
| Datos | PostgreSQL (Neon) con migraciones numeradas (`db/migraciones/`), RLS en todas las tablas y lógica de negocio en funciones `SECURITY DEFINER` |
| Pruebas | Vitest contra Postgres real (`tests/`) |

**Principios:**
- El precio lo calcula siempre el servidor.
- La API usa un rol sin privilegios especiales.
- No hay secretos en el código.
- Ninguna contraseña por defecto.

## Empezar

Guía completa en [`docs/DESARROLLO_LOCAL.md`](docs/DESARROLLO_LOCAL.md). Resumen:

```bash
npm ci
npm run db:migrar          # con MIGRATIONS_DATABASE_URL (rol dueño)
npm run db:semilla -- demo # marca neutra de ejemplo
npm run crear-admin -- tu@correo.es
npm run dev:api & npm run dev
npm test
```

Variables de entorno: ver [`.env.example`](.env.example). Solo lleva nombres, nunca valores.

## Documentación

- `docs/AUDITORIA_MOTOR.md`: auditoría inicial del motor.
- `docs/AUDITORIA_VERSIONES_PREVIAS.md`: lo aprendido de Wing Boss, Bokadipan, Seven Food Fries y Néstor.
- `docs/ANALISIS_PRODUCTO.md`: visión, decisiones y plan de fases.
- `docs/ACTUALIZACIONES_MARCAS.md`: qué hay que hacer en cada marca al terminar el pulido.
- `docs/DESARROLLO_LOCAL.md`: desarrollo, pruebas y despliegue.
- `docs/NUEVA_MARCA.md`: alta de una marca nueva con `npm run nueva-marca`.
- `docs/PAGOS_Y_HARDWARE.md`: capas de pagos y hardware (adaptadores).
