-- =============================================================================
-- 0003 · Permisos mínimos y RLS
-- La API se conecta con un rol de login que es miembro de `motor_app` (sin
-- BYPASSRLS y sin ser dueño de las tablas). Las migraciones las ejecuta el
-- dueño de la base (p. ej. neondb_owner), nunca la API.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'motor_app') THEN
    CREATE ROLE motor_app NOLOGIN NOBYPASSRLS;
  END IF;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO motor_app;

-- ---------- Privilegios de tabla (lo que RLS permite después filtrar) ----------
GRANT SELECT ON categories, subcategories, products, upsells, store_settings, store_hours TO motor_app;
GRANT INSERT, UPDATE, DELETE ON categories, subcategories, products, upsells TO motor_app;
GRANT UPDATE ON store_settings TO motor_app;
GRANT INSERT, UPDATE ON store_hours TO motor_app;
GRANT SELECT, UPDATE, DELETE ON profiles TO motor_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON kiosk_customers TO motor_app;
GRANT SELECT, UPDATE, DELETE ON orders TO motor_app;
GRANT SELECT, UPDATE, DELETE ON order_items TO motor_app;
GRANT SELECT, DELETE ON push_subscriptions TO motor_app;
GRANT SELECT, INSERT ON site_visits, pwa_installs TO motor_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO motor_app;

-- ---------- Funciones expuestas a la API ----------
GRANT EXECUTE ON FUNCTION
  app_current_user_id(), app_is_admin(), motor_alergenos_validos(),
  rate_limit_hit(text, integer, integer),
  process_checkout(jsonb), add_items_to_kiosk_order(uuid, jsonb),
  get_order_status(uuid), submit_review(uuid, integer, text), claim_guest_order(uuid),
  auth_lookup(text), auth_token_state(uuid),
  register_profile(text, text, text, text, jsonb, text),
  verify_email(text), renew_email_verification(text, text), is_phone_registered(text),
  save_push_subscription(text, text, jsonb), search_client(text)
TO motor_app;

-- ---------- RLS ----------
ALTER TABLE categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE upsells            ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_hours        ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosk_customers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pwa_installs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits        ENABLE ROW LEVEL SECURITY;

-- Catálogo y negocio: lectura pública, escritura solo admin.
CREATE POLICY lectura ON categories     FOR SELECT TO motor_app USING (true);
CREATE POLICY lectura ON subcategories  FOR SELECT TO motor_app USING (true);
CREATE POLICY lectura ON products       FOR SELECT TO motor_app USING (is_available OR app_is_admin());
CREATE POLICY lectura ON upsells        FOR SELECT TO motor_app USING (true);
CREATE POLICY lectura ON store_settings FOR SELECT TO motor_app USING (true);
CREATE POLICY lectura ON store_hours    FOR SELECT TO motor_app USING (true);

CREATE POLICY admin ON categories     FOR ALL TO motor_app USING (app_is_admin()) WITH CHECK (app_is_admin());
CREATE POLICY admin ON subcategories  FOR ALL TO motor_app USING (app_is_admin()) WITH CHECK (app_is_admin());
CREATE POLICY admin ON products       FOR ALL TO motor_app USING (app_is_admin()) WITH CHECK (app_is_admin());
CREATE POLICY admin ON upsells        FOR ALL TO motor_app USING (app_is_admin()) WITH CHECK (app_is_admin());
CREATE POLICY admin ON store_settings FOR UPDATE TO motor_app USING (app_is_admin()) WITH CHECK (app_is_admin());
CREATE POLICY admin ON store_hours    FOR ALL TO motor_app USING (app_is_admin()) WITH CHECK (app_is_admin());

-- Perfiles: cada uno el suyo; el admin, todos. El alta va por register_profile().
CREATE POLICY propio ON profiles FOR SELECT TO motor_app USING (id = app_current_user_id() OR app_is_admin());
CREATE POLICY propio_upd ON profiles FOR UPDATE TO motor_app
  USING (id = app_current_user_id() OR app_is_admin()) WITH CHECK (id = app_current_user_id() OR app_is_admin());
CREATE POLICY propio_del ON profiles FOR DELETE TO motor_app USING (id = app_current_user_id() OR app_is_admin());

CREATE POLICY admin ON kiosk_customers FOR ALL TO motor_app USING (app_is_admin()) WITH CHECK (app_is_admin());

-- Pedidos: el cliente ve los suyos; el admin gestiona todos. El alta va por process_checkout().
CREATE POLICY propio ON orders FOR SELECT TO motor_app USING (user_id = app_current_user_id() OR app_is_admin());
CREATE POLICY admin_upd ON orders FOR UPDATE TO motor_app USING (app_is_admin()) WITH CHECK (app_is_admin());
CREATE POLICY admin_del ON orders FOR DELETE TO motor_app USING (app_is_admin());

CREATE POLICY propio ON order_items FOR SELECT TO motor_app
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.user_id = app_current_user_id() OR app_is_admin())));
CREATE POLICY admin_upd ON order_items FOR UPDATE TO motor_app USING (app_is_admin()) WITH CHECK (app_is_admin());
CREATE POLICY admin_del ON order_items FOR DELETE TO motor_app USING (app_is_admin());

CREATE POLICY admin ON push_subscriptions FOR SELECT TO motor_app USING (app_is_admin());
CREATE POLICY admin_del ON push_subscriptions FOR DELETE TO motor_app USING (app_is_admin());

-- Analítica: cualquiera registra eventos; solo el admin los lee.
CREATE POLICY alta ON site_visits  FOR INSERT TO motor_app WITH CHECK (true);
CREATE POLICY alta ON pwa_installs FOR INSERT TO motor_app WITH CHECK (true);
CREATE POLICY admin ON site_visits  FOR SELECT TO motor_app USING (app_is_admin());
CREATE POLICY admin ON pwa_installs FOR SELECT TO motor_app USING (app_is_admin());
-- rate_limits: sin políticas → solo accesible vía rate_limit_hit().
