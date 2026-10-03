-- Semilla de la marca neutra «demo». Idempotente: se puede ejecutar varias veces.
-- No contiene usuarios: el administrador se crea con `npm run crear-admin`.

UPDATE store_settings SET
  business_name = 'Marca Demo',
  business_legal_name = 'Marca Demo S.L.',
  business_email = 'hola@marca-demo.example',
  business_city = 'Ciudad Demo',
  delivery_fee = 2.50,
  min_order_delivery = 12.00,
  free_delivery_threshold = 25.00,
  prep_minutes = 20,
  estimated_prep_time = '20-30 min',
  updated_at = now()
WHERE id = 1;

INSERT INTO categories (name, subtitle, sort_order) VALUES
  ('Principales', 'Elaboración diaria', 1),
  ('Entrantes', 'Para compartir', 2),
  ('Postres', 'El final perfecto', 3),
  ('Bebidas', NULL, 4)
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (category_id, name, description, price, badge, allergens, customization_schema, sort_order)
SELECT c.id, v.name, v.description, v.price, v.badge, v.allergens, v.schema::jsonb, v.sort_order
FROM (VALUES
  ('Principales', 'Plato de la casa', 'Receta propia con ingredientes de temporada.', 10.90, 'Recomendado',
   ARRAY['gluten','lacteos']::text[],
   '{"groups":[{"id":"extras","name":"Extras","min":0,"max":3,"options":[{"id":"queso","name":"Queso extra","price":1.00},{"id":"bacon","name":"Bacon","price":1.50},{"id":"huevo","name":"Huevo","price":1.00}]}]}', 1),
  ('Principales', 'Opción vegetal', 'Verduras asadas, legumbres y salsa de la casa.', 9.50, 'Nuevo',
   ARRAY['sesamo']::text[],
   '{"groups":[{"id":"salsa","name":"Salsa","min":1,"max":1,"options":[{"id":"suave","name":"Suave","price":0},{"id":"picante","name":"Picante","price":0}]}]}', 2),
  ('Entrantes', 'Entrante para compartir', 'Ración generosa, crujiente y dorada.', 5.50, NULL,
   ARRAY['gluten','huevos']::text[], '{}', 1),
  ('Postres', 'Postre del día', 'Pregunta por la elaboración de hoy.', 4.50, NULL,
   ARRAY['lacteos','huevos','gluten']::text[], '{}', 1),
  ('Bebidas', 'Agua mineral', 'Botella 50 cl.', 1.50, NULL, ARRAY[]::text[], '{}', 1),
  ('Bebidas', 'Refresco', 'Lata 33 cl.', 2.20, NULL, ARRAY[]::text[],
   '{"groups":[{"id":"sabor","name":"Sabor","min":1,"max":1,"options":[{"id":"cola","name":"Cola","price":0},{"id":"naranja","name":"Naranja","price":0},{"id":"limon","name":"Limón","price":0}]}]}', 2)
) AS v(category, name, description, price, badge, allergens, schema, sort_order)
JOIN categories c ON c.name = v.category
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = v.name);

INSERT INTO upsells (product_id, category, sort_order)
SELECT p.id, 'Postres', 1 FROM products p
WHERE p.name = 'Postre del día' AND NOT EXISTS (SELECT 1 FROM upsells u WHERE u.product_id = p.id);
