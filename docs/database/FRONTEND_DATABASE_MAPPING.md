# COIN-IDEAL — Frontend ↔ Database Mapping

Read from the actual `src/services/*.ts` / `src/features/**/hooks` code, not inferred.

## Current state

| Feature | Table(s) | Query | Mutation | RLS boundary | Storage |
|---|---|---|---|---|---|
| Catalogue browsing (`/services`, `/services/:category`) | `services`, `categories`, `provider_profiles` | `services.service` `getServices/getServicesByCategory` — filtered `.eq('is_active', true)` | — | `services_select_active` | `service-images` (public) |
| Service detail | `services`, `service_images`, `service_availability` | `getServiceById` | — | same | same |
| Tarifs page (`/tarifs`) | `services` | `use-document-services.ts` → active services in the two founding categories | — | `services_select_active` | — |
| Provider listing/detail | `provider_profiles`, `services` | `providers.service.ts` | — | `provider_profiles_select_public` | `avatars` |
| Auth (register/login) | `auth.users` → `profiles` (trigger) | — | `authService.signUp/signIn` | `handle_new_user()` trigger auto-creates `profiles` | — |
| Profile settings | `profiles` | `authService.getProfile` | `authService.updateProfile` | `profiles_update_own` — **see security note below** | `avatars` |
| Document order wizard (`/commander`) | `service_requests` (JSON-in-`message`) | `use-document-services.ts` | `useSubmitDocumentOrder` → `bookingsService.createServiceRequest` | `service_requests_insert_client` | `order-documents` (private) |
| "Mes demandes" (client) | `service_requests` | `bookingsService.getServiceRequests('client')` | `updateRequestStatus` (cancel) | `service_requests_select_client` + trigger guard (00027) | — |
| "Mes réservations" (client) | `bookings` | `bookingsService.getBookings('client')` | `updateBookingStatus` (cancel) | `bookings_select_client` + trigger guard (00027) | — |
| Provider "Demandes"/"Réservations" | `service_requests`, `bookings` | same services, `role='provider'` | `updateRequestStatus`, `updateBookingStatus`, `createBooking` | `service_requests_select_provider`, `bookings_select_provider` | — |
| Favorites | `favorites` | `favorites.service.ts` | insert/delete own | `favorites_select_own` | — |
| Reviews | `reviews` | `reviews.service.ts` | insert own | `reviews_select_public` / `reviews_insert_own` | — |
| Messages | `message_threads`, `messages` | `messages.service.ts` | insert into own thread | participant-scoped policies | — |
| Notifications | `notifications` | `notifications.service.ts` | mark-as-read only | `notifications_select_own` | — |
| Admin dashboard stats | `profiles`, `provider_profiles`, `services`, `service_requests`, `bookings` (counts) | `admin.service.ts getStats` | — | relies on `SELECT` policies above — **admin has no special visibility beyond public/self policies on most of these**, see `RLS_MATRIX.md` | — |
| Admin user management | `profiles` | `getUsers` | `suspendUser` (role→client), `verifyProvider` | **broken today** — no admin-write policy existed before `00027`; fixed by `profiles_admin_all` | — |
| AI assistant (scaffold only) | `services`, `categories` (read-only context) | `buildBusinessContext()` in the edge function | — | anon-readable (`services_select_active`) | — |

### Security note carried from `DATABASE_ARCHITECTURE.md`

`authService.updateProfile(userId, updates: Partial<Profile>)` forwards whatever the
caller passes straight into `.update()`. `Partial<Profile>` includes `role`. Before
`00027`, any authenticated user calling this (or the raw Supabase client directly) with
`{ role: 'admin' }` succeeded. `00027`'s trigger blocks this regardless of which code path
attempts it — but the frontend's `updateProfile` signature itself is still overly
permissive (it *could* still be called with `role` from some future settings UI without
any TypeScript error, only failing at the database layer). Recommended frontend hardening
(not database work, noted here for completeness): narrow `updateProfile`'s parameter type
to `Omit<Partial<Profile>, 'role' | 'id' | 'email'>` so this is also a compile-time error,
not just a runtime one.

## Target state (after `DATABASE_IMPLEMENTATION_PLAN.md` Phase 2–3)

| Feature | Table(s) | Query | Mutation |
|---|---|---|---|
| Document order wizard | `orders`, `order_items`, `order_item_finishings`, `finishing_options`, `delivery_zones`, `settings` | live tariff read from `services`/`finishing_options`/`settings` for the real-time estimate shown to the user | `create_order()` RPC — server recomputes and returns the authoritative total; the client-side `estimateOrderPrice()` becomes a *preview* the RPC's result should match, not the value that gets stored |
| "Mes commandes" (client) | `orders`, `order_items`, `order_status_history`, `payments` | `orders_select_client` + joined items/history | `update_order_status()` RPC, client path only (`en_attente → annulee`) |
| Staff order processing (new `/provider/orders` or extend `/admin/requests`) | `orders`, `order_items`, `payments` | `orders_select_staff` | `update_order_status()` (staff path — full transition graph), `record_payment()` |
| Admin tariff management (new `/admin/pricing`) | `finishing_options`, `delivery_zones`, `settings` | admin-all policies | direct table writes (admin-only RLS, no RPC needed — these aren't money-computing paths, just config) |
| File retention (background) | `orders`, `order_items`, `settings` | scheduled job reads `settings.order_document_retention_days` + `orders.completed_at` | `storage.objects` delete via service-role edge function (Phase 5) |

`src/types/database.ts` (hand-maintained today, not CLI-generated — confirmed no
`supabase gen types` output marker in the file) needs the 8 new table shapes added once
`00028` is reviewed and applied; recommend switching to
`supabase gen types typescript --linked` at that point so this file stops drifting from
the schema by hand, which is the actual risk section 26 of the brief calls out — right now
nothing enforces that `database.ts` matches the migrations, and it already doesn't reflect
the `is_admin`/rating-trigger functions or any of `00027`'s work.
