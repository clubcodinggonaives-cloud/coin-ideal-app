-- Found live while testing the new approval-gate feature: the admin
-- "Vérifier ce prestataire" button has never actually worked at the
-- database level. provider_profiles_update_own (00020) only allows
-- auth.uid() = user_id -- an admin's UPDATE silently affects 0 rows (no
-- RLS error is raised on an UPDATE that matches nothing, so the UI showed
-- no error either, masking this since it shipped). Same missing-admin-
-- override pattern already fixed for services/service_images in 00055.
CREATE POLICY "provider_profiles_admin_all"
  ON public.provider_profiles FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
