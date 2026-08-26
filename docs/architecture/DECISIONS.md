# COIN-IDEAL Architectural Decision Records

Each entry: the decision, why (cited source), and whether it's confirmed or
inferred. Marked **"Decision not explicitly documented"** where the code
shows a pattern but no comment states the reasoning.

## Why `orders`/`payments` writes go through RPCs, not RLS-gated direct writes

**Decision**: `INSERT`/`UPDATE`/`DELETE` on `orders`, `order_items`,
`order_item_finishings`, `order_status_history`, `payments` are `REVOKE`d
from `authenticated`/`anon` entirely; all writes go through `create_order()`,
`update_order_status()`, `record_payment()`, `submit_payment_proof()`.

**Why**: RLS policies can authorize *that* a row may be written, but cannot
*recompute* a value — a policy can't validate that a submitted total
matches the real price. Money/status integrity requires a function that
independently derives the authoritative value from source-of-truth tables
(`services.price`, `finishing_options.cost`, `settings`, `delivery_zones`)
rather than trusting client input. **Confirmed**:
`supabase/migrations/00028_create_orders_payments_pricing.sql`'s own header
comment states this explicitly, and `docs/database/DATABASE_ARCHITECTURE.md`
§3.1 documents the exact vulnerability this closes (a modified client could
otherwise `POST` any `estimatedTotal` it likes).

## Why financial writes are restricted this specifically (two ledgers: `orders.payment_proof_*` vs `payments`)

**Decision**: a client's payment-proof submission
(`orders.payment_proof_path`/`payment_reference`/`payment_proof_submitted_at`,
`00061`) is kept structurally separate from the staff-confirmed `payments`
table (`record_payment()`, staff-only).

**Why**: `payments` represents money COIN-IDEAL has actually verified
received; a client's claim of having paid (a MonCash/NatCash screenshot) is
evidence to be reviewed, not a financial fact. Conflating the two would let
a client's own claim silently count as a confirmed payment. **Confirmed**:
`00061`'s own comment states this design explicitly ("This keeps the
existing payments table as the staff-confirmed ledger untouched").

## Why Storage buckets are private (`provider-documents`, `order-documents`, `payment-proofs`)

**Decision**: these three buckets default to `public = false`; only
`avatars`/`service-images` are public.

**Why**: they hold user-submitted documents (legal business documents,
files to print, payment evidence) that must never be guessable/enumerable
via a public URL. **Confirmed**: `00023`'s header comment cites the cahier
des charges directly ("Stockage privé pour les fichiers clients", "Accès
privé aux documents clients"), and `STORAGE_ARCHITECTURE.md` confirms
`getPublicUrl()` is never called on these buckets anywhere in the codebase
— only `createSignedUrl()`.

## Why `service_role` must never be exposed to the frontend

**Decision**: the key exists only inside Edge Function runtimes, is never
in `.env`/git/logs, and this project's own working sessions have
explicitly declined to request it through chat even when a task (deleting
QA test accounts) genuinely needed it, choosing instead to stop and report
the blocker or have the human perform the action manually.

**Why**: `service_role` bypasses RLS entirely — any exposure would be a
complete authorization bypass for the whole database. **Confirmed**:
stated repeatedly across this project's own operational rules (`CLAUDE.md`)
and demonstrated in practice
(`docs/phase-6/QA_TEST_ACCOUNTS_CLEANUP_REPORT.md`).

## Why the frontend does not calculate the authoritative price

**Decision**: `src/features/document-orders/utils/estimate.ts` computes a
preview only; `create_order()` recomputes independently and its result is
what's actually stored.

**Why**: same reasoning as the RPC-write decision above — a client-side
number can always be tampered with before submission; only a server-side
recomputation from source-of-truth tables is trustworthy. **Confirmed**:
`estimate.ts`'s own comments and `create_order()`'s implementation (never
reads a client-submitted total at all).

## Why Gemini uses an Edge Function, not a direct client call

**Decision**: `supabase/functions/ai-assistant/index.ts` proxies every
Gemini request; the frontend never holds `GEMINI_API_KEY`.

**Why**: any API key present in frontend code or a `VITE_`-prefixed env var
ships inside the built JS bundle, visible to anyone who opens dev tools.
**Confirmed**: README.md states this explicitly ("La clé Gemini ne doit
jamais apparaître dans .env ni dans une variable préfixée VITE_").

## Why RLS is mandatory on every table

**Decision**: all 25 tables have RLS enabled, no exceptions — including
`ai_rate_limits`, which has RLS enabled with **zero** policies (meaning
fully inaccessible except via its RPC), rather than RLS disabled.

**Why**: Supabase's PostgREST API exposes any table granted to
`anon`/`authenticated` by default; RLS is the only per-row boundary. An
un-protected table with a table-level `GRANT` would be **fully readable/
writable by anyone with the anon key** (which is, by design, public).
**Confirmed**: `00026_grant_api_roles.sql`'s own comment explains this
exact mechanic ("a project defaults to NOT exposing any table... this file
grants; RLS is what then actually restricts").

## Why migrations are immutable after deployment

**Decision**: never edit a migration once it has been applied to the
linked project; always add a new, forward-fixing migration.

**Why**: Supabase's migration history is a linear, applied-in-order ledger
— editing an already-applied file doesn't retroactively change the
database, so the file and the real schema would silently diverge, and a
fresh environment applying migrations from scratch would produce a
**different** schema than the live one. **Confirmed**: stated in
`CLAUDE.md`, and demonstrated by the project's own extensive forward-fix
history (`00042` fixes `00023`; `00051` fixes `00048`'s regression; `00059`
fixes `00006`-era's missing admin policy; `00030` explicitly
`DROP FUNCTION`s the old `create_order()` signature rather than editing
`00028` in place).

## Why role checks in RLS use `is_admin(uid)`/`is_staff(uid)`, never an inline subquery

**Decision**: every admin/staff-scoped policy calls a `SECURITY DEFINER
STABLE SQL` wrapper function.

**Why**: a documented, real production incident. `00048` (Phase 5F.1
security hardening) revoked `anon`'s column-level access to
`profiles.role` — correct in isolation, but it broke every RLS policy
elsewhere that inlined `EXISTS (SELECT ... profiles.role = 'admin')`
directly, because Postgres evaluates every permissive policy's condition
regardless of short-circuit `OR`, and an anonymous request touching that
column access now hard-errored instead of evaluating to false. This broke
the public storefront and the anonymous contact form. `00051` fixed every
instance by switching to the wrapper function, which encapsulates the
column access inside its own `SECURITY DEFINER` context. **Confirmed**:
`00051`'s own extensive header comment documents the incident and fix in
detail.

## Why COIN-IDEAL's schema still looks like a multi-provider marketplace

**Decision**: `provider_profiles`/`service_requests`/`bookings`/
`message_threads` were kept, not removed, when the project was repositioned
from a generic marketplace template to the single-business COIN-IDEAL
product.

**Why**: the cahier des charges (§17) explicitly anticipates COIN-IDEAL
becoming multi-provider in the future; ripping out a schema that already
supports that would mean rebuilding it later. Today, in practice, there is
effectively one real `provider_profiles` row (the business itself) plus a
purpose-built `orders`/`payments` core added specifically for the print/
copy transactional flow the cahier des charges actually describes.
**Confirmed**: `docs/database/DATABASE_ARCHITECTURE.md` §1 states this
explicitly, cross-checked against the real git history
(`5018d6c "feat: reposition frontend as COIN-IDEAL"`).

## Why provider signup requires admin approval before public visibility

**Decision**: `provider_profiles.is_verified` gates `services_select_active`
(`00058`) — a new provider can configure everything immediately, but their
services aren't publicly visible until an admin verifies them.

**Why**: an explicit operator request (not derived from the cahier des
charges), to prevent unvetted providers from appearing on the public
storefront immediately upon self-registration. **Confirmed**:
`docs/phase-5/PROVIDER_SIGNUP_APPROVAL_REPORT.md` documents this as a
direct instruction, and the fact that `is_verified` existed since `00006`
purely as a cosmetic "Vérifié" badge before this change (it gated nothing
until `00058`).

## Why signup goes through an Edge Function (`register`) instead of `supabase.auth.signUp()`

**Decision**: `src/features/auth/services/auth.service.ts`'s `signUp()`
calls the `register` Edge Function (`auth.admin.createUser({email_confirm:
true})`), then signs in immediately, rather than calling
`supabase.auth.signUp()` directly.

**Why**: the project's default email-confirmation flow was hitting a
2-emails/hour Supabase rate limit during normal use/testing (`429
over_email_send_rate_limit`). The alternative — raising the limit or fixing
`config.toml`'s email settings globally via `supabase config push` — was
rejected because that file's `site_url`/`additional_redirect_urls` are
misaligned local-scaffold placeholders (`http://127.0.0.1:3000`) that would
have overwritten the real project's OAuth/redirect configuration if pushed
as-is. **Confirmed**: `docs/phase-5/PROVIDER_SIGNUP_APPROVAL_REPORT.md` and
the `register` Edge Function's own header comment.

## Why the Gemini chat widget is restricted to authenticated users

**Decision**: `ChatWidget` doesn't render for `!isAuthenticated`, and the
Edge Function itself also rejects anonymous callers.

**Why**: an explicit, later operator instruction — **this is a scope
change from the original cahier des charges**, which listed the assistant
as part of the public site (§7). The stated reason: anonymous visitors
would otherwise consume Gemini API quota/cost using only the public anon
key, with no accountability. **Confirmed**:
`docs/phase-5/BATCH_FIX_ADMIN_ROLES_CHAT_REPORT.md` states this explicitly
as an operator-requested scope change, and notes the server-side rejection
was necessary specifically because hiding the widget alone wouldn't stop a
direct API call using the (necessarily public) anon key.

## Why idle timeout is admin/provider only, not client

**Decision**: `useIdleTimeout` is only activated for
`variant === "admin" || variant === "provider"` in `DashboardLayout`.

**Why**: explicit operator instruction (`docs/phase-6/IMPLEMENTATION_PLAN.md`
§2: "CLIENT: DO NOT change client session behavior unless the cahier des
charges or existing security architecture requires it"). **Confirmed**,
directly stated in the originating brief.

## Why the PIN elevation marker lives in `sessionStorage`, not a server-side "elevated session" token

**Decision**: successful `verify_pin()` sets a client-side timestamp
(`sessionStorage`, 20-minute lifetime) rather than issuing a signed,
server-verifiable elevation token checked on every subsequent request.

**Why**: the PIN is explicitly a step-up **UX** control against a
shared/unattended device, not a replacement for Supabase Auth or RLS as the
actual data-authorization boundary — the real security-relevant operation
(the hash comparison and lockout) already happens entirely server-side in
`verify_pin()`, which the client cannot influence. Building a second,
parallel server-verified session token would add real complexity
(propagating it through every subsequent RPC call) for a threat model
(bypassing a client-side re-prompt) that grants no additional data access
even today, since RLS is unaffected by this marker either way. **Decision
not exhaustively documented as a trade-off analysis anywhere** — reasoning
reconstructed from `docs/phase-6/IMPLEMENTATION_PLAN.md`'s and
`use-pin.ts`'s own comments, which state the boundary but don't enumerate
alternatives considered.

## Why `payment-proofs` is a separate bucket from `order-documents`

**Decision**: a new bucket (`00062`) rather than reusing the existing
private `order-documents` bucket for payment-proof uploads.

**Why**: different lifecycle/retention — `order-documents`' retention
setting (`settings.order_document_retention_days`) is about the file to be
printed, not payment evidence, which may need to be retained differently
(e.g. for longer, for dispute resolution). Reusing the bucket would
conflate two concepts with different real-world handling requirements.
**Confirmed**: `00062`'s own header comment states this explicitly.

## Areas where a decision is needed but not yet made (explicitly flagged, not silently resolved)

- **Admin visibility into addresses/favorites/private messages beyond
  what's already exposed via staff-read policies.** `docs/database/RLS_MATRIX.md`
  raised this as an open question before `orders` even existed; it remains
  open — no `*_admin_all` policy exists on `favorites`, `message_threads`,
  `messages`, `bookings`, or `service_requests` today (only `addresses` got
  a **staff**-read policy, `00063`, scoped to `is_staff()` not `is_admin()`
  specifically, for the narrower reason of fulfilling a delivery — not a
  general admin-moderation capability).
- **Multi-provider RLS scoping.** `orders_select_staff`/`payments_select_staff`/
  `addresses_staff_select` grant **unscoped** access to all staff — a
  deliberate "single business, one staff pool" simplification (see
  `docs/architecture/PROJECT_ARCHITECTURE.md` §3, Provider role). If
  COIN-IDEAL becomes genuinely multi-provider, these would need scoping to
  "orders assigned to this provider," which is not built and would be a
  **CRITICAL**-risk schema/RLS change (see `docs/architecture/CHANGE_IMPACT_MATRIX.md`).
- **`src/types/index.ts` vs. `src/types/database.ts`** — which is
  authoritative for which entity is not documented anywhere; see
  `docs/architecture/ARCHITECTURE_DOCUMENTATION_REPORT.md`.
