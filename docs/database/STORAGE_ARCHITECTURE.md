# COIN-IDEAL — Storage Architecture

All 4 buckets already exist (`00023_create_storage_buckets.sql`) and match what
`src/lib/constants.ts` (`STORAGE_BUCKETS`) and `src/services/uploads.service.ts` expect —
this is documentation of the existing, working design plus the one gap found.

## Buckets

| Bucket | Public | Max size | Allowed MIME types | Path convention |
|---|---|---|---|---|
| `avatars` | ✅ | 5 MB | `image/jpeg`, `image/png`, `image/webp` | `{user_id}/avatar.{ext}` |
| `service-images` | ✅ | 10 MB | `image/jpeg`, `image/png`, `image/webp` | `{service_id}/{timestamp}.{ext}` |
| `provider-documents` | ❌ private | 20 MB | `application/pdf`, `image/jpeg`, `image/png` | `{user_id}/*` |
| `order-documents` | ❌ private | 20 MB | PDF, DOC, DOCX, JPG, PNG (matches cahier des charges §4.2 exactly) | `{user_id}/{timestamp}-{sanitized filename}` |

## Access model

```
User selects file
      │
      ▼
uploadsService.uploadOrderDocument(userId, file)
      │  storage.foldername(name)[1] === auth.uid()::text  (enforced by RLS on storage.objects)
      ▼
Private bucket: order-documents            (public = false in storage.buckets)
      │
      ▼
Path stored as order_items.file_path (00028) — NEVER a public URL
      │
      ▼
Read: uploadsService.getOrderDocumentUrl(path, expiresInSeconds = 300)
      → storage.createSignedUrl() — short-lived, single-purpose
```

- **`avatars` / `service-images`**: public read (`bucket_id = '...'` with no further
  condition) is correct here — these are display images meant to be publicly visible on
  provider/service pages, same as any public-facing e-commerce photo. Write access is
  owner-scoped: avatars by `(storage.foldername(name))[1] = auth.uid()::text`, service
  images by an `EXISTS` join proving the caller is the service's provider.
- **`provider-documents` / `order-documents`**: private by default in `storage.buckets`
  (`public = false`), matching cahier des charges §4.2 ("stockage privé") and §14 ("accès
  privé aux documents clients") word for word. Owner has full RW via
  `(storage.foldername(name))[1] = auth.uid()::text`; `provider-documents` additionally
  grants admin-only read (verification workflow); `order-documents` grants read to any
  `provider`/`admin` profile (see MVP-scoping note below). **`getPublicUrl()` is never
  called on these two buckets anywhere in the codebase** — confirmed by reading
  `uploads.service.ts`; only `createSignedUrl()` with a 300-second default expiry.

### MVP-level scoping note (already documented in the migration itself)

`order_documents_staff_read` grants read to **any** `provider`/`admin` profile for
**any** order document, not scoped to "documents attached to orders assigned to this
specific staff member" — because, per the migration's own comment, there's currently no
`orders`/`order_items` table to scope against. **This is resolved by Phase 2/3**
(`00028` creates `order_items.file_path`, and the RLS on `order_items` already scopes
reads to the owning client or any staff profile — see `RLS_MATRIX.md`). Once the frontend
cuts over to `orders` (Phase 3), consider tightening `order_documents_staff_read` to join
through `order_items.file_path = name` and `orders.status NOT IN ('livree','retiree',
'annulee')` if per-order staff assignment becomes a requirement — not needed for the
current single-staff-pool (COIN-IDEAL) reality.

## Retention

Cahier des charges §4.2: delete order documents "par exemple 30 jours après
finalisation." `00029` seeds `settings.order_document_retention_days = 30` as the
configured value. **No enforcement job exists yet** — this is Phase 5 of
`DATABASE_IMPLEMENTATION_PLAN.md`, blocked on Phase 2/3 shipping first so there's a real
`order_items.file_path` + `orders.completed_at` to act on. Until that job exists, uploaded
documents persist indefinitely in the private bucket — flagged as a known gap, not
silently left undocumented.

## File validation

Client-side: `ORDER_FILE_ACCEPT` / `ORDER_FILE_MAX_SIZE_MB` (`src/lib/constants.ts`) plus
`src/features/document-orders/utils/validate-file.ts` reject the wrong extension/size
before upload. Server-side: the bucket's own `allowed_mime_types`/`file_size_limit`
(`storage.buckets`) is the actual enforcement boundary — client-side validation is a UX
convenience, not the security control, which is the correct split per cahier des charges
§14 ("validation et contrôle des fichiers uploadés").
