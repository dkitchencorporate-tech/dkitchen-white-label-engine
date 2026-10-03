-- 0004 · Tienda: zonas de reparto con precio propio, existencias sin sobreventa,
-- venta legal de alcohol, regalos y unidades de venta.
-- Todo es opcional: sin zonas, sin existencias (stock NULL) y sin productos con
-- alcohol, el motor se comporta exactamente igual que antes.

-- ---------- Zonas de reparto ----------
CREATE TABLE delivery_zones (
  id                 serial PRIMARY KEY,
  name               varchar(80) NOT NULL,
  postal_codes       text[] NOT NULL CHECK (cardinality(postal_codes) > 0),
  delivery_fee       numeric(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  min_order          numeric(10,2) NOT NULL DEFAULT 0 CHECK (min_order >= 0),
  free_delivery_over numeric(10,2) CHECK (free_delivery_over >= 0),
  eta_minutes        integer NOT NULL DEFAULT 45 CHECK (eta_minutes BETWEEN 5 AND 1440),
  -- Ajuste de precio de la zona sobre el precio base (−50 % … +100 %).
  price_adjust_pct   numeric(5,2) NOT NULL DEFAULT 0 CHECK (price_adjust_pct BETWEEN -50 AND 100),
  is_active          boolean NOT NULL DEFAULT true,
  sort_order         integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Un código postal solo puede pertenecer a una zona activa.
CREATE OR REPLACE FUNCTION motor_zonas_unicas()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cp text;
BEGIN
  IF EXISTS (SELECT 1 FROM unnest(NEW.postal_codes) c WHERE c !~ '^\d{5}$') THEN
    PERFORM motor_error('Los códigos postales deben tener 5 cifras.');
  END IF;
  IF NEW.is_active THEN
    SELECT c INTO v_cp FROM delivery_zones z, unnest(z.postal_codes) c
    WHERE z.is_active AND z.id <> NEW.id AND c = ANY (NEW.postal_codes) LIMIT 1;
    IF FOUND THEN PERFORM motor_error(format('El código postal %s ya pertenece a otra zona.', v_cp)); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER delivery_zones_unicas BEFORE INSERT OR UPDATE ON delivery_zones
  FOR EACH ROW EXECUTE FUNCTION motor_zonas_unicas();

-- ---------- Productos, ajustes y pedidos ----------
ALTER TABLE products
  ADD COLUMN stock      integer CHECK (stock >= 0),          -- NULL = sin control de existencias
  ADD COLUMN is_alcohol boolean NOT NULL DEFAULT false,      -- venta solo a mayores de edad
  ADD COLUMN unit_label varchar(40);                         -- «Lata 33 cl», «Sobre 100 g»…

ALTER TABLE store_settings
  -- Franja en la que se permite vender alcohol (hora local); NULL = sin franja.
  ADD COLUMN alcohol_sale_start varchar(5) CHECK (alcohol_sale_start ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  ADD COLUMN alcohol_sale_end   varchar(5) CHECK (alcohol_sale_end ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  ADD COLUMN alcohol_min_age    integer NOT NULL DEFAULT 18 CHECK (alcohol_min_age BETWEEN 16 AND 21);

ALTER TABLE orders
  ADD COLUMN zone_id      integer REFERENCES delivery_zones(id) ON DELETE SET NULL,
  ADD COLUMN age_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN gift_message text CHECK (char_length(gift_message) <= 250);

-- ---------- Seguridad ----------
GRANT SELECT ON delivery_zones TO motor_app;
GRANT INSERT, UPDATE, DELETE ON delivery_zones TO motor_app;
GRANT USAGE ON SEQUENCE delivery_zones_id_seq TO motor_app;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY lectura ON delivery_zones FOR SELECT TO motor_app USING (is_active OR app_is_admin());
CREATE POLICY admin ON delivery_zones FOR ALL TO motor_app USING (app_is_admin()) WITH CHECK (app_is_admin());

-- ---------- Funciones ----------

-- ¿Se puede vender alcohol a esa hora? (franja local, admite cruzar la medianoche)
CREATE OR REPLACE FUNCTION motor_alcohol_permitido(p_ts timestamptz)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s store_settings%ROWTYPE; v_min integer; v_ini integer; v_fin integer;
BEGIN
  SELECT * INTO s FROM store_settings WHERE id = 1;
  IF s.alcohol_sale_start IS NULL OR s.alcohol_sale_end IS NULL THEN RETURN true; END IF;
  v_min := EXTRACT(HOUR FROM p_ts AT TIME ZONE s.timezone)::int * 60 + EXTRACT(MINUTE FROM p_ts AT TIME ZONE s.timezone)::int;
  v_ini := split_part(s.alcohol_sale_start, ':', 1)::int * 60 + split_part(s.alcohol_sale_start, ':', 2)::int;
  v_fin := split_part(s.alcohol_sale_end, ':', 1)::int * 60 + split_part(s.alcohol_sale_end, ':', 2)::int;
  IF v_ini <= v_fin THEN RETURN v_min >= v_ini AND v_min < v_fin; END IF;
  RETURN v_min >= v_ini OR v_min < v_fin;
END $$;

-- Líneas con precio de zona: cada precio unitario se ajusta y redondea a céntimos.
CREATE OR REPLACE FUNCTION motor_calcular_lineas(p_items jsonb, p_ajuste numeric)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_calc jsonb; v_lines jsonb := '[]'::jsonb; v_l jsonb; v_unit numeric(10,2);
        v_subtotal numeric(10,2) := 0; v_min numeric(10,2); v_alcohol boolean := false;
BEGIN
  v_calc := motor_calcular_lineas(p_items);
  FOR v_l IN SELECT * FROM jsonb_array_elements(v_calc->'lines') LOOP
    v_unit := round((v_l->>'unit_price')::numeric * (1 + COALESCE(p_ajuste, 0) / 100), 2);
    v_subtotal := v_subtotal + v_unit * (v_l->>'quantity')::int;
    v_min := LEAST(COALESCE(v_min, v_unit), v_unit);
    v_lines := v_lines || jsonb_set(v_l, '{unit_price}', to_jsonb(v_unit));
    v_alcohol := v_alcohol OR (SELECT is_alcohol FROM products WHERE id = (v_l->>'product_id')::int);
  END LOOP;
  RETURN jsonb_build_object('lines', v_lines, 'subtotal', v_subtotal, 'min_unit', v_min, 'alcohol', v_alcohol);
END $$;

-- Descuenta existencias de forma atómica: el UPDATE condicionado bloquea la fila,
-- así dos pedidos simultáneos nunca venden la misma unidad.
CREATE OR REPLACE FUNCTION motor_descontar_stock(p_lines jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_quedan integer;
BEGIN
  FOR r IN
    SELECT (l->>'product_id')::int AS id, sum((l->>'quantity')::int)::int AS qty
    FROM jsonb_array_elements(p_lines) l GROUP BY 1 ORDER BY 1   -- orden fijo: sin interbloqueos
  LOOP
    UPDATE products SET stock = stock - r.qty WHERE id = r.id AND stock IS NOT NULL AND stock >= r.qty;
    IF NOT FOUND THEN
      SELECT stock INTO v_quedan FROM products WHERE id = r.id;
      IF v_quedan IS NOT NULL THEN
        IF v_quedan = 0 THEN
          PERFORM motor_error(format('«%s» se ha agotado.', (SELECT name FROM products WHERE id = r.id)));
        END IF;
        PERFORM motor_error(format('Solo quedan %s unidades de «%s».', v_quedan, (SELECT name FROM products WHERE id = r.id)));
      END IF;
    END IF;
  END LOOP;
END $$;

-- Al cancelar un pedido se devuelven sus existencias.
CREATE OR REPLACE FUNCTION motor_orders_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    UPDATE products p SET stock = p.stock + i.qty
    FROM (SELECT product_id, sum(quantity)::int AS qty FROM order_items WHERE order_id = NEW.id GROUP BY 1) i
    WHERE p.id = i.product_id AND p.stock IS NOT NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER orders_stock AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION motor_orders_stock();

-- Zona activa de un código postal (NULL si no hay).
CREATE OR REPLACE FUNCTION motor_zona_de(p_cp text)
RETURNS delivery_zones LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM delivery_zones WHERE is_active AND p_cp = ANY (postal_codes) LIMIT 1
$$;

-- Checkout con zonas, existencias, alcohol y regalo (sustituye al de 0002).
-- p añade: age_confirmed (boolean), gift_message (texto), delivery_address.postal_code.
CREATE OR REPLACE FUNCTION process_checkout(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := app_current_user_id();
  v_admin boolean := app_is_admin();
  v_source text := CASE WHEN app_is_admin() AND p->>'source' = 'kiosk' THEN 'kiosk' ELSE 'web' END;
  s store_settings%ROWTYPE;
  v_method text := p->>'delivery_method';
  v_payment text := COALESCE(p->>'payment_method', 'cash');
  v_sched timestamptz := NULLIF(p->>'scheduled_for', '')::timestamptz;
  v_key uuid := NULLIF(p->>'idempotency_key', '')::uuid;
  v_calc jsonb; v_subtotal numeric(10,2); v_discount numeric(10,2) := 0; v_fee numeric(10,2) := 0;
  v_total numeric(10,2); v_redeem boolean := COALESCE((p->>'points_redeemed')::boolean, false);
  v_prof profiles%ROWTYPE; v_order uuid; v_owner uuid; v_cp text; v_existing uuid;
  v_hay_zonas boolean; v_zona delivery_zones%ROWTYPE; v_ajuste numeric := 0;
  v_min_pedido numeric(10,2); v_gratis numeric(10,2); v_tarifa numeric(10,2); v_eta integer;
  v_edad boolean := COALESCE((p->>'age_confirmed')::boolean, false);
BEGIN
  -- Idempotencia: el mismo intento de pedido nunca crea dos pedidos.
  IF v_key IS NOT NULL THEN
    SELECT id, user_id INTO v_existing, v_owner FROM orders WHERE idempotency_key = v_key;
    IF FOUND THEN
      IF v_owner IS NOT DISTINCT FROM v_user OR v_admin THEN RETURN motor_resumen_pedido(v_existing); END IF;
      PERFORM motor_error('Pedido duplicado.');
    END IF;
  END IF;

  SELECT * INTO s FROM store_settings WHERE id = 1;
  v_min_pedido := s.min_order_delivery; v_gratis := s.free_delivery_threshold; v_tarifa := s.delivery_fee;

  IF v_source = 'web' THEN
    IF v_method NOT IN ('delivery', 'pickup') THEN PERFORM motor_error('Método de entrega no válido.'); END IF;
    IF v_method = 'delivery' AND NOT s.delivery_enabled THEN PERFORM motor_error('El reparto a domicilio no está disponible.'); END IF;
    IF v_method = 'pickup' AND NOT s.pickup_enabled THEN PERFORM motor_error('La recogida en local no está disponible.'); END IF;
    IF v_payment NOT IN ('cash', 'card_delivery', 'physical') THEN PERFORM motor_error('Método de pago no disponible.'); END IF;

    IF v_sched IS NULL THEN
      IF NOT s.is_store_open OR NOT motor_abierto_en(now()) THEN
        PERFORM motor_error('Ahora mismo estamos cerrados. Elige una hora programada para tu pedido.');
      END IF;
    ELSE
      IF v_sched < now() + make_interval(mins => s.prep_minutes) OR v_sched > now() + interval '7 days' THEN
        PERFORM motor_error('La hora programada no es válida.');
      END IF;
      IF NOT motor_abierto_en(v_sched) THEN
        PERFORM motor_error('La hora programada está fuera de nuestro horario.');
      END IF;
    END IF;

    IF v_method = 'delivery' THEN
      IF p->'delivery_address' IS NULL OR jsonb_typeof(p->'delivery_address') <> 'object' THEN
        PERFORM motor_error('La dirección es obligatoria para el reparto a domicilio.');
      END IF;
      v_cp := COALESCE(NULLIF(p->'delivery_address'->>'postal_code', ''),
                       substring(p->'delivery_address'->>'text' FROM '\m(\d{5})\M'));
      SELECT EXISTS (SELECT 1 FROM delivery_zones WHERE is_active) INTO v_hay_zonas;
      IF v_hay_zonas THEN
        -- La zona la decide el servidor por el código postal, nunca el navegador.
        SELECT * INTO v_zona FROM motor_zona_de(v_cp);
        IF v_zona.id IS NULL THEN PERFORM motor_error('Tu dirección está fuera de nuestra zona de reparto.'); END IF;
        v_ajuste := v_zona.price_adjust_pct;
        v_min_pedido := v_zona.min_order; v_gratis := v_zona.free_delivery_over; v_tarifa := v_zona.delivery_fee;
        v_eta := v_zona.eta_minutes;
      ELSIF cardinality(s.postal_codes_allowed) > 0 AND (v_cp IS NULL OR NOT (v_cp = ANY (s.postal_codes_allowed))) THEN
        PERFORM motor_error('Tu dirección está fuera de nuestra zona de reparto.');
      END IF;
    END IF;
  ELSE
    IF v_method NOT IN ('delivery', 'pickup', 'local') THEN PERFORM motor_error('Método de entrega no válido.'); END IF;
    IF v_payment NOT IN ('cash', 'card_delivery', 'tpv', 'physical') THEN PERFORM motor_error('Método de pago no válido.'); END IF;
  END IF;

  v_calc := motor_calcular_lineas(p->'items', v_ajuste);
  v_subtotal := (v_calc->>'subtotal')::numeric;

  -- Alcohol: solo a mayores de edad y dentro de la franja legal (a la hora de entrega).
  IF (v_calc->>'alcohol')::boolean THEN
    IF v_source = 'web' AND NOT v_edad THEN
      PERFORM motor_error(format('Tu pedido incluye alcohol: confirma que tienes %s años o más.', s.alcohol_min_age));
    END IF;
    IF NOT motor_alcohol_permitido(COALESCE(v_sched, now())) THEN
      PERFORM motor_error(format('Por normativa solo vendemos alcohol de %s a %s. Quita las bebidas alcohólicas o programa el pedido.',
                                 s.alcohol_sale_start, s.alcohol_sale_end));
    END IF;
  END IF;

  -- Titular del pedido: el usuario del JWT; en el kiosko, el cliente por teléfono.
  IF v_source = 'kiosk' THEN
    SELECT id INTO v_owner FROM profiles WHERE phone = p->>'client_phone';
  ELSE
    v_owner := v_user;
  END IF;

  IF v_redeem THEN
    IF v_owner IS NULL THEN PERFORM motor_error('Inicia sesión para canjear tus puntos.'); END IF;
    IF NOT s.loyalty_enabled THEN PERFORM motor_error('El programa de puntos no está activo.'); END IF;
    SELECT * INTO v_prof FROM profiles WHERE id = v_owner FOR UPDATE;
    IF NOT v_prof.is_email_verified THEN
      PERFORM motor_error('Para canjear puntos debes verificar tu correo electrónico.');
    END IF;
    IF v_prof.points < s.loyalty_reward_points THEN PERFORM motor_error('No tienes puntos suficientes.'); END IF;
    v_discount := (v_calc->>'min_unit')::numeric;
    PERFORM set_config('app.trusted', 'on', true);
    UPDATE profiles SET points = points - s.loyalty_reward_points WHERE id = v_owner;
    PERFORM set_config('app.trusted', 'off', true);
  END IF;

  IF v_method = 'delivery' THEN
    IF v_subtotal - v_discount < v_min_pedido THEN
      PERFORM motor_error(format('El pedido mínimo para reparto%s es de %s €.',
        CASE WHEN v_zona.id IS NOT NULL THEN ' en ' || v_zona.name ELSE '' END, to_char(v_min_pedido, 'FM990D00')));
    END IF;
    v_fee := CASE WHEN v_gratis IS NOT NULL AND v_subtotal - v_discount >= v_gratis THEN 0 ELSE v_tarifa END;
  END IF;

  v_total := GREATEST(0, v_subtotal - v_discount) + v_fee;

  INSERT INTO orders (user_id, source, client_name, client_phone, delivery_address, delivery_method,
                      subtotal, discount, delivery_fee, total, points_redeemed, payment_method,
                      notes, scheduled_for, idempotency_key, zone_id, age_confirmed, gift_message,
                      estimated_ready_at)
  VALUES (v_owner, v_source, p->>'client_name', p->>'client_phone', p->'delivery_address', v_method,
          v_subtotal, v_discount, v_fee, v_total, v_redeem, v_payment,
          NULLIF(p->>'notes', ''), v_sched, v_key, v_zona.id, v_edad, NULLIF(left(p->>'gift_message', 250), ''),
          CASE WHEN v_eta IS NOT NULL THEN COALESCE(v_sched, now() + make_interval(mins => v_eta)) END)
  RETURNING id INTO v_order;

  PERFORM motor_descontar_stock(v_calc->'lines');
  PERFORM motor_insertar_lineas(v_order, v_calc->'lines');
  RETURN motor_resumen_pedido(v_order);
END $$;

-- Kiosko: también descuenta existencias.
CREATE OR REPLACE FUNCTION add_items_to_kiosk_order(p_order uuid, p_items jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_calc jsonb; v_o orders%ROWTYPE;
BEGIN
  IF NOT app_is_admin() THEN PERFORM motor_error('Requiere permisos de administrador.'); END IF;
  SELECT * INTO v_o FROM orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND OR v_o.status IN ('delivered', 'cancelled') THEN PERFORM motor_error('El pedido no admite cambios.'); END IF;
  v_calc := motor_calcular_lineas(p_items);
  PERFORM motor_descontar_stock(v_calc->'lines');
  PERFORM motor_insertar_lineas(p_order, v_calc->'lines');
  UPDATE orders SET subtotal = subtotal + (v_calc->>'subtotal')::numeric,
                    total    = total + (v_calc->>'subtotal')::numeric
  WHERE id = p_order;
END $$;

