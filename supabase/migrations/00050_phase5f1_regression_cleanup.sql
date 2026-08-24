-- Removes the Phase 5F.1 regression-test fixtures (00049) now that
-- PHASE_5F1_SECURITY_REMEDIATION_REPORT.md's regression pass is complete.
-- Storage objects (order-documents test uploads under the persisting
-- qa-client account, including 3 leftover from the original Phase 5F
-- audit that its own cleanup migration missed) were already removed via
-- the Storage API before this migration runs.
DO $$
DECLARE
  v_client_b_id UUID := 'b0000000-0000-0000-0000-0000000005f1';
  v_admin_id    UUID := 'ad000000-0000-0000-0000-0000000005f1';
  v_service_id  UUID := 'de000000-0000-0000-0000-0000000005f1';
BEGIN
  DELETE FROM public.orders WHERE service_id = v_service_id;
  DELETE FROM auth.users WHERE id IN (v_client_b_id, v_admin_id);
  DELETE FROM public.services WHERE id = v_service_id;
END $$;
