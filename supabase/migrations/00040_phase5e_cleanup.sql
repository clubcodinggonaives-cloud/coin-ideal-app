-- Removes every Phase 5E test fixture created by 00039, now that the real
-- Cloud E2E run this phase is complete (client journey, provider journey,
-- security isolation tests, Gemini, contact form — see
-- docs/phase-5/PHASE_5E_CLOUD_E2E_REPORT.md).
--
-- Deleting the 3 auth.users rows cascades through profiles -> orders ->
-- order_items / order_status_history / payments / notifications (all FK'd
-- ON DELETE CASCADE per 00028/00017), so the test order created during this
-- phase's client journey is removed automatically. The test service must be
-- deleted only AFTER that cascade completes, since orders.service_id is
-- ON DELETE RESTRICT by design (00028) — a service with live orders against
-- it cannot be dropped, and here that's no longer the case once the order is
-- gone. The uploaded test document in storage.objects is removed separately
-- via the Storage API (direct SQL DELETE on storage.objects is rejected by
-- Supabase: "Direct deletion from storage tables is not allowed").
DO $$
DECLARE
  v_client_a_id UUID := 'a0000000-0000-0000-0000-00000000005e';
  v_client_b_id UUID := 'b0000000-0000-0000-0000-00000000005e';
  v_staff_id    UUID := 'c0000000-0000-0000-0000-00000000005e';
  v_service_id  UUID := 'd0000000-0000-0000-0000-00000000005e';
BEGIN
  DELETE FROM auth.users WHERE id IN (v_client_a_id, v_client_b_id, v_staff_id);

  DELETE FROM public.services WHERE id = v_service_id;
END $$;
