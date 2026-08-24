-- Removes the Phase 5G table-screenshot fixture (00052): the test order
-- created under the persisting qa-client account, then the test service
-- itself now that no order references it.
DO $$
DECLARE
  v_service_id UUID := 'de000000-0000-0000-0000-00000000005a';
BEGIN
  DELETE FROM public.orders WHERE service_id = v_service_id;
  DELETE FROM public.services WHERE id = v_service_id;
END $$;
