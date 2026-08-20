-- Storage buckets referenced by src/lib/constants.ts (STORAGE_BUCKETS) and
-- src/services/uploads.service.ts existed nowhere in the schema — every
-- upload call would have failed with "Bucket not found" against a real
-- project. This migration creates them and their RLS policies.
--
-- avatars / service-images: public-facing display images (profile photo,
-- service listing photos) — safe to serve via public URL.
--
-- provider-documents / order-documents: private per the cahier des
-- charges ("Stockage privé pour les fichiers clients", "Accès privé aux
-- documents clients", "Les fichiers privés ne sont pas accessibles aux
-- autres clients"). Never served via getPublicUrl(); read access goes
-- through createSignedUrl() at the point of use.
--
-- Idempotent: safe to re-run (upserts buckets, drops+recreates policies).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('service-images', 'service-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('provider-documents', 'provider-documents', false, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('order-documents', 'order-documents', false, 20971520, ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- AVATARS — public read, owner-only write. Path convention: {user_id}/avatar.*
-- =============================================================================
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_write_own" ON storage.objects;
CREATE POLICY "avatars_write_own"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================================================
-- SERVICE IMAGES — public read, provider-only write. Path: {service_id}/*
-- =============================================================================
DROP POLICY IF EXISTS "service_images_select_public" ON storage.objects;
CREATE POLICY "service_images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-images');

DROP POLICY IF EXISTS "service_images_write_own" ON storage.objects;
CREATE POLICY "service_images_write_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'service-images'
    AND EXISTS (
      SELECT 1 FROM public.services
      JOIN public.provider_profiles ON provider_profiles.id = services.provider_id
      WHERE services.id::text = (storage.foldername(name))[1]
        AND provider_profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_images_delete_own" ON storage.objects;
CREATE POLICY "service_images_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'service-images'
    AND EXISTS (
      SELECT 1 FROM public.services
      JOIN public.provider_profiles ON provider_profiles.id = services.provider_id
      WHERE services.id::text = (storage.foldername(name))[1]
        AND provider_profiles.user_id = auth.uid()
    )
  );

-- =============================================================================
-- PROVIDER DOCUMENTS — private. Owner read/write; admins can read (verification).
-- Path convention: {user_id}/*
-- =============================================================================
DROP POLICY IF EXISTS "provider_documents_owner_rw" ON storage.objects;
CREATE POLICY "provider_documents_owner_rw"
  ON storage.objects FOR ALL
  USING (bucket_id = 'provider-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'provider-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "provider_documents_admin_read" ON storage.objects;
CREATE POLICY "provider_documents_admin_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'provider-documents' AND public.is_admin(auth.uid()));

-- =============================================================================
-- ORDER DOCUMENTS — private. Owner (client) read/write; provider/admin staff
-- can read to process the order. Path convention: {user_id}/*
--
-- MVP-level policy: any 'provider' or 'admin' profile can read any order
-- document, matching the cahier des charges' admin "gestion des fichiers"
-- capability (section 9), which is not scoped per-order in the spec.
-- Hardening follow-up once a dedicated orders/order_files table exists
-- (cahier des charges section 11): scope provider read access to files
-- attached to requests actually assigned to them.
-- =============================================================================
DROP POLICY IF EXISTS "order_documents_owner_rw" ON storage.objects;
CREATE POLICY "order_documents_owner_rw"
  ON storage.objects FOR ALL
  USING (bucket_id = 'order-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'order-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "order_documents_staff_read" ON storage.objects;
CREATE POLICY "order_documents_staff_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'order-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('provider', 'admin')
    )
  );
