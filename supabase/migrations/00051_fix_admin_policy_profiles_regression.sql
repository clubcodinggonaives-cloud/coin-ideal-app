-- Fixes a live regression from 00048 (Phase 5F.1's HIGH remediation),
-- found while measuring performance for Phase 5G: browsing /services,
-- /tarifs, /commander, /vente-eau, and the homepage's category list all
-- returned 401 for real anonymous visitors, and the public contact form
-- (/contact) could no longer be submitted at all.
--
-- Root cause: several "*_admin_all"/"*_staff_all" policies (00020, 00023,
-- 00028, 00034) are FOR ALL and do a raw
-- `EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
-- AND profiles.role = ...)` in their USING/WITH CHECK clause, instead of
-- going through the `is_admin()` SECURITY DEFINER function (00021) the
-- way most of this schema's later policies correctly do. Postgres must
-- evaluate every applicable PERMISSIVE policy's condition to compute
-- their OR, even when an earlier one would already pass — so for the
-- `anon` role, merely evaluating that raw subquery now hits the column
-- permission removed by 00048 (`profiles.role` no longer granted to
-- anon) and hard-errors the whole query, rather than evaluating to
-- false and letting the other, passing policy through.
--
-- 00048's own regression-test pass caught this exact pattern on the
-- `orders` family and documented it as a "side effect" because nothing
-- in the real app queries `orders` anonymously — that reasoning does
-- NOT hold for `categories` (public storefront, category tiles/service
-- listings) or `contact_messages` (public, unauthenticated contact
-- form), which real anonymous visitors hit on every page load. Fixing
-- all occurrences of the pattern here, not just those two, both because
-- they're identical in kind and because 00048's own "Residual Risk"
-- section already flagged this as the right next step rather than
-- leaving more of them to be discovered one at a time.
--
-- SECURITY DEFINER functions run with the function owner's privileges,
-- not the caller's, so calling is_admin()/is_staff() from a policy does
-- not require the calling role to have any grant on `profiles` at all —
-- this is the same reasoning already applied in 00042 for the
-- service-images storage policies.
CREATE OR REPLACE FUNCTION public.is_staff(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = uid AND profiles.role IN ('provider', 'admin')
  );
$$;

-- categories (00020) — the one breaking the public storefront.
DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
CREATE POLICY "categories_admin_all"
  ON public.categories FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- reports (00020) — not anon-reachable today, fixed for consistency/defense-in-depth.
DROP POLICY IF EXISTS "reports_admin_all" ON public.reports;
CREATE POLICY "reports_admin_all"
  ON public.reports FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- admin_logs (00020) — not anon-reachable today, fixed for consistency/defense-in-depth.
DROP POLICY IF EXISTS "admin_logs_select_admin" ON public.admin_logs;
CREATE POLICY "admin_logs_select_admin"
  ON public.admin_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_logs_insert_admin" ON public.admin_logs;
CREATE POLICY "admin_logs_insert_admin"
  ON public.admin_logs FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- order-documents storage (00023) — not anon-reachable today (orders always
-- require login), fixed for consistency/defense-in-depth.
DROP POLICY IF EXISTS "order_documents_staff_read" ON storage.objects;
CREATE POLICY "order_documents_staff_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'order-documents' AND public.is_staff(auth.uid()));

-- orders/order_items/order_item_finishings/order_status_history/payments
-- (00028) — the exact family 00048's regression pass already documented
-- as a side effect (401 instead of 200 empty for anon); fixed for real
-- now rather than left as a known quirk.
DROP POLICY IF EXISTS "orders_select_staff" ON public.orders;
CREATE POLICY "orders_select_staff"
  ON public.orders FOR SELECT
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "order_items_select_staff" ON public.order_items;
CREATE POLICY "order_items_select_staff"
  ON public.order_items FOR SELECT
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "order_item_finishings_select_staff" ON public.order_item_finishings;
CREATE POLICY "order_item_finishings_select_staff"
  ON public.order_item_finishings FOR SELECT
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "order_status_history_select_staff" ON public.order_status_history;
CREATE POLICY "order_status_history_select_staff"
  ON public.order_status_history FOR SELECT
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "payments_select_staff" ON public.payments;
CREATE POLICY "payments_select_staff"
  ON public.payments FOR SELECT
  USING (public.is_staff(auth.uid()));

-- contact_messages (00034) — the other one breaking a real public flow
-- (the /contact form itself, submitted while signed out).
DROP POLICY IF EXISTS "contact_messages_staff_all" ON public.contact_messages;
CREATE POLICY "contact_messages_staff_all"
  ON public.contact_messages FOR ALL
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
