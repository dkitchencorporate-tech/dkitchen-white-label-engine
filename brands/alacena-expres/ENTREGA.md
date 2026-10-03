# Alacena Exprés · Dossier de entrega

Dark store de tapeo, ibéricos y vinos gourmet a domicilio en Madrid. Para el consumo diario, las fiestas, las reuniones de último momento y los regalos.

## Qué incluye

- **PWA del cliente:**
  - zona por código postal, con precios, envío, mínimo y tiempo de esa zona;
  - carta de 88 productos en 13 categorías;
  - existencias en vivo («¡Últimas N!», «Agotado»);
  - venta de alcohol con declaración de mayoría de edad y franja legal;
  - regalo con mensaje para la tarjeta (sin precios en el paquete);
  - sugerencias de última hora (hielo, patatas, tónica…);
  - club de puntos e instalación como app.
- **Panel del negocio:**
  - pedidos en tiempo real, con aviso de «pedir DNI» y del mensaje de regalo;
  - carta con existencias, formato y marca de alcohol;
  - zonas de reparto, horarios y ajustes;
  - kiosko desactivado, porque es una dark store.
- **Identidad:**
  - burdeos `#7A1E2C` y oro `#B8892F` sobre crema `#FBF7F0`;
  - Playfair Display + Inter;
  - logo e icono propios en `recursos/`;
  - iconos de la PWA generados al compilar.

## Catálogo (precios base, IVA incluido)

| Categoría | Productos | Desde | Ejemplos |
|---|---|---|---|
| Packs y tablas | 6 | 21,90 € | Tabla ibérica para dos, pack reunión exprés (4–6 pers.), pack fiesta 10–12 pers. |
| Ibéricos y embutidos | 8 | 5,90 € | Jamón de bellota 100 % (100 g, 14,90 €), lomo, chorizo, cecina IGP |
| Quesos | 6 | 6,90 € | Manchego DOP, Idiazabal, Torta del Casar, Payoyo, Cabrales |
| Conservas gourmet | 7 | 5,90 € | Anchoas 00, ventresca, berberechos 30/40, piquillos de Lodosa |
| Tapeo y aperitivo | 9 | 2,90 € | Tortilla hecha hoy, croquetas de jamón, gildas, aceitunas gordal |
| Vinos | 9 | 7,90 € | Rioja Crianza, Ribera Reserva, Albariño, Priorat, fino de Jerez |
| Cavas y champán | 5 | 9,90 € | Cava Brut Nature Reserva, Champagne Brut y Rosé |
| Cervezas | 6 | 3,20 € | Pack 6, pack fiesta 24 latas, IPA artesana de Madrid, 0,0 |
| Licores y destilados | 7 | 14,50 € | Ginebra premium, whisky de malta 12 años, vermut, pacharán |
| Refrescos, aguas y hielo | 9 | 1,20 € | Cola, tónica premium, zumo natural, hielo 2 kg |
| Postres y dulces | 7 | 4,50 € | Tarta de queso entera (con velas), torrijas, turrón de Jijona |
| Regalos | 5 | 3,50 € | Cesta clásica (64 €), cesta premium ibérica (139 €), estuches |
| Fiesta y menaje | 4 | 2,50 € | Vasos y platos compostables, servilletas, sacacorchos |

Opciones con precio que valida el servidor: envoltorio de regalo (+3,50 €), hielo, vasos y servilletas en los packs, y velas y tarjeta en la tarta.

## Zonas de reparto (editables en el panel)

| Zona | Códigos postales | Envío | Mínimo | Gratis desde | Tiempo | Precios |
|---|---|---|---|---|---|---|
| Centro | 28004, 28005, 28008, 28012–28015 | 2,90 € | 20 € | 60 € | 30 min | base |
| Salamanca, Chamberí y Retiro | 28001, 28003, 28006, 28007, 28009, 28010, 28028 | 3,50 € | 25 € | 70 € | 35 min | +5 % |
| Chamartín, Tetuán y Arganzuela | 28002, 28016, 28020, 28036, 28039, 28045, 28046 | 3,90 € | 25 € | 75 € | 45 min | base |
| Pozuelo, Aravaca y La Moraleja | 28023, 28109, 28223, 28224 | 6,90 € | 40 € | 120 € | 60 min | +8 % |

**Horario:** todos los días de 10:00 a 23:30; viernes y sábado hasta la 01:30. **Alcohol:** de 08:00 a 22:00.

## Antes de abrir al público (lo decide el cliente)

- [ ] Confirmar la franja de venta de alcohol con la ordenanza municipal y autonómica vigente.
- [ ] Revisar los alérgenos con la ficha técnica de cada proveedor.
- [ ] Ajustar precios, existencias iniciales y códigos postales.
- [ ] Datos fiscales (razón social, CIF y dirección) en Panel → Negocio, y textos legales.
- [ ] Fotos: generar con FLUX (`TOGETHER_API_KEY=… npx tsx scripts/imagenes-marca.ts alacena-expres`) o subir las del proveedor desde el panel.
- [ ] Dominio, variables de entorno en Vercel y migraciones (`docs/DESARROLLO_LOCAL.md` §4).
- [ ] Crear el administrador con `npm run crear-admin` y guardar la contraseña en un gestor.

## Cómo se ha probado

- Prueba de punta a punta en móvil (`e2e/tienda.spec.ts`):
  - código postal fuera de zona → aviso;
  - Salamanca → precios +5 %;
  - vino y quesos al carrito;
  - el pedido no se puede confirmar hasta declarar la mayoría de edad;
  - mensaje de regalo;
  - en el panel aparecen el aviso de DNI y el mensaje.
- 18 pruebas de tienda y seguridad, y una prueba de estrés: más de 10 700 pedidos sin vender de más y sin descuadres. Detalle en `docs/PRUEBAS_SEGURIDAD_Y_ESTRES.md`.
