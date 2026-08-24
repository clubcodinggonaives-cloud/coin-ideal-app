-- Phase 5F.1 remediation regression testing — same temporary-fixture
-- pattern as 00046 (Phase 5F itself), needed again because 00047 already
-- cleaned up the Phase 5F fixtures. Cleaned up by 00050 once the
-- regression pass in PHASE_5F1_SECURITY_REMEDIATION_REPORT.md is done.
DO $$
DECLARE
  v_client_b_id UUID := 'b0000000-0000-0000-0000-0000000005f1';
  v_admin_id    UUID := 'ad000000-0000-0000-0000-0000000005f1';
  v_qa_provider_profile_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_client_b_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_client_b_id, 'authenticated', 'authenticated',
      'phase5f1-clientb@coin-ideal-qa.test', crypt('Phase5f1Regr!2026', gen_salt('bf')), now(),
      '{}', '{"first_name":"Phase5F1","last_name":"ClientB"}', now(), now(), '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (v_client_b_id, v_client_b_id, v_client_b_id, jsonb_build_object('sub', v_client_b_id::text, 'email', 'phase5f1-clientb@coin-ideal-qa.test'), 'email', now(), now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_admin_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
      'phase5f1-admin@coin-ideal-qa.test', crypt('Phase5f1Regr!2026', gen_salt('bf')), now(),
      '{}', '{"first_name":"Phase5F1","last_name":"Admin"}', now(), now(), '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (v_admin_id, v_admin_id, v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'phase5f1-admin@coin-ideal-qa.test'), 'email', now(), now());
  END IF;
  UPDATE public.profiles SET role = 'admin' WHERE id = v_admin_id;

  SELECT id INTO v_qa_provider_profile_id FROM public.provider_profiles
    WHERE user_id = 'a1000000-0000-0000-0000-000000000045';

  INSERT INTO public.services (id, provider_id, category_id, name, slug, description, price, price_unit, location, is_active)
  VALUES (
    'de000000-0000-0000-0000-0000000005f1',
    v_qa_provider_profile_id,
    (SELECT id FROM public.categories WHERE slug = 'impression'),
    '[AUDIT] Service test Phase 5F.1 regression',
    'audit-test-phase-5f1-regression',
    'Service temporaire pour les tests de non-regression Phase 5F.1.',
    1,
    'page',
    'Ruelle Sajous, Gonaives, Haiti',
    true
  )
  ON CONFLICT (id) DO NOTHING;
END $$;
