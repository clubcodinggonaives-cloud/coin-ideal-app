-- Temporary fixture, cleaned up by 00053: one test service + real order so
-- the provider/admin "Commandes" table (an explicit responsive-QA checklist
-- item for Phase 5G) can actually be screenshotted with data in it, rather
-- than only ever seeing its empty state.
DO $$
DECLARE
  v_qa_provider_profile_id UUID;
BEGIN
  SELECT id INTO v_qa_provider_profile_id FROM public.provider_profiles
    WHERE user_id = 'a1000000-0000-0000-0000-000000000045';

  INSERT INTO public.services (id, provider_id, category_id, name, slug, description, price, price_unit, location, is_active)
  VALUES (
    'de000000-0000-0000-0000-00000000005a',
    v_qa_provider_profile_id,
    (SELECT id FROM public.categories WHERE slug = 'impression'),
    '[AUDIT] Service test Phase 5G table',
    'audit-test-phase-5g-table',
    'Service temporaire pour capturer le tableau des commandes avec des donnees reelles.',
    1,
    'page',
    'Ruelle Sajous, Gonaives, Haiti',
    true
  )
  ON CONFLICT (id) DO NOTHING;
END $$;
