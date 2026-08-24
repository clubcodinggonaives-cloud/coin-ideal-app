-- Removes every Phase 5F security-audit artifact now that
-- docs/phase-5/PHASE_5F_SECURITY_REPORT.md is written.
--
-- Deleting the phase5f-clientb / phase5f-admin auth.users rows cascades
-- through profiles -> reviews(reviewer_id)/service_requests(client_id,
-- reassigned to clientb during the L2 tampering test)/messages(sender_id)/
-- message_threads(participant_*) automatically (all ON DELETE CASCADE).
--
-- Three things do NOT cascade from those two accounts and are cleaned up
-- explicitly: the 4 test orders and 1 test address created under the
-- PERSISTING qa-client account (orders.service_id is ON DELETE RESTRICT,
-- so they must go before the test service can be dropped), and the
-- message thread between qa-client and qa-provider (both persisting
-- accounts, so nothing cascades it either).
DO $$
DECLARE
  v_client_b_id UUID := 'b0000000-0000-0000-0000-00000000005f';
  v_admin_id    UUID := 'ad000000-0000-0000-0000-00000000005f';
  v_service_id  UUID := 'de000000-0000-0000-0000-00000000005f';
BEGIN
  DELETE FROM public.orders WHERE service_id = v_service_id;
  DELETE FROM public.addresses WHERE street = '123 Test St';
  DELETE FROM public.message_threads
    WHERE (participant_1, participant_2) = (
      LEAST('a1000000-0000-0000-0000-000000000045'::uuid, 'f0000000-0000-0000-0000-000000000045'::uuid),
      GREATEST('a1000000-0000-0000-0000-000000000045'::uuid, 'f0000000-0000-0000-0000-000000000045'::uuid)
    );

  DELETE FROM auth.users WHERE id IN (v_client_b_id, v_admin_id);

  DELETE FROM public.services WHERE id = v_service_id;
END $$;
