# COIN-IDEAL — RLS Matrix

Roles as Postgres/PostgREST sees them: **Anonymous** (`anon`), **Authenticated** = any
logged-in user regardless of `profiles.role` (Postgres grants don't know app-level roles —
only RLS `USING`/`WITH CHECK` clauses do), broken out below into **Customer** (own rows)
and **Provider** (COIN-IDEAL staff today; scoped via `provider_profiles.user_id` or
`profiles.role IN ('provider','admin')` depending on the table), and **Admin**
(`profiles.role = 'admin'`, checked via `is_admin(auth.uid())`).

Legend: ✅ allowed · ❌ not allowed · **own** = scoped to rows the caller owns ·
**staff** = any `provider`/`admin` profile, unscoped (documented MVP simplification,
see notes) · ⚠️ = allowed by RLS but only via a validating trigger/RPC, not a raw write.

## Existing tables (00001–00026)

| Table | Anon SELECT | Customer SELECT | Customer INSERT | Customer UPDATE | Provider SELECT | Provider UPDATE | Admin |
|---|---|---|---|---|---|---|---|
| `profiles` | ❌ | ✅ own + ✅ all (public read policy) | n/a (trigger-created) | ⚠️ own, role locked by trigger (00027) | same as customer | same as customer | ✅ all (00027) |
| `provider_profiles` | ✅ all | ✅ all | ❌ | ⚠️ own only | ✅ all | ✅ own only | ✅ all* |
| `categories` | ✅ active only | ✅ active only | ❌ | ❌ | ✅ active only | ❌ | ✅ all |
| `services` | ✅ active only | ✅ active only | ❌ | ❌ | ✅ active only | ✅ own only | ✅ all* |
| `service_images` | ✅ all | ✅ all | ❌ | n/a | ✅ all | ✅ own service only | ✅ all* |
| `service_availability` | ✅ all | ✅ all | ❌ | n/a | ✅ all | ✅ own service only | ✅ all* |
| `addresses` | ❌ | ✅ own | ✅ own | ✅ own | ❌ (not theirs) | ❌ | ✅ all* |
| `service_requests` | ❌ | ✅ own (client) | ✅ own (client) | ⚠️ own, cancel-only, guarded by trigger (00027) | ✅ own (provider) | ✅ own (provider), any field | ✅ all* |
| `bookings` | ❌ | ✅ own (client) | ❌ (via `createBooking` RPC-less insert — provider/admin path) | ⚠️ own, cancel-only, guarded by trigger (00027) | ✅ own (provider) | ✅ own (provider), any field | ✅ all* |
| `favorites` | ❌ | ✅ own | ✅ own | n/a | ❌ | ❌ | ✅ all* |
| `reviews` | ✅ all | ✅ all | ✅ own (as reviewer) | ⚠️ own — **see note** | ✅ all | ❌ (no reply-write policy exists today) | ✅ all* |
| `message_threads` | ❌ | ✅ own (participant) | ✅ own (participant) | ❌ | ✅ own (participant) | ❌ | ✅ all* |
| `messages` | ❌ | ✅ own thread | ✅ own thread, as sender | ✅ own thread (any field — **see note**) | ✅ own thread | ✅ own thread | ✅ all* |
| `notifications` | ❌ | ✅ own | ❌ (system-inserted only — **gap**, see note) | ✅ own (mark read) | ✅ own | ✅ own | ✅ all* |
| `reports` | ❌ | ✅ own (as reporter) | ✅ own | ❌ | ❌ | ❌ | ✅ all |
| `admin_logs` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ read + insert |

`*` = admin has no explicit blanket policy on that table beyond the specific ones listed
(e.g. `provider_profiles`, `services`, `addresses`, `service_requests`, `bookings`,
`favorites`, `reviews`, `message_threads`, `messages`, `notifications` have **no
`*_admin_all` policy today** — admin access to them relies entirely on being a normal
authenticated user with no special row visibility beyond what customer/provider policies
already grant, i.e. **admin cannot currently read or moderate an arbitrary user's
addresses, favorites, or private messages**, matching the "gestion des utilisateurs"
capability the cahier des charges' admin dashboard (§9) implies but which isn't fully
wired at the RLS layer yet. `profiles` and `reports`/`categories` are the only tables with
a real admin-all policy pre-00027. **Decision needed**: is admin read access to
addresses/favorites/private messages actually required for MVP support workflows, or is
that scope creep? Flagged, not built.)

### Notes on gaps in this matrix (not fixed in this phase — flagged for approval)

- **`reviews_update_own`**: a reviewer can rewrite not just `rating`/`comment` but also
  `response`/`response_at` on their own review — fields intended for the provider's reply.
  Low severity (reviews are already public and self-authored), but worth a column guard
  if provider replies become a real feature.
- **`messages_update_participant`**: either participant can update *any* message in a
  thread they're part of, not just their own `is_read` flag — a recipient could silently
  edit the sender's message content. No message-editing feature is exposed in the UI
  today, so this is currently latent, not exploited, but should get the same column-guard
  treatment as `profiles`/`service_requests`/`bookings` if a "mark as read" UI is built
  before an "edit my message" one — otherwise the two are indistinguishable at the RLS
  layer.
- **`notifications` has no INSERT policy for anyone** (customer, provider, or admin) —
  by design, notifications should only ever be system-generated (a trigger, or a
  SECURITY DEFINER function), never user-writable. Today, **nothing creates
  notifications at all** — the table and its RLS are ready but unused. This is
  intentional-looking (no INSERT policy = correct default-deny) but means the
  cahier des charges §15 notification requirement is not yet implemented. See Phase 6 of
  `DATABASE_IMPLEMENTATION_PLAN.md`.

## New tables (proposed, `00028`)

| Table | Anon | Customer | Provider (staff) | Admin |
|---|---|---|---|---|
| `orders` | ❌ | SELECT own only | SELECT all (staff, MVP-scoped like `order_documents_staff_read`) | SELECT all |
| `order_items` | ❌ | SELECT own order's items | SELECT all | SELECT all |
| `order_item_finishings` | ❌ | SELECT own order's items | SELECT all | SELECT all |
| `order_status_history` | ❌ | SELECT own order's history | SELECT all | SELECT all |
| `payments` | ❌ | SELECT own order's payments | SELECT all | SELECT all |
| `finishing_options` | SELECT active | SELECT active | SELECT active | ALL |
| `delivery_zones` | SELECT active | SELECT active | SELECT active | ALL |
| `settings` | SELECT all | SELECT all | SELECT all | ALL |

**No table above has a client-facing INSERT/UPDATE/DELETE policy at all.** All writes to
`orders`/`order_items`/`order_item_finishings`/`order_status_history`/`payments` are
`REVOKE`d from `anon`/`authenticated` outright and only reachable through
`create_order()`, `update_order_status()`, `record_payment()` — see
`DATABASE_ARCHITECTURE.md` §3.1 and the `00028` migration for why (price and status
integrity cannot depend on a client-supplied value plus a policy check; a validating
function is the boundary instead).

## `USING (true)` audit

Every permissive-looking policy in this schema, and why it's intentional rather than
accidental:

| Policy | Table | Justification |
|---|---|---|
| `profiles_select_public` | `profiles` | Provider/client display names must be publicly readable (provider pages, review authorship) — no sensitive column (no password, no email exposed beyond what auth already implies) sits behind this in practice, but see Decisions Requiring Approval re: whether `email`/`phone` should be excluded from this policy's effective column set via a view. |
| `provider_profiles_select_public` | `provider_profiles` | Public provider listing pages need this by definition. |
| `service_images_select_public` / `service_availability_select_public` | both | Public catalogue browsing. |
| `reviews_select_public` | `reviews` | Public reviews are the point of the feature (Yelp-style, matches cahier des charges' review/rating intent). |
| `settings_select_public` (new) | `settings` | Contains only pricing/config values the storefront must read pre-auth to quote a price — no secrets. Confirmed no sensitive key will ever be added here without revisiting this policy. |

No policy in this schema grants `USING (true)` on a table holding private user data
(addresses, messages, orders, payments, notifications all correctly scope to ownership).
