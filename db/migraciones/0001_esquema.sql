-- =============================================================================
-- 0001 · Esquema base del motor (Postgres 15+ / Neon)
-- Sin datos de ninguna marca: la identidad y la carta llegan por la semilla.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Los 14 alérgenos de declaración obligatoria (Reglamento UE 1169/2011).
CREATE OR REPLACE FUNCTION motor_alergenos_validos()
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY['gluten','crustaceos','huevos','pescado','cacahuetes','soja','lacteos',
               'frutos_cascara','apio','mostaza','sesamo','sulfitos','altramuces','moluscos']::text[]
$$;

-- ---------- Catálogo ----------
CREATE TABLE categories (
  id          serial PRIMARY KEY,
  name        varchar(100) NOT NULL UNIQUE,
  subtitle    varchar(150),
  description text,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subcategories (
  id          serial PRIMARY KEY,
  category_id integer NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name        varchar(100) NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, name)
);

-- customization_schema (validado en la API con zod):
--   { "badge"?: string,
--     "groups"?: [ { "id": string, "name": string, "min": int, "max": int,
--                    "options": [ { "id": string, "name": string, "price": number } ] } ] }
CREATE TABLE products (
  id                   serial PRIMARY KEY,
  category_id          integer REFERENCES categories(id) ON DELETE SET NULL,
  subcategory_id       integer REFERENCES subcategories(id) ON DELETE SET NULL,
  name                 varchar(150) NOT NULL,
  description          text,
  price                numeric(10,2) NOT NULL CHECK (price >= 0 AND price <= 9999),
  image_url            text,
  is_available         boolean NOT NULL DEFAULT true,
  is_upsell            boolean NOT NULL DEFAULT false,
  badge                varchar(50),
  allergens            text[] NOT NULL DEFAULT '{}'
                       CHECK (allergens <@ motor_alergenos_validos()),
  customization_schema jsonb NOT NULL DEFAULT '{}'::jsonb
                       CHECK (jsonb_typeof(customization_schema) = 'object'),
  sort_order           integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON products (category_id, sort_order);

CREATE TABLE upsells (
  id         serial PRIMARY KEY,
  product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category   varchar(100) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Usuarios ----------
CREATE TABLE profiles (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                      varchar(255) NOT NULL,
  password_hash              text NOT NULL,
  full_name                  varchar(150),
  phone                      varchar(30),
  address                    jsonb,
  points                     integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  is_admin                   boolean NOT NULL DEFAULT false,
  is_email_verified          boolean NOT NULL DEFAULT false,
  email_verification_hash    text,
  email_verification_expires timestamptz,
  token_version              integer NOT NULL DEFAULT 0,
  created_at                 timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_email_uidx ON profiles (lower(email));
CREATE UNIQUE INDEX profiles_phone_uidx ON profiles (phone) WHERE phone IS NOT NULL;

CREATE TABLE kiosk_customers (
  phone      varchar(30) PRIMARY KEY,
  name       varchar(150),
  address    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Negocio ----------
-- Una sola fila (id = 1). Los datos del negocio quedan vacíos hasta la semilla.
CREATE TABLE store_settings (
  id                      integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  timezone                text NOT NULL DEFAULT 'Europe/Madrid',
  currency                char(3) NOT NULL DEFAULT 'EUR',
  is_store_open           boolean NOT NULL DEFAULT true,
  saturation_mode         boolean NOT NULL DEFAULT false,
  delivery_enabled        boolean NOT NULL DEFAULT true,
  pickup_enabled          boolean NOT NULL DEFAULT true,
  delivery_fee            numeric(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  min_order_delivery      numeric(10,2) NOT NULL DEFAULT 0 CHECK (min_order_delivery >= 0),
  free_delivery_threshold numeric(10,2) CHECK (free_delivery_threshold >= 0),
  estimated_prep_time     varchar(50) NOT NULL DEFAULT '20-30 min',
  prep_minutes            integer NOT NULL DEFAULT 20 CHECK (prep_minutes BETWEEN 0 AND 240),
  postal_codes_allowed    text[] NOT NULL DEFAULT '{}',
  loyalty_enabled         boolean NOT NULL DEFAULT true,
  loyalty_points_per_10   integer NOT NULL DEFAULT 4 CHECK (loyalty_points_per_10 >= 0),
  loyalty_reward_points   integer NOT NULL DEFAULT 25 CHECK (loyalty_reward_points > 0),
  business_name           varchar(150),
  business_legal_name     varchar(200),
  business_cif            varchar(50),
  business_phone          varchar(50),
  business_whatsapp       varchar(50),
  business_email          varchar(150),
  business_address        varchar(255),
  business_city           varchar(100),
  business_postal_code    varchar(20),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
INSERT INTO store_settings (id) VALUES (1);

CREATE TABLE store_hours (
  day_of_week integer PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
  is_open     boolean NOT NULL DEFAULT true,
  open_time   varchar(5) NOT NULL DEFAULT '12:00' CHECK (open_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  close_time  varchar(5) NOT NULL DEFAULT '23:30' CHECK (close_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
INSERT INTO store_hours (day_of_week) SELECT generate_series(0, 6);

-- ---------- Pedidos ----------
CREATE TABLE orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid REFERENCES profiles(id) ON DELETE SET NULL,
  source             varchar(10) NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'kiosk')),
  client_name        varchar(150) NOT NULL,
  client_phone       varchar(30) NOT NULL,
  delivery_address   jsonb,
  delivery_method    varchar(20) NOT NULL CHECK (delivery_method IN ('delivery', 'pickup', 'local')),
  subtotal           numeric(10,2) NOT NULL CHECK (subtotal >= 0),
  discount           numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  delivery_fee       numeric(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total              numeric(10,2) NOT NULL CHECK (total >= 0),
  points_redeemed    boolean NOT NULL DEFAULT false,
  points_earned      integer NOT NULL DEFAULT 0,
  payment_method     varchar(30) NOT NULL DEFAULT 'cash'
                     CHECK (payment_method IN ('cash', 'card_delivery', 'tpv', 'physical', 'online')),
  status             varchar(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'cooking', 'ready', 'delivering', 'delivered', 'cancelled')),
  notes              text CHECK (char_length(notes) <= 500),
  scheduled_for      timestamptz,
  estimated_ready_at timestamptz,
  rating             integer CHECK (rating BETWEEN 1 AND 5),
  review_comment     text CHECK (char_length(review_comment) <= 1000),
  idempotency_key    uuid UNIQUE,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_created_idx ON orders (created_at DESC);
CREATE INDEX orders_user_idx ON orders (user_id, created_at DESC);
CREATE INDEX orders_status_idx ON orders (status);

CREATE TABLE order_items (
  id                    serial PRIMARY KEY,
  order_id              uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id            integer REFERENCES products(id) ON DELETE SET NULL,
  product_name          varchar(150) NOT NULL,
  quantity              integer NOT NULL CHECK (quantity BETWEEN 1 AND 50),
  unit_price            numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  options               jsonb NOT NULL DEFAULT '[]'::jsonb,
  customization_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_sent_to_kitchen    boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_idx ON order_items (order_id);

-- ---------- Notificaciones y analítica ----------
CREATE TABLE push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_phone varchar(30) NOT NULL,
  endpoint     text NOT NULL UNIQUE,
  subscription jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE site_visits (
  id          bigserial PRIMARY KEY,
  session_id  varchar(64) NOT NULL,
  event_type  varchar(40),
  label       varchar(120),
  device_type varchar(20),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pwa_installs (
  id          bigserial PRIMARY KEY,
  device_type varchar(20),
  app_type    varchar(20),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Límite de peticiones compartido entre instancias serverless.
CREATE TABLE rate_limits (
  key      text PRIMARY KEY,
  hits     integer NOT NULL,
  reset_at timestamptz NOT NULL
);
