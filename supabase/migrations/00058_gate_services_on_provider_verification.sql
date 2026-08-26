-- Admin-approval gate requested by the operator: a newly-registered
-- provider can log in and set up their profile/services right away (not
-- blocked), but nothing they create should be publicly visible until an
-- admin verifies their account (provider_profiles.is_verified, already
-- exposed via the existing "Vérifié" toggle on /admin/providers -- until
-- now purely cosmetic, this is what makes it actually gate something).
DROP POLICY "services_select_active" ON public.services;

CREATE POLICY "services_select_active"
  ON public.services FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.provider_profiles
      WHERE provider_profiles.id = services.provider_id
        AND provider_profiles.is_verified = true
    )
  );

-- The owning provider and staff must still see their own not-yet-verified
-- services (e.g. on /provider/services, /admin/services) -- services_
-- insert_own/update_own/delete_own (00020) already cover the owner for
-- writes, but there was no owner-SELECT policy separate from the public
-- one being replaced above (the public policy was previously permissive
-- enough to cover it for active rows; a not-yet-verified provider's rows
-- need their own explicit SELECT now that the public one is stricter).
CREATE POLICY "services_select_own"
  ON public.services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.provider_profiles
      WHERE provider_profiles.id = services.provider_id
        AND provider_profiles.user_id = auth.uid()
    )
  );
