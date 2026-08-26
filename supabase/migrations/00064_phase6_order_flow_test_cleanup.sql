-- Cleanup of live QA fixtures created while testing the Phase 6 payment-
-- proof/delivery-address order flow end-to-end (qa-client account only,
-- never the real business account). orders/payments have INSERT/UPDATE/
-- DELETE revoked from authenticated (00028) by design, so this cleanup can
-- only run as a migration, matching the same pattern already used for
-- 00047/00050/00053's phase-testing cleanups.
--
-- Matches by delivery_address_id (some early aborted test runs never got a
-- payment_reference filled in) as well as by payment_reference, and deletes
-- orders/children BEFORE the addresses they reference -- doing it in the
-- opposite order trips orders_delivery_address_required (00028) via the
-- ON DELETE SET NULL on delivery_address_id.
DO $$
DECLARE
  v_order_ids UUID[];
BEGIN
  SELECT array_agg(id) INTO v_order_ids
  FROM public.orders
  WHERE payment_reference LIKE 'REF-TEST%'
     OR delivery_address_id IN (SELECT id FROM public.addresses WHERE label LIKE 'Test Livraison%');

  DELETE FROM public.order_item_finishings
  WHERE order_item_id IN (SELECT id FROM public.order_items WHERE order_id = ANY(v_order_ids));
  DELETE FROM public.order_items WHERE order_id = ANY(v_order_ids);
  DELETE FROM public.order_status_history WHERE order_id = ANY(v_order_ids);
  DELETE FROM public.payments WHERE order_id = ANY(v_order_ids);
  DELETE FROM public.orders WHERE id = ANY(v_order_ids);
END $$;

DELETE FROM public.addresses WHERE label LIKE 'Test Livraison%';
