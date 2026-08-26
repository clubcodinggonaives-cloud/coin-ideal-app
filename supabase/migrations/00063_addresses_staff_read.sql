-- Found live while testing the Phase 6 order/delivery view: addresses RLS
-- (00020) only ever had addresses_select_own (the owning client) -- staff
-- had NO way to read a client's delivery address at all, so the
-- delivery_address:addresses(*) join in ORDER_SELECT (orders.service.ts)
-- silently returned null for every staff query, even though
-- reception_method correctly showed 'delivery'. Same "MVP-level, single
-- provider today" reasoning already documented for order_documents_staff_read
-- (00023): staff need this to actually fulfill a delivery.
CREATE POLICY "addresses_staff_select"
  ON public.addresses FOR SELECT
  USING (is_staff(auth.uid()));
