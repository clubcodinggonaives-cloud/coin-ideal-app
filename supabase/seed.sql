-- =============================================================================
-- SEED — LOCAL DEVELOPMENT ONLY
-- =============================================================================
-- Per Supabase CLI convention, this file runs automatically on
-- `supabase db reset` / `supabase start` against the LOCAL Docker stack
-- only. It is never applied to a linked remote project by `supabase db
-- push` — migrations are the only thing pushed there.
--
-- It creates a disposable auth account for COIN-IDEAL so the document
-- order workflow (upload -> options -> estimate -> submit) can be tested
-- end-to-end against real relations, without ever inventing or handling
-- GUY Petit-Homme's real login credentials. Before going anywhere near a
-- real project: create the real COIN-IDEAL provider account through
-- /auth/register (role "provider") with a real email/password chosen by
-- the business owner, then adapt the "03. Founding services" block below
-- (swap the auth.users lookup for that real account) into a normal,
-- production-safe migration.
--
-- Services are inserted ACTIVE with round, obviously-fake test prices
-- (10/25 HTG per page) so /tarifs, /services and /commander are actually
-- exercisable end-to-end on your machine. This is safe specifically
-- because seed.sql is local-only by Supabase CLI convention — it never
-- runs against a linked project (`supabase db push` only applies
-- migrations). Before any real deployment, replace this block's approach
-- entirely: seed real services as `is_active = false` with real prices
-- filled in by COIN-IDEAL, then activate from /provider/services — see
-- README "Donnees de demarrage".
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- 01. Dev-only auth account for COIN-IDEAL
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  dev_user_id UUID := '00000000-0000-0000-0000-000000000001';
  dev_email   TEXT := 'dev-coin-ideal@example.test';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = dev_user_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      dev_user_id,
      'authenticated',
      'authenticated',
      dev_email,
      -- Local dev password: "coin-ideal-dev-2026". Never reused for a
      -- real environment; this row only ever exists in the disposable
      -- local Docker Postgres instance.
      crypt('coin-ideal-dev-2026', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"first_name":"COIN-IDEAL","last_name":"Multi-Service"}',
      now(), now(), '', ''
    );

    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider, created_at, updated_at
    ) VALUES (
      dev_user_id, dev_user_id, dev_user_id,
      jsonb_build_object('sub', dev_user_id::text, 'email', dev_email),
      'email', now(), now()
    );
  END IF;
END $$;

-- The handle_new_user trigger (00003_create_profiles.sql) already created
-- the profile row as role='client' — promote it to 'provider' here.
UPDATE public.profiles
SET role = 'provider', phone = NULL
WHERE id = '00000000-0000-0000-0000-000000000001';

-- -----------------------------------------------------------------------------
-- 02. Provider profile
-- -----------------------------------------------------------------------------
INSERT INTO public.provider_profiles (
  id, user_id, business_name, description, location, is_verified, is_available
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'COIN-IDEAL Multi-Service',
  'Impression, copie et vente d''eau a Ruelle Sajous, Gonaives, Haiti.',
  'Ruelle Sajous, Gonaives, Haiti',
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  business_name = EXCLUDED.business_name,
  description = EXCLUDED.description,
  location = EXCLUDED.location;

-- -----------------------------------------------------------------------------
-- 03. Founding services — LOCAL TEST DATA, prices are placeholders
-- -----------------------------------------------------------------------------
-- Uses the categories seeded by 00025_seed_founding_categories.sql
-- (production-safe migration, already applied by the time seed.sql runs).
INSERT INTO public.services (id, provider_id, category_id, name, slug, description, price, price_unit, location, is_active)
SELECT
  v.id, '00000000-0000-0000-0000-000000000002', c.id, v.name, v.slug, v.description, v.price, v.price_unit,
  'Ruelle Sajous, Gonaives, Haiti', true
FROM (
  VALUES
    ('00000000-0000-0000-0000-000000000010'::uuid, 'impression', 'Impression noir & blanc', 'impression-nb', 'Impression noir & blanc, format A4. [PRIX TEST — a remplacer]', 10::numeric, 'page'),
    ('00000000-0000-0000-0000-000000000011'::uuid, 'impression', 'Impression couleur', 'impression-couleur', 'Impression couleur, format A4. [PRIX TEST — a remplacer]', 25::numeric, 'page'),
    ('00000000-0000-0000-0000-000000000012'::uuid, 'copie', 'Copie noir & blanc', 'copie-nb', 'Copie noir & blanc, format A4. [PRIX TEST — a remplacer]', 8::numeric, 'page')
) AS v(id, category_slug, name, slug, description, price, price_unit)
JOIN public.categories c ON c.slug = v.category_slug
ON CONFLICT (provider_id, slug) DO UPDATE SET
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- =============================================================================
-- Apres ce seed : connectez-vous en local avec
--   email    dev-coin-ideal@example.test
--   password coin-ideal-dev-2026
-- Les 3 services ci-dessus portent des prix de test clairement marques
-- [PRIX TEST] : remplacez-les par les tarifs reels de COIN-IDEAL (depuis
-- /provider/services) avant toute utilisation hors de votre machine.
-- =============================================================================
