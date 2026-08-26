# COIN-IDEAL Feature Map

Complete request-to-response flow for each major feature, with the actual
files involved. See `docs/architecture/AUTH_ARCHITECTURE.md` for
authentication/registration flows in full diagram form (not repeated here).

## Order creation (`/commander`)

```
User (client, authenticated)
  ↓
src/pages/order/document.tsx  (4-step wizard: Fichier → Options → Récupération → Confirmation)
  ↓
src/features/document-orders/components/{file-uploader,print-options,delivery-options,order-summary}.tsx
  ↓
src/features/document-orders/hooks/use-submit-document-order.ts
  ├─ uploadsService.uploadOrderDocument()        → Storage: order-documents (private)
  ├─ (if moncash/natcash) uploadsService.uploadPaymentProof() → Storage: payment-proofs (private)
  ↓
src/services/orders.service.ts → createOrder()
  ↓
Supabase RPC: create_order()  (SECURITY DEFINER — recomputes price server-side)
  ↓
PostgreSQL: INSERT orders, order_items, order_item_finishings, order_status_history
  ↓ (trigger)
notify_order_created()  → INSERT notifications
  ↓
(if proof) src/services/orders.service.ts → submitPaymentProof() → RPC submit_payment_proof()
  ↓
React Query cache invalidated (["orders"])
  ↓
UI: success screen → /dashboard/orders
```

## Client dashboard — "Mes commandes"

```
src/pages/dashboard/orders.tsx
  ↓
src/services/orders.service.ts → getMyOrders(clientId)
  ↓ (RLS: orders_select_client)
PostgreSQL: SELECT orders + joined order_items/status_history/payments/delivery_address/client
  ↓
React Query cache (["orders"])
  ↓
UI: OrderCard list, expandable details, DocumentLink (signed URL on demand)
```

## Staff order processing (provider + admin)

```
src/pages/provider/orders.tsx | src/pages/admin/orders.tsx
  ↓ (same shared component, admin passes showClient=true)
src/features/orders/components/staff-order-card.tsx
  ↓
src/features/orders/hooks/use-orders.ts → getAllOrders() (RLS: orders_select_staff, via is_staff())
  ↓
Action: advance status → src/features/orders/hooks/use-orders.ts → updateOrderStatus()
  ↓ RPC update_order_status()  (staff path: full transition graph)
Action: record payment → RecordPaymentModal → src/features/orders/hooks/use-payments.ts → recordPayment()
  ↓ RPC record_payment()  (staff-only, writes the confirmed ledger)
  ↓ (trigger, if status='confirmed') notify_payment_recorded()
```

## Admin dashboard

```
src/pages/admin/dashboard.tsx
  ↓
src/features/admin/hooks/use-admin.ts → getStats()
  ↓
src/services/admin.service.ts → parallel head-count queries (profiles, provider_profiles, services, service_requests, bookings)
  ↓
UI: stat cards
```
Sub-areas (each its own page + hook + often page-local mutations, see
`docs/architecture/DIRECTORY_MAP.md`'s marketplace-features note for which
pages have shared services vs. local inline hooks):
`/admin/users`, `/admin/providers`, `/admin/services`, `/admin/categories`,
`/admin/pricing`, `/admin/orders`, `/admin/messages`, `/admin/requests`,
`/admin/reviews`, `/admin/settings`.

## Provider dashboard

```
src/pages/provider/dashboard.tsx
  ↓
src/features/providers/hooks/use-providers.ts → useProvider(userId)
  ↓
src/services/providers.service.ts
  ↓
UI: business stats, quick links to services/orders/earnings
```

## Services (catalogue CRUD)

```
Public browse:
  src/pages/public/services.tsx → useServices(filters) → src/services/services.service.ts
    (SELECT, RLS: services_select_active — requires is_active AND provider is_verified)

Provider creates:
  src/pages/provider/service-new.tsx → inline INSERT services (owner RLS)
    → uploadsService.uploadServiceImage() → Storage: service-images (public)
    → INSERT service_images

Admin creates on behalf of a provider:
  src/pages/admin/service-new.tsx → same shape, provider chosen from dropdown
    (RLS: services_admin_all / service_images_admin_all, 00055 — bypasses the owner check)

Provider edits:
  src/pages/provider/service-edit.tsx → UPDATE services, add/remove service_images
```

## Pricing (admin-configurable business config)

```
src/pages/admin/pricing.tsx
  ↓
src/features/admin/hooks/use-admin-pricing.ts
  ↓
src/services/pricing.service.ts (implied — finishing_options, delivery_zones, settings)
  ↓ (RLS: *_admin_all, direct writes, no RPC — these aren't money-computing paths themselves)
PostgreSQL: finishing_options, delivery_zones, settings
  ↓
Read by: create_order() RPC (server-side, authoritative) AND
         src/features/document-orders/hooks/use-pricing-config.ts (client preview)
```

## Payments (staff-confirmed ledger)

```
See "Staff order processing" above for record_payment().
Separately, client payment-proof claim:
  src/features/document-orders/components/delivery-options.tsx (payment-mode UI)
  ↓
  submit_payment_proof() RPC → orders.payment_proof_* columns (unverified claim)
  ↓
  Staff reviews via staff-order-card.tsx (signed URL viewer) → then calls record_payment() to confirm
```

## Delivery

```
src/features/document-orders/components/delivery-options.tsx
  ├─ AddressPicker: src/features/document-orders/hooks/use-addresses.ts
  │     → src/services/addresses.service.ts (getUserAddresses / createAddress)
  │     (RLS: addresses_select_own / _insert_own; staff read via addresses_staff_select, 00063)
  ↓
create_order()'s delivery-fee logic: delivery_zones.fee if a zone is chosen,
  else settings.flat_delivery_fee (delivery_zones has zero rows in practice)
```

## Contact (public form + admin reply)

```
src/pages/public/contact.tsx
  ↓
src/features/contact/hooks/use-contact.ts → useSubmitContactMessage()
  ↓
src/services/contact.service.ts → INSERT contact_messages (RLS: contact_messages_insert_public, WITH CHECK status='new')
  ↓
src/pages/admin/messages.tsx → useContactMessages() / useReplyToContactMessage()
  ↓ (RLS: contact_messages_staff_all, via is_staff())
UPDATE contact_messages SET admin_reply, replied_at
  ↓
UI opens a mailto: link (no real email-sending integration exists)
```

## Gemini AI assistant

```
src/features/ai-assistant/components/chat-widget.tsx  (rendered only if isAuthenticated, PublicLayout only)
  ↓
src/features/ai-assistant/hooks/use-ai-chat.ts
  ↓
src/services/ai-assistant.service.ts → fetch(Edge Function URL, anon key + user JWT)
  ↓
supabase/functions/ai-assistant/index.ts
  ├─ rejects anonymous callers (application-layer check, independent of the UI hiding the widget)
  ├─ check_ai_rate_limit() RPC (10 req/min, durable via ai_rate_limits table)
  ├─ buildBusinessContext() — reads services/categories (read-only)
  ↓
Gemini API (GEMINI_API_KEY secret, server-side only)
  ↓
Response streamed/returned to chat-widget.tsx
```

## File uploads (general pattern, all buckets)

```
Component (e.g. file-uploader.tsx, service-new.tsx, register.tsx's legal-document field)
  ↓
src/services/uploads.service.ts → upload<Thing>(userId/serviceId, file)
  ↓ (RLS on storage.objects: owner-path-scoped write)
Supabase Storage (private buckets: provider-documents/order-documents/payment-proofs;
                  public buckets: avatars/service-images)
  ↓
Path stored in a DB column (order_items.file_path, orders.payment_proof_path, etc.)
  — never a public URL for private buckets
  ↓
Read (private only): uploadsService.get<Thing>Url(path) → createSignedUrl(), short expiry
```

## Notifications (system-generated only)

```
Any INSERT/UPDATE on orders/payments matching a trigger condition
  ↓
notify_order_created() | notify_order_status_change() | notify_payment_recorded()
  (SECURITY DEFINER triggers, 00031 — the ONLY way a notifications row is ever created)
  ↓
src/pages/dashboard/notifications.tsx → src/features/notifications/hooks/use-notifications.ts
  → src/services/notifications.service.ts (read + mark-as-read ONLY, no insert method exists)
```

## Session security (idle timeout + PIN) — admin/provider only

```
src/components/layout/dashboard-layout.tsx
  ├─ useIdleTimeout(isProtectedVariant && isAuthenticated)
  │     → 1h of no activity → real signOut() → redirect /auth/login (sessionStorage flag → login.tsx message)
  ├─ usePin() → elevated? render Outlet : render PinGate
  │     PinGate (src/pages/auth/pin.tsx)
  │       ├─ no pin_set_at → setup form → set_pin() RPC
  │       └─ pin_set_at exists → verify form → verify_pin() RPC (lockout after 5 failures)
  ├─ ChangePinCard (src/features/auth/components/change-pin-card.tsx, on /admin/settings and
  │     /provider/profile) → re-verifies current PIN via verify_pin() before accepting a new one via set_pin()
```
