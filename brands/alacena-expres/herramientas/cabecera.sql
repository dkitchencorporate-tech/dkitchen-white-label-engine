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
