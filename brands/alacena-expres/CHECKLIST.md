# Alta de «Alacena Exprés» (brands/alacena-expres)

## Identidad (brands/alacena-expres/brand.config.ts)
- [ ] Datos legales: razón social, CIF, dirección, correo de contacto.
- [ ] Paleta completa (se ha derivado del color principal) y tipografías.
- [ ] Logo e icono definitivos en `recursos/` (icono cuadrado de 512 px o SVG).
- [ ] Textos del club de puntos, SEO (`seo.siteUrl` para el sitemap) y redes sociales.
- [ ] Módulos: revisa el preajuste y activa o desactiva lo que no aplique.
- [ ] Diseño de autor (opcional): componentes propios en `huecos.tsx`.

## Carta y negocio (brands/alacena-expres/semilla.sql)
- [ ] Sustituir la carta de ejemplo por la real: categorías, productos, precios, alérgenos y opciones.
- [ ] Tarifas de envío, pedido mínimo, envío gratis y códigos postales de reparto.
- [ ] Horario semanal (tabla store_hours).

## Base de datos (Neon)
- [ ] Crear el proyecto o la rama de Neon de la marca.
- [ ] `MIGRATIONS_DATABASE_URL=… npm run db:migrar`
- [ ] `MIGRATIONS_DATABASE_URL=… npm run db:semilla -- alacena-expres`
- [ ] `MIGRATIONS_DATABASE_URL=… npm run crear-admin -- <correo>` → guardar la contraseña en el gestor.
- [ ] `CREATE ROLE motor_api LOGIN PASSWORD '<aleatoria>' IN ROLE motor_app;`

## Despliegue (Vercel)
- [ ] `BRAND=alacena-expres`
- [ ] `APP_DATABASE_URL` (rol motor_api, nunca el dueño)
- [ ] `APP_JWT_SECRET` (`openssl rand -hex 32`)
- [ ] `APP_URL` (dominio definitivo)
- [ ] Opcional: `SMTP_*`, `VAPID_*`, `BLOB_READ_WRITE_TOKEN`, `PAGOS_PROVEEDOR`
- [ ] Dominio o subdominio y comprobación de la PWA instalable en móvil.

## Comprobación final
- [ ] `BRAND=alacena-expres npm run build` sin errores.
- [ ] Pedido de prueba de punta a punta y ticket impreso.
