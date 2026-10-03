-- =============================================================================
-- 0002 · Funciones de negocio (SECURITY DEFINER, search_path fijo)
-- Regla de oro: precios, totales, horarios y puntos se calculan SIEMPRE aquí.
-- La API solo valida forma (zod) y fija app.user_id con el usuario del JWT.
-- Errores de negocio: ERRCODE P0001 con mensaje apto para mostrar al cliente.
-- =============================================================================

-- ---------- Contexto de la petición ----------
CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = app_current_user_id()), false)
$$;

CREATE OR REPLACE FUNCTION motor_error(p_msg text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '%', p_msg USING ERRCODE = 'P0001';
END $$;

-- ---------- Límite de peticiones compartido ----------
CREATE OR REPLACE FUNCTION rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hits integer;
BEGIN
  INSERT INTO rate_limits AS r (key, hits, reset_at)
  VALUES (p_key, 1, now() + make_interval(secs => p_window_seconds))
  ON CONFLICT (key) DO UPDATE SET
    hits     = CASE WHEN r.reset_at < now() THEN 1 ELSE r.hits + 1 END,
    reset_at = CASE WHEN r.reset_at < now() THEN now() + make_interval(secs => p_window_seconds) ELSE r.reset_at END
  RETURNING hits INTO v_hits;
  IF random() < 0.01 THEN
    DELETE FROM rate_limits WHERE reset_at < now() - interval '1 day';
  END IF;
  RETURN v_hits <= p_limit;
END $$;

-- ---------- Horario ----------
-- ¿Está abierto el local en el instante p_ts (según su zona horaria)?
CREATE OR REPLACE FUNCTION motor_abierto_en(p_ts timestamptz)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tz text; v_local timestamp; v_h store_hours%ROWTYPE; v_min integer; v_open integer; v_close integer;
BEGIN
  SELECT timezone INTO v_tz FROM store_settings WHERE id = 1;
  v_local := p_ts AT TIME ZONE v_tz;
  SELECT * INTO v_h FROM store_hours WHERE day_of_week = EXTRACT(DOW FROM v_local)::int;
  IF NOT FOUND OR NOT v_h.is_open THEN RETURN false; END IF;
  v_min   := EXTRACT(HOUR FROM v_local)::int * 60 + EXTRACT(MINUTE FROM v_local)::int;
  v_open  := split_part(v_h.open_time, ':', 1)::int * 60 + split_part(v_h.open_time, ':', 2)::int;
  v_close := split_part(v_h.close_time, ':', 1)::int * 60 + split_part(v_h.close_time, ':', 2)::int;
  IF v_close > v_open THEN
    RETURN v_min >= v_open AND v_min <= v_close;
  END IF;
  -- Turno que cruza la medianoche (p. ej. 19:00–02:00)
  RETURN v_min >= v_open OR v_min <= v_close;
END $$;

-- ---------- Líneas del pedido con precio de servidor ----------
-- p_items: [{ "product_id": int, "quantity": int, "options": [text], "notes": text }]
-- Devuelve { "lines": [...], "subtotal": numeric, "min_unit": numeric }.
-- Las opciones se identifican por id (o por nombre, compatibilidad) dentro de
-- customization_schema.groups; cualquier opción desconocida se rechaza.
CREATE OR REPLACE FUNCTION motor_calcular_lineas(p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item jsonb; v_prod products%ROWTYPE; v_qty integer; v_sel jsonb; v_selected text;
  v_group jsonb; v_opt jsonb; v_found boolean; v_count integer; v_extra numeric(10,2);
  v_chosen jsonb; v_unit numeric(10,2); v_lines jsonb := '[]'::jsonb;
  v_subtotal numeric(10,2) := 0; v_min_unit numeric(10,2);
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    PERFORM motor_error('El pedido debe contener al menos un artículo.');
  END IF;
  IF jsonb_array_length(p_items) > 30 THEN
    PERFORM motor_error('El pedido tiene demasiadas líneas.');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_prod FROM products WHERE id = (v_item->>'product_id')::int;
    IF NOT FOUND THEN PERFORM motor_error('Uno de los productos ya no existe en la carta.'); END IF;
    IF NOT v_prod.is_available THEN
      PERFORM motor_error(format('«%s» no está disponible ahora mismo.', v_prod.name));
    END IF;

    v_qty := (v_item->>'quantity')::int;
    IF v_qty IS NULL OR v_qty < 1 OR v_qty > 50 THEN PERFORM motor_error('Cantidad no válida.'); END IF;

    v_sel := COALESCE(v_item->'options', '[]'::jsonb);
    v_extra := 0;
    v_chosen := '[]'::jsonb;

    -- Cada opción elegida debe existir en algún grupo del producto.
    FOR v_selected IN SELECT jsonb_array_elements_text(v_sel) LOOP
      v_found := false;
      FOR v_group IN SELECT * FROM jsonb_array_elements(COALESCE(v_prod.customization_schema->'groups', '[]'::jsonb)) LOOP
        FOR v_opt IN SELECT * FROM jsonb_array_elements(COALESCE(v_group->'options', '[]'::jsonb)) LOOP
          IF v_opt->>'id' = v_selected OR lower(v_opt->>'name') = lower(v_selected) THEN
            v_found := true;
            v_extra := v_extra + COALESCE((v_opt->>'price')::numeric, 0);
            v_chosen := v_chosen || jsonb_build_object(
              'group', v_group->>'id', 'id', v_opt->>'id', 'name', v_opt->>'name',
              'price', COALESCE((v_opt->>'price')::numeric, 0));
            EXIT;
          END IF;
        END LOOP;
        EXIT WHEN v_found;
      END LOOP;
      IF NOT v_found THEN
        PERFORM motor_error(format('La opción «%s» no está disponible para «%s».', v_selected, v_prod.name));
      END IF;
    END LOOP;

    -- Mínimos y máximos de cada grupo.
    FOR v_group IN SELECT * FROM jsonb_array_elements(COALESCE(v_prod.customization_schema->'groups', '[]'::jsonb)) LOOP
      SELECT count(*) INTO v_count FROM jsonb_array_elements(v_chosen) c WHERE c->>'group' = v_group->>'id';
      IF v_count < COALESCE((v_group->>'min')::int, 0) THEN
        PERFORM motor_error(format('Elige al menos %s en «%s» (%s).', v_group->>'min', v_group->>'name', v_prod.name));
      END IF;
      IF v_group ? 'max' AND v_count > (v_group->>'max')::int THEN
        PERFORM motor_error(format('Puedes elegir como máximo %s en «%s» (%s).', v_group->>'max', v_group->>'name', v_prod.name));
      END IF;
    END LOOP;

    v_unit := v_prod.price + v_extra;
    v_subtotal := v_subtotal + v_unit * v_qty;
    v_min_unit := LEAST(COALESCE(v_min_unit, v_unit), v_unit);
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_prod.id, 'product_name', v_prod.name, 'quantity', v_qty,
      'unit_price', v_unit, 'options', v_chosen,
      'notes', left(COALESCE(v_item->>'notes', ''), 200));
  END LOOP;

  RETURN jsonb_build_object('lines', v_lines, 'subtotal', v_subtotal, 'min_unit', v_min_unit);
END $$;

CREATE OR REPLACE FUNCTION motor_insertar_lineas(p_order uuid, p_lines jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, options, customization_details)
  SELECT p_order, (l->>'product_id')::int, l->>'product_name', (l->>'quantity')::int, (l->>'unit_price')::numeric,
         l->'options',
         jsonb_build_object('name', l->>'product_name', 'notes', l->>'notes',
                            'extras', (SELECT COALESCE(jsonb_agg(o->>'name'), '[]'::jsonb) FROM jsonb_array_elements(l->'options') o))
  FROM jsonb_array_elements(p_lines) l
$$;

-- ---------- Checkout ----------
-- p: { client_name, client_phone, delivery_method, delivery_address (jsonb|null),
--      notes, payment_method, scheduled_for (timestamptz|null), points_redeemed,
--      idempotency_key (uuid|null), source ('web'|'kiosk'), items: [...] }
CREATE OR REPLACE FUNCTION motor_resumen_pedido(p_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT to_jsonb(o) || jsonb_build_object('order_items',
           COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.id) FROM order_items i WHERE i.order_id = o.id), '[]'::jsonb))
  FROM orders o WHERE o.id = p_id
$$;

-- Devuelve el pedido creado (con sus líneas) solo a quien lo acaba de crear.
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
      IF cardinality(s.postal_codes_allowed) > 0 THEN
        v_cp := COALESCE(p->'delivery_address'->>'postal_code',
                         substring(p->'delivery_address'->>'text' FROM '\m(\d{5})\M'));
        IF v_cp IS NULL OR NOT (v_cp = ANY (s.postal_codes_allowed)) THEN
          PERFORM motor_error('Tu dirección está fuera de nuestra zona de reparto.');
        END IF;
      END IF;
    END IF;
  ELSE
    IF v_method NOT IN ('delivery', 'pickup', 'local') THEN PERFORM motor_error('Método de entrega no válido.'); END IF;
    IF v_payment NOT IN ('cash', 'card_delivery', 'tpv', 'physical') THEN PERFORM motor_error('Método de pago no válido.'); END IF;
  END IF;

  v_calc := motor_calcular_lineas(p->'items');
  v_subtotal := (v_calc->>'subtotal')::numeric;

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
    IF v_subtotal - v_discount < s.min_order_delivery THEN
      PERFORM motor_error(format('El pedido mínimo para reparto es de %s €.', to_char(s.min_order_delivery, 'FM990D00')));
    END IF;
    v_fee := CASE WHEN s.free_delivery_threshold IS NOT NULL AND v_subtotal - v_discount >= s.free_delivery_threshold
                  THEN 0 ELSE s.delivery_fee END;
  END IF;

  v_total := GREATEST(0, v_subtotal - v_discount) + v_fee;

  INSERT INTO orders (user_id, source, client_name, client_phone, delivery_address, delivery_method,
                      subtotal, discount, delivery_fee, total, points_redeemed, payment_method,
                      notes, scheduled_for, idempotency_key)
  VALUES (v_owner, v_source, p->>'client_name', p->>'client_phone', p->'delivery_address', v_method,
          v_subtotal, v_discount, v_fee, v_total, v_redeem, v_payment,
          NULLIF(p->>'notes', ''), v_sched, v_key)
  RETURNING id INTO v_order;

  PERFORM motor_insertar_lineas(v_order, v_calc->'lines');
  RETURN motor_resumen_pedido(v_order);
END $$;

-- Añadir artículos a un pedido abierto del kiosko (cuenta de mesa). Solo admin.
CREATE OR REPLACE FUNCTION add_items_to_kiosk_order(p_order uuid, p_items jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_calc jsonb; v_o orders%ROWTYPE;
BEGIN
  IF NOT app_is_admin() THEN PERFORM motor_error('Requiere permisos de administrador.'); END IF;
  SELECT * INTO v_o FROM orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND OR v_o.status IN ('delivered', 'cancelled') THEN PERFORM motor_error('El pedido no admite cambios.'); END IF;
  v_calc := motor_calcular_lineas(p_items);
  PERFORM motor_insertar_lineas(p_order, v_calc->'lines');
  UPDATE orders SET subtotal = subtotal + (v_calc->>'subtotal')::numeric,
                    total    = total + (v_calc->>'subtotal')::numeric
  WHERE id = p_order;
END $$;

-- ---------- Puntos: se ganan al entregar, se devuelven al cancelar ----------
CREATE OR REPLACE FUNCTION motor_orders_puntos()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s store_settings%ROWTYPE; v_pts integer;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT * INTO s FROM store_settings WHERE id = 1;
  -- Los puntos solo los mueve el servidor: se marca la operación como de confianza.
  PERFORM set_config('app.trusted', 'on', true);

  IF NEW.status = 'delivered' AND NEW.user_id IS NOT NULL AND NOT NEW.points_redeemed
     AND NEW.points_earned = 0 AND s.loyalty_enabled THEN
    v_pts := floor(NEW.total / 10)::int * s.loyalty_points_per_10;
    IF v_pts > 0 THEN
      UPDATE profiles SET points = points + v_pts WHERE id = NEW.user_id;
      NEW.points_earned := v_pts;
    END IF;
  END IF;

  IF NEW.status = 'cancelled' AND NEW.user_id IS NOT NULL THEN
    IF NEW.points_earned > 0 THEN
      UPDATE profiles SET points = GREATEST(0, points - NEW.points_earned) WHERE id = NEW.user_id;
      NEW.points_earned := 0;
    END IF;
    IF NEW.points_redeemed THEN
      UPDATE profiles SET points = points + s.loyalty_reward_points WHERE id = NEW.user_id;
    END IF;
  END IF;
  PERFORM set_config('app.trusted', 'off', true);
  RETURN NEW;
END $$;

CREATE TRIGGER orders_puntos BEFORE UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION motor_orders_puntos();

-- ---------- Seguimiento, valoración y reclamación de pedidos ----------
-- El UUID del pedido actúa de secreto; solo se exponen campos no sensibles.
CREATE OR REPLACE FUNCTION get_order_status(p_id uuid)
RETURNS TABLE (id uuid, status varchar, delivery_method varchar, total numeric,
               created_at timestamptz, estimated_ready_at timestamptz, scheduled_for timestamptz, rating integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.status, o.delivery_method, o.total, o.created_at, o.estimated_ready_at, o.scheduled_for, o.rating
  FROM orders o WHERE o.id = p_id
$$;

CREATE OR REPLACE FUNCTION submit_review(p_order uuid, p_rating integer, p_comment text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n integer;
BEGIN
  UPDATE orders SET rating = p_rating, review_comment = NULLIF(left(p_comment, 1000), '')
  WHERE id = p_order AND status = 'delivered' AND rating IS NULL
    AND (user_id = app_current_user_id() OR (user_id IS NULL AND created_at > now() - interval '7 days'));
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n = 1;
END $$;

CREATE OR REPLACE FUNCTION claim_guest_order(p_order uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := app_current_user_id(); v_n integer;
BEGIN
  IF v_user IS NULL THEN PERFORM motor_error('Inicia sesión para asociar el pedido.'); END IF;
  UPDATE orders o SET user_id = v_user
  FROM profiles p
  WHERE o.id = p_order AND o.user_id IS NULL AND p.id = v_user AND p.phone = o.client_phone
    AND o.created_at > now() - interval '48 hours';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n = 1;
END $$;

-- ---------- Cuentas (el rol de la API no puede leer profiles de otros) ----------
CREATE OR REPLACE FUNCTION auth_lookup(p_identifier text)
RETURNS TABLE (id uuid, password_hash text, token_version integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, password_hash, token_version FROM profiles
  WHERE lower(email) = lower(p_identifier) OR phone = p_identifier
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION auth_token_state(p_id uuid)
RETURNS TABLE (token_version integer, is_admin boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT token_version, is_admin FROM profiles WHERE id = p_id
$$;

CREATE OR REPLACE FUNCTION register_profile(p_email text, p_password_hash text, p_full_name text,
                                            p_phone text, p_address jsonb, p_verification_hash text)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO profiles (email, password_hash, full_name, phone, address,
                        email_verification_hash, email_verification_expires)
  VALUES (lower(p_email), p_password_hash, p_full_name, p_phone, p_address,
          p_verification_hash, now() + interval '48 hours')
  RETURNING id
$$;

CREATE OR REPLACE FUNCTION verify_email(p_hash text)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE profiles SET is_email_verified = true, email_verification_hash = NULL, email_verification_expires = NULL
  WHERE email_verification_hash = p_hash AND email_verification_expires > now()
  RETURNING id
$$;

CREATE OR REPLACE FUNCTION renew_email_verification(p_email text, p_hash text)
RETURNS TABLE (email varchar, full_name varchar)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE profiles SET email_verification_hash = p_hash, email_verification_expires = now() + interval '48 hours'
  WHERE lower(profiles.email) = lower(p_email) AND NOT is_email_verified
  RETURNING profiles.email, profiles.full_name
$$;

CREATE OR REPLACE FUNCTION is_phone_registered(p_phone text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE phone = p_phone)
$$;

-- Cambiar el correo obliga a verificarlo de nuevo (no se heredan privilegios).
CREATE OR REPLACE FUNCTION motor_profiles_email()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF lower(NEW.email) IS DISTINCT FROM lower(OLD.email) THEN
    NEW.is_email_verified := false;
  END IF;
  -- Columnas que nunca cambia el propio usuario (solo funciones de servidor).
  IF NOT app_is_admin() AND current_setting('app.trusted', true) IS DISTINCT FROM 'on' THEN
    NEW.points := OLD.points;
    NEW.is_admin := OLD.is_admin;
    NEW.token_version := OLD.token_version;
    NEW.password_hash := OLD.password_hash;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_email BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION motor_profiles_email();

-- ---------- Push ----------
CREATE OR REPLACE FUNCTION save_push_subscription(p_phone text, p_endpoint text, p_subscription jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM push_subscriptions WHERE client_phone = p_phone) >= 5 THEN
    DELETE FROM push_subscriptions WHERE id = (
      SELECT id FROM push_subscriptions WHERE client_phone = p_phone ORDER BY created_at LIMIT 1);
  END IF;
  INSERT INTO push_subscriptions (client_phone, endpoint, subscription)
  VALUES (p_phone, p_endpoint, p_subscription)
  ON CONFLICT (endpoint) DO UPDATE SET client_phone = EXCLUDED.client_phone, subscription = EXCLUDED.subscription;
END $$;

-- ---------- Búsqueda de clientes (admin) ----------
CREATE OR REPLACE FUNCTION search_client(p_q text)
RETURNS TABLE (id text, name text, phone text, email text, address jsonb, points integer, is_registered boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT app_is_admin() THEN PERFORM motor_error('Requiere permisos de administrador.'); END IF;
  RETURN QUERY
    SELECT p.id::text, p.full_name::text, p.phone::text, p.email::text, p.address, p.points, true
    FROM profiles p
    WHERE p_q = '' OR p.full_name ILIKE '%' || p_q || '%' OR p.phone ILIKE '%' || p_q || '%' OR p.email ILIKE '%' || p_q || '%'
    UNION ALL
    SELECT k.phone::text, k.name::text, k.phone::text, NULL, k.address, 0, false
    FROM kiosk_customers k
    WHERE NOT EXISTS (SELECT 1 FROM profiles p2 WHERE p2.phone = k.phone)
      AND (p_q = '' OR k.name ILIKE '%' || p_q || '%' OR k.phone ILIKE '%' || p_q || '%')
    LIMIT 100;
END $$;
