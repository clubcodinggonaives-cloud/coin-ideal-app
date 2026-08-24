-- Two persistent QA accounts, requested explicitly, so the team can log in
-- as a client and as a provider to verify how the system behaves for each
-- role -- distinct from clubcodinggonaives@gmail.com, which is role='admin'
-- only (no separate client/provider account existed to test against before
-- this). Unlike the temporary fixtures in 00039/00041 (created, used,
-- deleted), these are meant to persist for ongoing verification -- delete
-- them the same way (see 00040/00043/00044) whenever they're no longer
-- needed.
--
-- Created via direct SQL (auth.users/auth.identities with
-- email_confirmed_at pre-set), same technique used throughout this project
-- for QA accounts, to avoid the public signup form's email rate limit and
-- because these are not real people who need an email confirmation.
DO $$
DECLARE
  v_qa_client_id UUID := 'f0000000-0000-0000-0000-000000000045';
  v_qa_provider_id UUID := 'a1000000-0000-0000-0000-000000000045';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_qa_client_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_qa_client_id, 'authenticated', 'authenticated',
      'qa-client@coin-ideal-qa.test', crypt('CoinIdealVerify!2026', gen_salt('bf')), now(),
      '{}', '{"first_name":"QA","last_name":"Client"}', now(), now(), '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (v_qa_client_id, v_qa_client_id, v_qa_client_id, jsonb_build_object('sub', v_qa_client_id::text, 'email', 'qa-client@coin-ideal-qa.test'), 'email', now(), now());
  END IF;
  -- role='client' is already handle_new_user()'s default, nothing to update

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_qa_provider_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_qa_provider_id, 'authenticated', 'authenticated',
      'qa-provider@coin-ideal-qa.test', crypt('CoinIdealVerify!2026', gen_salt('bf')), now(),
      '{}', '{"first_name":"QA","last_name":"Provider"}', now(), now(), '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (v_qa_provider_id, v_qa_provider_id, v_qa_provider_id, jsonb_build_object('sub', v_qa_provider_id::text, 'email', 'qa-provider@coin-ideal-qa.test'), 'email', now(), now());
  END IF;

  UPDATE public.profiles SET role = 'provider' WHERE id = v_qa_provider_id;

  INSERT INTO public.provider_profiles (user_id, business_name, description, location, is_verified, is_available)
  VALUES (
    v_qa_provider_id,
    '[QA] Compte prestataire de verification',
    'Compte de verification permanent, distinct du compte administrateur reel, pour tester le parcours prestataire.',
    'Ruelle Sajous, Gonaives, Haiti',
    true,
    true
  )
  ON CONFLICT (user_id) DO NOTHING;
END $$;
