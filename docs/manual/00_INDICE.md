# Manual del motor DKitchen · Cómo crear, probar, desplegar y entregar una marca

Este manual es el procedimiento oficial para **cada marca nueva** que se cree con el motor. Está escrito para que lo siga cualquier persona del equipo (o un agente) sin depender de quien hizo el motor. Cada guía dice **qué hacer, con qué orden exacta, cómo comprobar que ha salido bien y qué hacer si falla**.

El ejemplo resuelto de principio a fin es **Alacena Exprés** (`brands/alacena-expres/`), una dark store gourmet en Madrid: en cada guía se indica dónde mirarlo.

## Recorrido completo

| Paso | Guía | Resultado al terminar |
|---|---|---|
| 0 | [01 · Requisitos y entorno](01_REQUISITOS_Y_ENTORNO.md) | Equipo o sesión en la nube listos: Node, Postgres local, navegador de pruebas. |
| 1 | [02 · Alta de la marca](02_ALTA_DE_MARCA.md) | Carpeta `brands/<slug>/` (o repo propio del cliente) con su configuración validada. |
| 2 | [03 · Identidad y diseño de autor](03_IDENTIDAD_Y_DISENO.md) | Colores, tipografías, logo, icono, portada, preloader, pie, efectos y, si procede, 3D. |
| 3 | [04 · Carta, zonas y negocio](04_CATALOGO_Y_SEMILLA.md) | `semilla.sql` con carta real (combos y sueltos), zonas, horario, club y reglas legales. |
| 4 | [05 · Fotos de producto](05_FOTOS_DE_PRODUCTO.md) | Una foto realista 800×600 por producto, revisada una a una. |
| 5 | [06 · Pruebas y resultados](06_PRUEBAS.md) | Lint, tipos, pruebas, punta a punta, seguridad y estrés en verde, con informe escrito. |
| 6 | [07 · Base de datos y despliegue](07_BASE_DE_DATOS_Y_DESPLIEGUE.md) | Neon migrado y sembrado, Vercel desplegado, comprobación en producción hecha. |
| 7 | [08 · Actualizaciones del motor](08_ACTUALIZACIONES_DEL_MOTOR.md) | El cliente recibe versiones nuevas del motor por PR, sin perder su marca. |
| 8 | [09 · Entrega al cliente](09_ENTREGA_AL_CLIENTE.md) | Dossier, credenciales entregadas de forma segura y lista legal revisada. |
| — | [10 · Problemas conocidos y soluciones](10_PROBLEMAS_CONOCIDOS.md) | Todo lo que ya ha fallado alguna vez y cómo se resolvió. |

Plantillas para copiar en cada marca: [`plantillas/`](plantillas/).

## Lista maestra (copiar en el PR de cada marca nueva)

```markdown
### Alta de <Nombre> (`brands/<slug>`)
- [ ] 1. Alta: `npm run nueva-marca` o `npm run motor -- crear-cliente` (guía 02)
- [ ] 2. Identidad: tema, fuentes, logo, icono, PWA, SEO, textos del club (guía 03)
- [ ] 3. Diseño de autor: huecos y estilos.css; 3D solo si se pide (guía 03)
- [ ] 4. Carta: combos arriba, sueltos por familia, alérgenos, formatos, opciones (guía 04)
- [ ] 5. Negocio: zonas, horario, club, alcohol, existencias iniciales (guía 04)
- [ ] 6. Fotos: imagenes.json, generación, revisión una a una, rechazadas repetidas (guía 05)
- [ ] 7. Pruebas: `npm run verificar`, e2e de la marca, seguridad, estrés + informe (guía 06)
- [ ] 8. Base de datos: Neon creado desde Vercel, migrado, sembrado, rol motor_api, admin (guía 07)
- [ ] 9. Despliegue: variables, región, dominio, comprobación en producción (guía 07)
- [ ] 10. Entrega: ENTREGA.md, credenciales por canal seguro, lista legal (guía 09)
- [ ] 11. ESTADO_PROYECTO.md actualizado (bitácora + decisiones)
```

## Reglas que nunca se saltan

1. **Nada de secretos en el repositorio**: solo nombres en `.env.example`. Contraseñas y claves van en Vercel, en el entorno de la sesión o en un gestor de contraseñas.
2. **El precio lo calcula siempre el servidor** (SQL). El navegador solo muestra precios orientativos con el mismo redondeo.
3. **El código del motor no se edita dentro de una marca**: lo propio va en `brands/<slug>/` (configuración, huecos, estilos, recursos, semilla). Si algo del motor no sirve, se mejora el motor en su repo y se publica una versión.
4. **Nada se entrega sin pruebas en verde y su informe escrito** (guía 06).
5. **Documentación, textos y commits en español de España**, con tildes.
6. **Néstor Pizzas** no se toca salvo indicación expresa de karc0.
