-- Phase 5E test fixtures — temporary, cleaned up by 00040 at the end of
-- this phase's testing. Created via direct SQL (not the public signup
-- form) specifically to avoid Supabase's built-in email rate limit
-- (429 "email rate limit exceeded", hit live while registering through the
-- UI for this same phase) — this never sends a confirmation email at all,
-- consistent with supabase/seed.sql's local dev-account pattern, just
-- applied to the real project for a scoped, temporary QA purpose with the
-- account owner's explicit approval.
--
-- Passwords are throwaway, published here only because these rows are
-- deleted by 00040 before this migration file is ever pushed to git
-- history in a way that matters — never real credentials, never reused.
DO $$
DECLARE
  v_client_a_id UUID := 'a0000000-0000-0000-0000-00000000005e';
  v_client_b_id UUID := 'b0000000-0000-0000-0000-00000000005e';
  v_staff_id    UUID := 'c0000000-0000-0000-0000-00000000005e';
  v_guy_provider_id UUID;
BEGIN
  -- Client A
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_client_a_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_client_a_id, 'authenticated', 'authenticated',
      'phase5e-clienta@coin-ideal-qa.test', crypt('Phase5eQA!2026', gen_salt('bf')), now(),
      '{}', '{"first_name":"Phase5E","last_name":"ClientA"}', now(), now(), '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (v_client_a_id, v_client_a_id, v_client_a_id, jsonb_build_object('sub', v_client_a_id::text, 'email', 'phase5e-clienta@coin-ideal-qa.test'), 'email', now(), now());
  END IF;

  -- Client B
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_client_b_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_client_b_id, 'authenticated', 'authenticated',
      'phase5e-clientb@coin-ideal-qa.test', crypt('Phase5eQA!2026', gen_salt('bf')), now(),
      '{}', '{"first_name":"Phase5E","last_name":"ClientB"}', now(), now(), '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (v_client_b_id, v_client_b_id, v_client_b_id, jsonb_build_object('sub', v_client_b_id::text, 'email', 'phase5e-clientb@coin-ideal-qa.test'), 'email', now(), now());
  END IF;

  -- Test staff (temporary admin, so it can exercise both /provider/* and /admin/* — never Guy's real credentials)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_staff_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_staff_id, 'authenticated', 'authenticated',
      'phase5e-staff@coin-ideal-qa.test', crypt('Phase5eQA!2026', gen_salt('bf')), now(),
      '{}', '{"first_name":"Phase5E","last_name":"Staff"}', now(), now(), '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (v_staff_id, v_staff_id, v_staff_id, jsonb_build_object('sub', v_staff_id::text, 'email', 'phase5e-staff@coin-ideal-qa.test'), 'email', now(), now());
  END IF;
  UPDATE public.profiles SET role = 'admin' WHERE id = v_staff_id;

  -- One temporary, clearly-marked test service under Guy's real provider
  -- profile, symbolic price (not a real business tariff).
  SELECT id INTO v_guy_provider_id FROM public.provider_profiles
    WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'clubcodinggonaives@gmail.com');

  INSERT INTO public.services (id, provider_id, category_id, name, slug, description, price, price_unit, location, is_active)
  VALUES (
    'd0000000-0000-0000-0000-00000000005e',
    v_guy_provider_id,
    (SELECT id FROM public.categories WHERE slug = 'impression'),
    '[TEST QA Phase 5E - a supprimer]',
    'test-qa-phase-5e',
    'Service temporaire cree uniquement pour valider le flux de commande de bout en bout. Sera supprime a la fin des tests.',
    1,
    'page',
    'Ruelle Sajous, Gonaïves, Haïti',
    true
  )
  ON CONFLICT (id) DO NOTHING;
END $$;
