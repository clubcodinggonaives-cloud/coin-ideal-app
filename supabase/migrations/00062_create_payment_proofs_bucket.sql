-- Phase 6 — dedicated private bucket for payment-proof screenshots/PDFs
-- (MonCash/NatCash). Kept separate from order-documents: the document to
-- print and the proof of payment have different lifecycles/retention
-- (order_document_retention_days, settings table, is about the print
-- document, not payment evidence) -- reusing order-documents would
-- conflate the two. Same owner-path-scoped + staff-read RLS pattern as
-- provider-documents/order-documents (00023).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs', 'payment-proofs', false, 10485760,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Path convention: {client_user_id}/{order_id}/... — owner (client) full
-- access to their own folder, staff (provider|admin) read-only to review.
DROP POLICY IF EXISTS "payment_proofs_owner_rw" ON storage.objects;
CREATE POLICY "payment_proofs_owner_rw"
  ON storage.objects FOR ALL
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "payment_proofs_staff_read" ON storage.objects;
CREATE POLICY "payment_proofs_staff_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND public.is_staff(auth.uid()));
