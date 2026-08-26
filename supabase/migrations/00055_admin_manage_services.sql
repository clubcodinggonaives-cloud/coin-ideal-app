-- Admin has no way to manage any provider's services today:
-- services_insert_own/update_own/delete_own (00020) only allow the owning
-- provider (provider_profiles.user_id = auth.uid()); there is no admin
-- override anywhere on `services` or `service_images`. This blocked a
-- planned admin "add service" screen at the RLS layer even before the UI
-- existed. Reuses the existing is_admin() SECURITY DEFINER function (00021),
-- the same pattern already used for admin-wide access elsewhere (e.g.
-- contact_messages_staff_all in 00034), instead of inventing a new RPC.
CREATE POLICY "services_admin_all"
  ON public.services FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "service_images_admin_all"
  ON public.service_images FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
