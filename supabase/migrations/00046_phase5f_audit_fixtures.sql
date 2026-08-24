-- Phase 5F security audit — temporary fixtures, cleaned up once the audit
-- is complete (see the matching cleanup migration). Same direct-SQL
-- account-creation technique used throughout this project for QA
-- purposes.
--
-- Client B: second client account, distinct from qa-client
-- (00045), needed to test cross-account isolation (RLS SELECT/UPDATE/
-- DELETE denial between two real, unrelated client sessions).
--
-- Admin test account: qa-client/qa-provider (00045) cover client and
-- provider; nothing existed to test the admin role itself without using
-- Guy's real credentials, which this session has never had and does not
-- need.
--
-- Test service: zero active services exist in production (confirmed via
-- REST before writing this), so order-flow RLS/RPC tests need one to
-- order against — reuses the already-existing qa-provider provider
-- profile rather than creating another one.
DO $$
DECLARE
  v_client_b_id UUID := 'b0000000-0000-0000-0000-00000000005f';
  v_admin_id    UUID := 'ad000000-0000-0000-0000-00000000005f';
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
      'phase5f-clientb@coin-ideal-qa.test', crypt('Phase5fAudit!2026', gen_salt('bf')), now(),
      '{}', '{"first_name":"Phase5F","last_name":"ClientB"}', now(), now(), '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (v_client_b_id, v_client_b_id, v_client_b_id, jsonb_build_object('sub', v_client_b_id::text, 'email', 'phase5f-clientb@coin-ideal-qa.test'), 'email', now(), now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_admin_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
      'phase5f-admin@coin-ideal-qa.test', crypt('Phase5fAudit!2026', gen_salt('bf')), now(),
      '{}', '{"first_name":"Phase5F","last_name":"Admin"}', now(), now(), '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (v_admin_id, v_admin_id, v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'phase5f-admin@coin-ideal-qa.test'), 'email', now(), now());
  END IF;
  UPDATE public.profiles SET role = 'admin' WHERE id = v_admin_id;

  SELECT id INTO v_qa_provider_profile_id FROM public.provider_profiles
    WHERE user_id = 'a1000000-0000-0000-0000-000000000045';

  INSERT INTO public.services (id, provider_id, category_id, name, slug, description, price, price_unit, location, is_active)
  VALUES (
    'de000000-0000-0000-0000-00000000005f',
    v_qa_provider_profile_id,
    (SELECT id FROM public.categories WHERE slug = 'impression'),
    '[AUDIT] Service test Phase 5F',
    'audit-test-phase-5f',
    'Service temporaire pour l''audit de securite Phase 5F.',
    1,
    'page',
    'Ruelle Sajous, Gonaives, Haiti',
    true
  )
  ON CONFLICT (id) DO NOTHING;
END $$;
