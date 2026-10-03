-- Semilla de «Alacena Exprés»: dark store de tapeo y gourmet a domicilio en Madrid.
-- Idempotente: se puede ejecutar varias veces. No contiene usuarios: el
-- administrador se crea con `npm run crear-admin`.
--
-- Revisar antes de abrir al público:
--   · franja de venta de alcohol según la ordenanza municipal y autonómica vigente;
--   · alérgenos con las fichas técnicas de cada proveedor;
--   · precios, existencias y códigos postales de cada zona.

UPDATE store_settings SET
  business_name = 'Alacena Exprés',
  business_legal_name = 'Alacena Exprés S.L.',
  business_email = 'hola@alacena-expres.example',
  business_city = 'Madrid',
  delivery_enabled = true,
  pickup_enabled = false,
  delivery_fee = 3.50,
  min_order_delivery = 20.00,
  free_delivery_threshold = 60.00,
  prep_minutes = 10,
  estimated_prep_time = '30-45 min',
  loyalty_enabled = true,
  loyalty_points_per_10 = 3,
  loyalty_reward_points = 40,
  alcohol_sale_start = '08:00',
  alcohol_sale_end = '22:00',
  alcohol_min_age = 18,
  updated_at = now()
WHERE id = 1;

-- Todos los días de 10:00 a 23:30; viernes y sábado hasta la 01:30.
INSERT INTO store_hours (day_of_week, is_open, open_time, close_time) VALUES
  (0, true, '10:00', '23:30'), (1, true, '10:00', '23:30'), (2, true, '10:00', '23:30'),
  (3, true, '10:00', '23:30'), (4, true, '10:00', '23:30'), (5, true, '10:00', '01:30'),
  (6, true, '10:00', '01:30')
ON CONFLICT (day_of_week) DO UPDATE SET is_open = EXCLUDED.is_open, open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time;

-- Zonas de reparto: el precio, el envío y el tiempo dependen del código postal.
INSERT INTO delivery_zones (name, postal_codes, delivery_fee, min_order, free_delivery_over, eta_minutes, price_adjust_pct, sort_order)
SELECT v.* FROM (VALUES
  ('Centro', ARRAY['28004','28005','28012','28013','28014','28015','28008'], 2.90, 20.00, 60.00, 30, 0.00, 1),
  ('Salamanca, Chamberí y Retiro', ARRAY['28001','28006','28009','28007','28010','28003','28028'], 3.50, 25.00, 70.00, 35, 5.00, 2),
  ('Chamartín, Tetuán y Arganzuela', ARRAY['28002','28016','28036','28020','28039','28045','28046'], 3.90, 25.00, 75.00, 45, 0.00, 3),
  ('Pozuelo, Aravaca y La Moraleja', ARRAY['28223','28224','28023','28109'], 6.90, 40.00, 120.00, 60, 8.00, 4)
) AS v(name, postal_codes, delivery_fee, min_order, free_delivery_over, eta_minutes, price_adjust_pct, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones z WHERE z.name = v.name);

INSERT INTO categories (name, subtitle, sort_order) VALUES
  ('Combos', 'Packs, tablas y cestas listos para compartir o regalar', 1),
  ('Ibéricos y embutidos', 'Loncheados a cuchillo y envasados al vacío', 2),
  ('Quesos', 'Curados, cremosos y con denominación de origen', 3),
  ('Conservas gourmet', 'Lo mejor del Cantábrico y de las rías', 4),
  ('Tapeo y aperitivo', 'El picoteo de siempre, sin salir de casa', 5),
  ('Vinos', 'Tintos, blancos y rosados para cada ocasión', 6),
  ('Cavas y champán', 'Burbujas para celebrar', 7),
  ('Cervezas', 'Bien frías, en lata o botella', 8),
  ('Licores y destilados', 'Para el gin-tonic y la sobremesa', 9),
  ('Refrescos, aguas y hielo', 'Lo que nunca puede faltar', 10),
  ('Postres y dulces', 'El final perfecto', 11),
  ('Fiesta y menaje', 'Vasos, platos y todo para la reunión', 12)
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (category_id, name, description, price, unit_label, badge, allergens, is_alcohol, stock, image_url, customization_schema, sort_order)
SELECT c.id, v.name, v.description, v.price, v.unit_label, v.badge, v.allergens, v.is_alcohol, v.stock, v.image_url, v.schema::jsonb, v.sort_order
FROM (VALUES
  ('Combos', 'Tabla ibérica para dos', 'Jamón de bellota, lomo, chorizo y salchichón ibéricos con picos camperos. Lista en 2 minutos.', 24.90, '2 personas · 300 g', 'Más vendido', ARRAY['gluten']::text[], false, NULL, '/marca/productos/tabla-iberica-para-dos.webp', '{}', 1),
  ('Combos', 'Tabla de quesos españoles', 'Manchego curado, Idiazabal, Payoyo y Torta del Casar con membrillo y nueces.', 22.90, '2–3 personas · 400 g', 'DOP', ARRAY['lacteos','frutos_cascara']::text[], false, NULL, '/marca/productos/tabla-de-quesos-espanoles.webp', '{}', 2),
  ('Combos', 'Pack reunión exprés', 'Para 4–6 personas en 30 minutos: tabla ibérica, quesos, gildas, aceitunas, patatas, pan de cristal y 2 vinos.', 69.90, '4–6 personas', 'Último momento', ARRAY['gluten','lacteos','pescado','sulfitos']::text[], true, 20, '/marca/productos/pack-reunion-expres.webp', '{"groups": [{"id": "extras", "name": "Añade", "min": 0, "max": 3, "options": [{"id": "hielo", "name": "Bolsa de hielo 2 kg", "price": 2.5}, {"id": "vasos", "name": "25 vasos compostables", "price": 3.9}, {"id": "servilletas", "name": "50 servilletas", "price": 2.5}]}]}', 3),
  ('Combos', 'Pack fiesta 10–12 personas', 'Dos tablas ibéricas, dos de quesos, tortilla, croquetas, conservas, 24 cervezas, hielo y menaje.', 159.00, '10–12 personas', 'Para fiestas', ARRAY['gluten','lacteos','huevos','pescado','moluscos','sulfitos']::text[], true, 8, '/marca/productos/pack-fiesta-1012-personas.webp', '{"groups": [{"id": "extras", "name": "Añade", "min": 0, "max": 3, "options": [{"id": "hielo", "name": "Bolsa de hielo 2 kg", "price": 2.5}, {"id": "vasos", "name": "25 vasos compostables", "price": 3.9}, {"id": "servilletas", "name": "50 servilletas", "price": 2.5}]}]}', 4),
  ('Combos', 'Pack vermut del domingo', 'Vermut rojo de 1 L, gildas, mejillones en escabeche, aceitunas gordal y patatas al aceite de oliva.', 27.90, '2–4 personas', 'Nuevo', ARRAY['pescado','moluscos','sulfitos']::text[], true, NULL, '/marca/productos/pack-vermut-del-domingo.webp', '{}', 5),
  ('Combos', 'Pack after-work', 'Seis cervezas bien frías, chorizo ibérico, patatas fritas y aceitunas. Lo esencial para desconectar.', 21.90, '2–3 personas', NULL, ARRAY['gluten']::text[], true, NULL, '/marca/productos/pack-after-work.webp', '{"groups": [{"id": "servicio", "name": "Servicio", "min": 0, "max": 1, "options": [{"id": "bien-frio", "name": "Bien frío, listo para servir", "price": 0}]}]}', 6),
  ('Ibéricos y embutidos', 'Jamón ibérico de bellota 100 %', 'Loncheado a cuchillo, curación mínima de 36 meses. Atemperar 15 minutos antes de servir.', 14.90, 'Sobre 100 g', 'Estrella', ARRAY[]::text[], false, 40, '/marca/productos/jamon-iberico-de-bellota-100.webp', '{}', 1),
  ('Ibéricos y embutidos', 'Jamón ibérico de cebo de campo', 'Loncheado a máquina, sabor intenso y precio de diario.', 7.90, 'Sobre 100 g', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/jamon-iberico-de-cebo-de-campo.webp', '{}', 2),
  ('Ibéricos y embutidos', 'Paleta ibérica de bellota', 'Más jugosa y aromática que el jamón. Loncheada a cuchillo.', 9.90, 'Sobre 100 g', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/paleta-iberica-de-bellota.webp', '{}', 3),
  ('Ibéricos y embutidos', 'Lomo ibérico de bellota', 'Cinta de lomo adobada con pimentón de la Vera y curada en bodega.', 8.90, 'Sobre 100 g', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/lomo-iberico-de-bellota.webp', '{}', 4),
  ('Ibéricos y embutidos', 'Chorizo ibérico de bellota', 'Pimentón de la Vera y ajo. Sin gluten.', 6.90, 'Sobre 150 g', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/chorizo-iberico-de-bellota.webp', '{}', 5),
  ('Ibéricos y embutidos', 'Salchichón ibérico de bellota', 'Pimienta negra en grano y curación lenta.', 6.90, 'Sobre 150 g', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/salchichon-iberico-de-bellota.webp', '{}', 6),
  ('Ibéricos y embutidos', 'Cecina de León IGP', 'Carne de vacuno curada y ligeramente ahumada. Con un hilo de aceite de oliva, perfecta.', 6.50, 'Sobre 100 g', 'IGP', ARRAY[]::text[], false, NULL, '/marca/productos/cecina-de-leon-igp.webp', '{}', 7),
  ('Ibéricos y embutidos', 'Sobrasada de Mallorca IGP', 'Para untar sobre pan tostado con un poco de miel.', 5.90, 'Pieza 200 g', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/sobrasada-de-mallorca-igp.webp', '{}', 8),
  ('Quesos', 'Queso manchego curado DOP', 'Leche de oveja manchega, curación de 12 meses. Cuña lista para cortar.', 7.90, 'Cuña 250 g', 'DOP', ARRAY['lacteos']::text[], false, NULL, '/marca/productos/queso-manchego-curado-dop.webp', '{}', 1),
  ('Quesos', 'Queso Idiazabal ahumado DOP', 'Oveja latxa, ligeramente ahumado con madera de haya.', 8.50, 'Cuña 250 g', 'DOP', ARRAY['lacteos']::text[], false, NULL, '/marca/productos/queso-idiazabal-ahumado-dop.webp', '{}', 2),
  ('Quesos', 'Torta del Casar DOP', 'Cremosa, para abrir por arriba y untar con picos.', 14.50, 'Pieza 300 g', 'DOP', ARRAY['lacteos']::text[], false, 15, '/marca/productos/torta-del-casar-dop.webp', '{}', 3),
  ('Quesos', 'Queso Payoyo de cabra', 'Queso de cabra payoya de la sierra de Grazalema, curado en manteca.', 9.90, 'Cuña 250 g', 'Premiado', ARRAY['lacteos']::text[], false, NULL, '/marca/productos/queso-payoyo-de-cabra.webp', '{}', 4),
  ('Quesos', 'Queso Cabrales DOP', 'Azul asturiano de sabor intenso. Para los valientes.', 7.90, 'Pieza 200 g', 'DOP', ARRAY['lacteos']::text[], false, NULL, '/marca/productos/queso-cabrales-dop.webp', '{}', 5),
  ('Quesos', 'Queso Mahón-Menorca DOP', 'Semicurado, suave y con un punto salino.', 6.90, 'Cuña 250 g', NULL, ARRAY['lacteos']::text[], false, NULL, '/marca/productos/queso-mahon-menorca-dop.webp', '{}', 6),
  ('Conservas gourmet', 'Anchoas del Cantábrico 00', 'Ocho filetes seleccionados a mano, en aceite de oliva.', 12.90, 'Lata 8 filetes', 'Gourmet', ARRAY['pescado']::text[], false, NULL, '/marca/productos/anchoas-del-cantabrico-00.webp', '{}', 1),
  ('Conservas gourmet', 'Ventresca de bonito del norte', 'La parte más jugosa del bonito, en aceite de oliva.', 9.50, 'Lata 120 g', NULL, ARRAY['pescado']::text[], false, NULL, '/marca/productos/ventresca-de-bonito-del-norte.webp', '{}', 2),
  ('Conservas gourmet', 'Mejillones en escabeche gallegos', 'Mejillones de las rías gallegas fritos y en escabeche. 8–12 piezas.', 6.90, 'Lata 115 g', NULL, ARRAY['moluscos']::text[], false, NULL, '/marca/productos/mejillones-en-escabeche-gallegos.webp', '{}', 3),
  ('Conservas gourmet', 'Berberechos de las rías 30/40', 'Al natural, el aperitivo gallego por excelencia.', 13.90, 'Lata 111 g', NULL, ARRAY['moluscos']::text[], false, NULL, '/marca/productos/berberechos-de-las-rias-30-40.webp', '{}', 4),
  ('Conservas gourmet', 'Pulpo en aceite de oliva', 'Trozos de pulpo gallego cocido, listos para servir con pimentón.', 11.50, 'Lata 111 g', NULL, ARRAY['moluscos']::text[], false, NULL, '/marca/productos/pulpo-en-aceite-de-oliva.webp', '{}', 5),
  ('Conservas gourmet', 'Pimientos del piquillo de Lodosa DOP', 'Asados a la leña y pelados a mano.', 5.90, 'Frasco 220 g', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/pimientos-del-piquillo-de-lodosa-dop.webp', '{}', 6),
  ('Conservas gourmet', 'Bonito del norte en aceite de oliva', 'Bonito del Cantábrico de costera.', 6.50, 'Lata 250 g', NULL, ARRAY['pescado']::text[], false, NULL, '/marca/productos/bonito-del-norte-en-aceite-de-oliva.webp', '{}', 7),
  ('Tapeo y aperitivo', 'Aceitunas gordal aliñadas', 'Sevillanas, carnosas, con aliño de la casa.', 4.50, 'Tarrina 400 g', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/aceitunas-gordal-alinadas.webp', '{}', 1),
  ('Tapeo y aperitivo', 'Patatas fritas en aceite de oliva', 'Fritas en caldera con aceite de oliva y sal.', 3.20, 'Bolsa 150 g', 'Imprescindible', ARRAY[]::text[], false, NULL, '/marca/productos/patatas-fritas-en-aceite-de-oliva.webp', '{}', 2),
  ('Tapeo y aperitivo', 'Almendras marcona fritas', 'Fritas y saladas, el aperitivo más fino.', 4.90, 'Bolsa 150 g', NULL, ARRAY['frutos_cascara']::text[], false, NULL, '/marca/productos/almendras-marcona-fritas.webp', '{}', 3),
  ('Tapeo y aperitivo', 'Picos camperos', 'Panecillos crujientes de Jerez, para acompañar ibéricos y quesos.', 2.90, 'Bolsa 250 g', NULL, ARRAY['gluten']::text[], false, NULL, '/marca/productos/picos-camperos.webp', '{}', 4),
  ('Tapeo y aperitivo', 'Croquetas de jamón ibérico', 'Cremosas, para freír o hacer en freidora de aire en 8 minutos.', 7.90, '6 unidades', 'Casera', ARRAY['gluten','lacteos','huevos']::text[], false, NULL, '/marca/productos/croquetas-de-jamon-iberico.webp', '{}', 5),
  ('Tapeo y aperitivo', 'Tortilla de patata jugosa', 'Entera, con cebolla y poco cuajada. Hecha cada mañana.', 12.90, 'Entera · 6 raciones', 'Hecha hoy', ARRAY['huevos']::text[], false, 12, '/marca/productos/tortilla-de-patata-jugosa.webp', '{}', 6),
  ('Tapeo y aperitivo', 'Ensaladilla rusa', 'Con ventresca de bonito y mayonesa casera.', 7.50, 'Tarrina 400 g', NULL, ARRAY['huevos','pescado']::text[], false, NULL, '/marca/productos/ensaladilla-rusa.webp', '{}', 7),
  ('Tapeo y aperitivo', 'Gildas clásicas', 'Anchoa, piparra y aceituna manzanilla. Un bocado de San Sebastián.', 6.90, '4 unidades', NULL, ARRAY['pescado','sulfitos']::text[], false, NULL, '/marca/productos/gildas-clasicas.webp', '{}', 8),
  ('Tapeo y aperitivo', 'Pan de cristal', 'Corteza finísima y miga aireada. Para el pan con tomate.', 3.50, 'Barra 250 g', NULL, ARRAY['gluten']::text[], false, NULL, '/marca/productos/pan-de-cristal.webp', '{}', 9),
  ('Vinos', 'Rioja Crianza DOCa', 'Tempranillo con 12 meses en barrica. Fruta roja y vainilla.', 11.90, 'Botella 75 cl', 'Más vendido', ARRAY['sulfitos']::text[], true, NULL, '/marca/productos/rioja-crianza-doca.webp', '{}', 1),
  ('Vinos', 'Ribera del Duero Roble', 'Tinta del país, joven y con un toque de madera.', 9.90, 'Botella 75 cl', NULL, ARRAY['sulfitos']::text[], true, NULL, '/marca/productos/ribera-del-duero-roble.webp', '{}', 2),
  ('Vinos', 'Ribera del Duero Reserva', 'Tres años de crianza. Para las ocasiones especiales.', 24.90, 'Botella 75 cl', 'Premium', ARRAY['sulfitos']::text[], true, NULL, '/marca/productos/ribera-del-duero-reserva.webp', '{}', 3),
  ('Vinos', 'Albariño Rías Baixas', 'Blanco fresco y salino, ideal con conservas y marisco.', 13.90, 'Botella 75 cl', NULL, ARRAY['sulfitos']::text[], true, NULL, '/marca/productos/albarino-rias-baixas.webp', '{"groups": [{"id": "servicio", "name": "Servicio", "min": 0, "max": 1, "options": [{"id": "bien-frio", "name": "Bien frío, listo para servir", "price": 0}]}]}', 4),
  ('Vinos', 'Verdejo Rueda', 'Blanco aromático y fácil, el comodín de toda reunión.', 8.90, 'Botella 75 cl', NULL, ARRAY['sulfitos']::text[], true, NULL, '/marca/productos/verdejo-rueda.webp', '{"groups": [{"id": "servicio", "name": "Servicio", "min": 0, "max": 1, "options": [{"id": "bien-frio", "name": "Bien frío, listo para servir", "price": 0}]}]}', 5),
  ('Vinos', 'Priorat DOQ', 'Garnacha y cariñena de pizarra. Potente y mineral.', 26.90, 'Botella 75 cl', NULL, ARRAY['sulfitos']::text[], true, NULL, '/marca/productos/priorat-doq.webp', '{}', 6),
  ('Vinos', 'Godello Valdeorras', 'Blanco gallego con cuerpo y untuosidad.', 15.90, 'Botella 75 cl', NULL, ARRAY['sulfitos']::text[], true, NULL, '/marca/productos/godello-valdeorras.webp', '{"groups": [{"id": "servicio", "name": "Servicio", "min": 0, "max": 1, "options": [{"id": "bien-frio", "name": "Bien frío, listo para servir", "price": 0}]}]}', 7),
  ('Vinos', 'Rosado de Navarra', 'Garnacha rosada, fresca y frutal.', 7.90, 'Botella 75 cl', NULL, ARRAY['sulfitos']::text[], true, NULL, '/marca/productos/rosado-de-navarra.webp', '{"groups": [{"id": "servicio", "name": "Servicio", "min": 0, "max": 1, "options": [{"id": "bien-frio", "name": "Bien frío, listo para servir", "price": 0}]}]}', 8),
  ('Vinos', 'Fino de Jerez', 'Seco y punzante. El compañero perfecto del jamón.', 8.50, 'Botella 75 cl', NULL, ARRAY['sulfitos']::text[], true, NULL, '/marca/productos/fino-de-jerez.webp', '{"groups": [{"id": "servicio", "name": "Servicio", "min": 0, "max": 1, "options": [{"id": "bien-frio", "name": "Bien frío, listo para servir", "price": 0}]}]}', 9),
  ('Cavas y champán', 'Cava Brut Nature Reserva', 'Burbuja fina, seco y elegante.', 9.90, 'Botella 75 cl', NULL, ARRAY['sulfitos']::text[], true, NULL, '/marca/productos/cava-brut-nature-reserva.webp', '{"groups": [{"id": "servicio", "name": "Servicio", "min": 0, "max": 1, "options": [{"id": "bien-frio", "name": "Bien frío, listo para servir", "price": 0}]}]}', 1),
  ('Cavas y champán', 'Cava Rosé Brut', 'Trepat y garnacha. Fresco y festivo.', 11.50, 'Botella 75 cl', NULL, ARRAY['sulfitos']::text[], true, NULL, '/marca/productos/cava-rose-brut.webp', '{"groups": [{"id": "servicio", "name": "Servicio", "min": 0, "max": 1, "options": [{"id": "bien-frio", "name": "Bien frío, listo para servir", "price": 0}]}]}', 2),
  ('Cavas y champán', 'Espumoso Gran Reserva', 'Más de 30 meses en rima. Complejo y cremoso.', 24.90, 'Botella 75 cl', 'Premium', ARRAY['sulfitos']::text[], true, NULL, '/marca/productos/espumoso-gran-reserva.webp', '{"groups": [{"id": "servicio", "name": "Servicio", "min": 0, "max": 1, "options": [{"id": "bien-frio", "name": "Bien frío, listo para servir", "price": 0}]}]}', 3),
  ('Cavas y champán', 'Champagne Brut AOC', 'Champagne francés para brindar a lo grande.', 44.90, 'Botella 75 cl', NULL, ARRAY['sulfitos']::text[], true, 24, '/marca/productos/champagne-brut-aoc.webp', '{"groups": [{"id": "servicio", "name": "Servicio", "min": 0, "max": 1, "options": [{"id": "bien-frio", "name": "Bien frío, listo para servir", "price": 0}]}]}', 4),
  ('Cavas y champán', 'Champagne Rosé AOC', 'Champagne rosado de edición limitada.', 59.90, 'Botella 75 cl', 'Edición limitada', ARRAY['sulfitos']::text[], true, 6, '/marca/productos/champagne-rose-aoc.webp', '{"groups": [{"id": "regalo", "name": "Presentación", "min": 0, "max": 1, "options": [{"id": "envoltorio", "name": "Envoltorio de regalo con lazo", "price": 3.5}]}]}', 5),
  ('Cervezas', 'Cerveza lager especial · pack 6', 'Lager española, rubia y refrescante.', 5.90, '6 latas de 33 cl', 'Más vendido', ARRAY['gluten']::text[], true, NULL, '/marca/productos/cerveza-lager-especial-pack-6.webp', '{"groups": [{"id": "servicio", "name": "Servicio", "min": 0, "max": 1, "options": [{"id": "bien-frio", "name": "Bien frío, listo para servir", "price": 0}]}]}', 1),
  ('Cervezas', 'Cerveza tostada · pack 6', 'Maltas tostadas, notas de caramelo.', 7.50, '6 botellas de 33 cl', NULL, ARRAY['gluten']::text[], true, NULL, '/marca/productos/cerveza-tostada-pack-6.webp', '{"groups": [{"id": "servicio", "name": "Servicio", "min": 0, "max": 1, "options": [{"id": "bien-frio", "name": "Bien frío, listo para servir", "price": 0}]}]}', 2),
  ('Cervezas', 'IPA artesana de Madrid', 'Lúpulos cítricos y amargor marcado. Cervecera local.', 3.20, 'Lata 33 cl', 'Local', ARRAY['gluten']::text[], true, NULL, '/marca/productos/ipa-artesana-de-madrid.webp', '{"groups": [{"id": "servicio", "name": "Servicio", "min": 0, "max": 1, "options": [{"id": "bien-frio", "name": "Bien frío, listo para servir", "price": 0}]}]}', 3),
  ('Cervezas', 'Cerveza de trigo', 'Turbia, suave, con notas de plátano.', 3.50, 'Botella 50 cl', NULL, ARRAY['gluten']::text[], true, NULL, '/marca/productos/cerveza-de-trigo.webp', '{"groups": [{"id": "servicio", "name": "Servicio", "min": 0, "max": 1, "options": [{"id": "bien-frio", "name": "Bien frío, listo para servir", "price": 0}]}]}', 4),
  ('Cervezas', 'Pack fiesta 24 latas', 'Lager especial para la reunión. Fría si lo indicas.', 19.90, '24 latas de 33 cl', 'Para fiestas', ARRAY['gluten']::text[], true, NULL, '/marca/productos/pack-fiesta-24-latas.webp', '{"groups": [{"id": "servicio", "name": "Servicio", "min": 0, "max": 1, "options": [{"id": "bien-frio", "name": "Bien frío, listo para servir", "price": 0}]}]}', 5),
  ('Cervezas', 'Cerveza sin alcohol 0,0 · pack 6', 'Todo el sabor, 0,0 % de alcohol.', 5.50, '6 latas de 33 cl', NULL, ARRAY['gluten']::text[], false, NULL, '/marca/productos/cerveza-sin-alcohol-0-0-pack-6.webp', '{"groups": [{"id": "servicio", "name": "Servicio", "min": 0, "max": 1, "options": [{"id": "bien-frio", "name": "Bien frío, listo para servir", "price": 0}]}]}', 6),
  ('Licores y destilados', 'Ginebra premium', 'London dry con enebro y cítricos. Para el gin-tonic perfecto.', 29.90, 'Botella 70 cl', NULL, ARRAY[]::text[], true, NULL, '/marca/productos/ginebra-premium.webp', '{}', 1),
  ('Licores y destilados', 'Ron añejo', 'Ron de caña envejecido, notas de vainilla y madera.', 27.90, 'Botella 70 cl', NULL, ARRAY[]::text[], true, NULL, '/marca/productos/ron-anejo.webp', '{}', 2),
  ('Licores y destilados', 'Whisky de malta 12 años', 'Single malt, suave y afrutado.', 49.90, 'Botella 70 cl', 'Premium', ARRAY[]::text[], true, 10, '/marca/productos/whisky-de-malta-12-anos.webp', '{"groups": [{"id": "regalo", "name": "Presentación", "min": 0, "max": 1, "options": [{"id": "envoltorio", "name": "Envoltorio de regalo con lazo", "price": 3.5}]}]}', 3),
  ('Licores y destilados', 'Vermut rojo de reserva', 'Vermut tradicional. Con hielo, rodaja de naranja y aceituna.', 14.90, 'Botella 1 L', 'Para el aperitivo', ARRAY['sulfitos']::text[], true, NULL, '/marca/productos/vermut-rojo-de-reserva.webp', '{}', 4),
  ('Licores y destilados', 'Pacharán navarro', 'Endrinas maceradas en anís. La sobremesa de siempre.', 16.90, 'Botella 70 cl', NULL, ARRAY[]::text[], true, NULL, '/marca/productos/pacharan-navarro.webp', '{}', 5),
  ('Licores y destilados', 'Orujo de hierbas', 'Aguardiente gallego con hierbas aromáticas, servir muy frío.', 14.50, 'Botella 70 cl', NULL, ARRAY[]::text[], true, NULL, '/marca/productos/orujo-de-hierbas.webp', '{}', 6),
  ('Licores y destilados', 'Vodka premium', 'Destilado cinco veces, limpio y neutro.', 26.90, 'Botella 70 cl', NULL, ARRAY[]::text[], true, NULL, '/marca/productos/vodka-premium.webp', '{}', 7),
  ('Refrescos, aguas y hielo', 'Refresco de cola', 'Lata bien fría.', 1.60, 'Lata 33 cl', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/refresco-de-cola.webp', '{}', 1),
  ('Refrescos, aguas y hielo', 'Refresco de cola zero', 'Sin azúcar.', 1.60, 'Lata 33 cl', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/refresco-de-cola-zero.webp', '{}', 2),
  ('Refrescos, aguas y hielo', 'Tónica premium · pack 4', 'Burbuja fina, amargor elegante.', 5.90, '4 botellas de 20 cl', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/tonica-premium-pack-4.webp', '{}', 3),
  ('Refrescos, aguas y hielo', 'Refresco de limón', 'Con zumo de limón.', 1.60, 'Lata 33 cl', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/refresco-de-limon.webp', '{}', 4),
  ('Refrescos, aguas y hielo', 'Agua mineral natural', 'Mineralización débil.', 1.20, 'Botella 1,5 L', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/agua-mineral-natural.webp', '{}', 5),
  ('Refrescos, aguas y hielo', 'Agua con gas', 'Burbuja intensa.', 1.50, 'Botella 50 cl', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/agua-con-gas.webp', '{}', 6),
  ('Refrescos, aguas y hielo', 'Zumo de naranja natural', 'Exprimido el mismo día.', 4.90, 'Botella 1 L', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/zumo-de-naranja-natural.webp', '{}', 7),
  ('Refrescos, aguas y hielo', 'Hielo en cubitos', 'Hielo cristalino de agua mineral. Imprescindible para la fiesta.', 2.50, 'Bolsa 2 kg', 'Imprescindible', ARRAY[]::text[], false, NULL, '/marca/productos/hielo-en-cubitos.webp', '{}', 8),
  ('Refrescos, aguas y hielo', 'Ginger beer', 'Jengibre picante, para moscow mule.', 2.20, 'Botella 20 cl', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/ginger-beer.webp', '{}', 9),
  ('Postres y dulces', 'Tarta de queso cremosa', 'Al estilo vasco, tostada por fuera y fluida por dentro.', 26.90, 'Entera · 6–8 raciones', 'La favorita', ARRAY['lacteos','huevos','gluten']::text[], false, 8, '/marca/productos/tarta-de-queso-cremosa.webp', '{"groups": [{"id": "celebracion", "name": "Celebración", "min": 0, "max": 2, "options": [{"id": "velas", "name": "Velas de cumpleaños", "price": 1.5}, {"id": "tarjeta", "name": "Tarjeta con dedicatoria", "price": 0}]}]}', 1),
  ('Postres y dulces', 'Torrijas caseras', 'Pan brioche empapado en leche infusionada y caramelizado.', 8.90, '4 unidades', NULL, ARRAY['gluten','lacteos','huevos']::text[], false, NULL, '/marca/productos/torrijas-caseras.webp', '{}', 2),
  ('Postres y dulces', 'Turrón de Jijona', 'Almendra marcona molida y miel.', 9.90, 'Tableta 200 g', NULL, ARRAY['frutos_cascara','huevos']::text[], false, NULL, '/marca/productos/turron-de-jijona.webp', '{}', 3),
  ('Postres y dulces', 'Chocolate negro 70 % con almendras', 'Cacao de origen y almendra tostada.', 4.50, 'Tableta 150 g', NULL, ARRAY['frutos_cascara','soja','lacteos']::text[], false, NULL, '/marca/productos/chocolate-negro-70-con-almendras.webp', '{}', 4),
  ('Postres y dulces', 'Trufas de chocolate', 'Ganache de chocolate negro cubierta de cacao.', 7.90, 'Caja 150 g', NULL, ARRAY['lacteos']::text[], false, NULL, '/marca/productos/trufas-de-chocolate.webp', '{"groups": [{"id": "regalo", "name": "Presentación", "min": 0, "max": 1, "options": [{"id": "envoltorio", "name": "Envoltorio de regalo con lazo", "price": 3.5}]}]}', 5),
  ('Postres y dulces', 'Arroz con leche asturiano', 'Cremoso, con canela y limón.', 5.50, '2 tarrinas', NULL, ARRAY['lacteos']::text[], false, NULL, '/marca/productos/arroz-con-leche-asturiano.webp', '{}', 6),
  ('Postres y dulces', 'Tocino de cielo', 'Yema y almíbar, receta jerezana.', 5.90, '2 unidades', NULL, ARRAY['huevos']::text[], false, NULL, '/marca/productos/tocino-de-cielo.webp', '{}', 7),
  ('Combos', 'Cesta gourmet clásica', 'Rioja crianza, manchego curado, lomo ibérico, anchoas, picos y turrón en cesta de mimbre.', 64.00, 'Cesta de mimbre', 'Regalo', ARRAY['lacteos','pescado','gluten','frutos_cascara','sulfitos']::text[], true, NULL, '/marca/productos/cesta-gourmet-clasica.webp', '{"groups": [{"id": "regalo", "name": "Presentación", "min": 0, "max": 1, "options": [{"id": "envoltorio", "name": "Envoltorio de regalo con lazo", "price": 3.5}]}]}', 7),
  ('Combos', 'Cesta premium ibérica', 'Jamón de bellota loncheado, champagne, Torta del Casar, ventresca y trufas en caja de madera.', 139.00, 'Caja de madera', 'Edición limitada', ARRAY['lacteos','pescado','sulfitos']::text[], true, 4, '/marca/productos/cesta-premium-iberica.webp', '{"groups": [{"id": "regalo", "name": "Presentación", "min": 0, "max": 1, "options": [{"id": "envoltorio", "name": "Envoltorio de regalo con lazo", "price": 3.5}]}]}', 8),
  ('Combos', 'Estuche vino y queso', 'Ribera del Duero roble y cuña de manchego curado.', 29.90, 'Estuche de cartón', NULL, ARRAY['lacteos','sulfitos']::text[], true, NULL, '/marca/productos/estuche-vino-y-queso.webp', '{"groups": [{"id": "regalo", "name": "Presentación", "min": 0, "max": 1, "options": [{"id": "envoltorio", "name": "Envoltorio de regalo con lazo", "price": 3.5}]}]}', 9),
  ('Combos', 'Estuche aperitivo', 'Vermut, gildas, anchoas y almendras marcona.', 39.90, 'Estuche de cartón', 'Nuevo', ARRAY['pescado','frutos_cascara','sulfitos']::text[], true, NULL, '/marca/productos/estuche-aperitivo.webp', '{"groups": [{"id": "regalo", "name": "Presentación", "min": 0, "max": 1, "options": [{"id": "envoltorio", "name": "Envoltorio de regalo con lazo", "price": 3.5}]}]}', 10),
  ('Fiesta y menaje', 'Envoltorio de regalo', 'Papel kraft, lazo y tarjeta. Añádelo a cualquier pedido.', 3.50, 'Por pedido', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/envoltorio-de-regalo.webp', '{}', 1),
  ('Fiesta y menaje', 'Vasos compostables', 'Vasos de 33 cl compostables.', 3.90, 'Pack 25', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/vasos-compostables.webp', '{}', 2),
  ('Fiesta y menaje', 'Platos compostables', 'Platos de fibra de caña, 23 cm.', 4.50, 'Pack 25', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/platos-compostables.webp', '{}', 3),
  ('Fiesta y menaje', 'Servilletas de papel', 'Servilletas de doble capa, 33 × 33 cm.', 2.50, 'Pack 50', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/servilletas-de-papel.webp', '{}', 4),
  ('Fiesta y menaje', 'Sacacorchos de camarero', 'Doble palanca y cortacápsulas.', 6.90, 'Unidad', NULL, ARRAY[]::text[], false, NULL, '/marca/productos/sacacorchos-de-camarero.webp', '{}', 5)
) AS v(category, name, description, price, unit_label, badge, allergens, is_alcohol, stock, image_url, schema, sort_order)
JOIN categories c ON c.name = v.category
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = v.name);

INSERT INTO upsells (product_id, category, sort_order)
SELECT p.id, 'Que no falte', v.n FROM (VALUES ('Hielo en cubitos', 1), ('Patatas fritas en aceite de oliva', 2), ('Tónica premium · pack 4', 3), ('Envoltorio de regalo', 4), ('Picos camperos', 5), ('Refresco de cola', 6)) AS v(name, n)
JOIN products p ON p.name = v.name
WHERE NOT EXISTS (SELECT 1 FROM upsells u WHERE u.product_id = p.id);
