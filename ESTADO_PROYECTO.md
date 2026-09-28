# 🏭 ESTADO DE PROYECTO: DKITCHEN WHITE-LABEL ENGINE v3.1 (MOTOR MATRIZ ENTERPRISE)

> **⚠️ PROTOCOLO DE ARRANQUE Y GATEKEEPER DE TOKENS (OBLIGATORIO):**  
> 1. **Comprobación de Esfuerzo de Razonamiento:** Al iniciar la sesión, comprueba si el modelo está en modo `High` (Thinking profundo). Si está en `High` sin autorización expresa y previa de karc0, **adviértele de inmediato y recomiéndale bajar a modo Normal/Medium** para no quemar la cuota de tokens.  
> 2. **Límite de Carpeta Estricto:** Esta sesión pertenece al Motor Matriz Marca Blanca. Prohibido salir de este directorio o contaminarlo con marcas comerciales activas.  
> 3. **Flujo 100% Cloud (Celeron N4120 / 3.83 GB RAM):** Prohibida la compilación local (`npm run build`, `vite build`, `tsc`). Todo desarrollo se gestiona como plantilla base para clonar hacia nuevos proyectos.

---

## 1. ESTADO ACTUAL REAL (28 de Septiembre de 2026)

* **Repositorio Oficial en GitHub:** [`dkitchencorporate-tech/dkitchen-white-label-engine`](https://github.com/dkitchencorporate-tech/dkitchen-white-label-engine) (rama `main`)
* **Naturaleza:** Motor Matriz y Plantilla 100% Agnóstica de Marca (White-Label) para clonación instantánea de PWAs gastronómicas en D-Kitchen y clientes B2B.
* **Componentes 100% Desacoplados, Blindados y Auditados:**
  - **Identidad Centralizada:** [`src/config/brandConfig.ts`](file:///src/config/brandConfig.ts) controla tipografía, paleta cromática HEX, logos, splash preloader, textos de club VIP y canales de contacto.
  - **Autenticación Super Admin 2FA TOTP:** Soporte nativo RFC 6238 compatible con Google Authenticator / Authy en `api/account.js` (`verify-2fa`).
  - **Verificación de Email Transaccional:** Landing [`src/pages/VerifyEmail.tsx`](file:///src/pages/VerifyEmail.tsx) agnóstica de marca y endpoints `/verificar-email` y `/api/account?action=verify-email`.
  - **Seguridad P0001 & Fidelización VIP:** `process_checkout` en `schema_white_label.sql` valida precios reales en base de datos y exige email verificado para canjear puntos VIP.
  - **Preloader Agnóstico:** Logotipo oficial configurable en runtime con transiciones suaves y prefetching de catálogo.
  - **Impresión Térmica ESC/POS & TPV Kiosko:** Parametrizados dinámicamente con cabeceras de marca y prefijos de ticket.
  - **Pasarela de Pagos SumUp & Datáfono:** Soporte estructural para cobros en línea, datáfono en reparto/recogida y efectivo.

### Protocolo de Clonación para Nueva Marca (Menos de 1 Hora):
1. Rellenar `src/config/brandConfig.ts` con la identidad de marca (Nombre, slogan, colores HEX, redes, límites).
2. Generar y sustituir los SVGs de marca en `public/assets/brand/`.
3. Ejecutar `schema_white_label.sql` en la nueva base de datos Neon.
4. Desplegar en Vercel con las variables de `.env.example`.

---

## 2. HISTORIAL COMPACTADO DE HITOS PREVIOS

* **28-sep-2026 (v3.1.0):** Publicación del repositorio oficial `dkitchen-white-label-engine` en GitHub, renombrado del template de pizzerías a `template-pwa-pizzerias`, e incorporación del blindaje completo 2FA TOTP y verificación de email en el motor matriz.
* **26-sep-2026 (v3.0.0):** Saneamiento profundo completado: eliminación de binarios residuales, purga de tokens residuales, estandarización monocromática neutra y tokenización de Tailwind con variables CSS.
* **25-sep-2026 (v2.0.0):** Desacoplamiento formal de la arquitectura v3.0 a partir de la base probada de Seven Food Fries PWA.

---

## 3. PROTOCOLO OBLIGATORIO DE CIERRE DE SESIÓN

Al recibir la orden de cierre de sesión por parte de karc0:
1. Actualizar la sección `1. ESTADO ACTUAL REAL` reflejando mejoras o nuevos módulos en el motor base.
2. Añadir una viñeta concisa (máx. 2 líneas) en `2. HISTORIAL COMPACTADO`.
3. Guardar este archivo in-situ.
