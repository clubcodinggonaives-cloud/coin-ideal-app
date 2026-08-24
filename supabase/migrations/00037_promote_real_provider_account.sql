-- One-time promotion of COIN-IDEAL's real provider account, per the
-- workflow already documented in README ("Données de démarrage"): the
-- account is created through the normal public /auth/register form (which
-- always lands as role='client' — the role picker's metadata is ignored by
-- handle_new_user(), a known gap, not fixed here), then promoted here.
--
-- Runs as a direct/superuser connection (auth.uid() IS NULL), so the
-- 00027 role-change guard trigger correctly allows it — see that
-- migration's own comment: this is exactly the "promote via SQL" path it
-- was designed to keep working, distinct from an ordinary authenticated
-- user trying to self-promote through the API.
--
-- business_name/description/location mirror supabase/seed.sql's local dev
-- account verbatim (same real address from the cahier des charges) — no
-- new business fact invented here, applied to the real account this time
-- instead of a disposable local one.
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles WHERE email = 'clubcodinggonaives@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No profile found for clubcodinggonaives@gmail.com — sign up via /auth/register first.';
  END IF;

  UPDATE public.profiles SET role = 'provider' WHERE id = v_user_id;

  INSERT INTO public.provider_profiles (
    user_id, business_name, description, location, is_verified, is_available
  ) VALUES (
    v_user_id,
    'COIN-IDEAL Multi-Service',
    'Impression, copie et vente d''eau à Ruelle Sajous, Gonaïves, Haïti.',
    'Ruelle Sajous, Gonaïves, Haïti',
    true,
    true
  )
  ON CONFLICT (user_id) DO NOTHING;
END $$;
