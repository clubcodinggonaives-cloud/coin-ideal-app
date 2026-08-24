-- service_images_write_own / service_images_delete_own (00023) reject every
-- real upload with "new row violates row-level security policy", even for
-- the service's actual owner — reproduced live: REST confirms the calling
-- user can independently SELECT both the services row (is_active = true,
-- services_select_active) and its provider_profiles row
-- (provider_profiles_select_public, USING (true)), with
-- provider_profiles.user_id = auth.uid() true, yet the storage.objects
-- policy's EXISTS(...) over that same join still evaluates false.
--
-- Same fix already used elsewhere in this schema for cross-table RLS
-- checks (public.is_admin(), 00028): move the join into a SECURITY DEFINER
-- function so it runs with the function owner's privileges instead of
-- being re-evaluated through storage.objects' own RLS-nested subquery
-- context, where it was silently never matching.
CREATE OR REPLACE FUNCTION public.is_own_service(p_service_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.services
    JOIN public.provider_profiles ON provider_profiles.id = services.provider_id
    WHERE services.id = p_service_id
      AND provider_profiles.user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "service_images_write_own" ON storage.objects;
CREATE POLICY "service_images_write_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'service-images'
    AND public.is_own_service(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "service_images_delete_own" ON storage.objects;
CREATE POLICY "service_images_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'service-images'
    AND public.is_own_service(((storage.foldername(name))[1])::uuid)
  );
