-- Temporary fixture to verify, against the real Cloud database, the fix for
-- the services.provider_id / auth.uid() mismatch found while wiring image
-- uploads (see /provider/services, /provider/services/new,
-- /provider/services/:id/edit — services.provider_id references
-- provider_profiles(id), not profiles(id), but service-new.tsx was
-- inserting profiles.id, and services.tsx/service-new.tsx's own list query
-- filtered on the same wrong id — both silently broken for every real
-- provider). Same direct-SQL account-creation technique as 00039 (avoids
-- the public signup form's email rate limit), same "create temporary,
-- delete after" pattern already approved for QA use this session. Deleted
-- by 00042 once verification is complete.
DO $$
DECLARE
  v_test_provider_id UUID := 'e0000000-0000-0000-0000-000000000041';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_test_provider_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_test_provider_id, 'authenticated', 'authenticated',
      'verify-provider-fix@coin-ideal-qa.test', crypt('VerifyFix!2026', gen_salt('bf')), now(),
      '{}', '{"first_name":"Verify","last_name":"Provider"}', now(), now(), '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (v_test_provider_id, v_test_provider_id, v_test_provider_id, jsonb_build_object('sub', v_test_provider_id::text, 'email', 'verify-provider-fix@coin-ideal-qa.test'), 'email', now(), now());
  END IF;

  UPDATE public.profiles SET role = 'provider' WHERE id = v_test_provider_id;

  INSERT INTO public.provider_profiles (user_id, business_name, description, location, is_verified, is_available)
  VALUES (
    v_test_provider_id,
    '[TEST QA] Verify provider_id fix',
    'Compte temporaire pour verifier la creation de service et le upload d''image.',
    'Ruelle Sajous, Gonaives, Haiti',
    true,
    true
  )
  ON CONFLICT (user_id) DO NOTHING;
END $$;
