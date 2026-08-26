# COIN-IDEAL Security Architecture

For every sensitive feature: **frontend protection** (UX, not a real
boundary) + **server/database protection** (the actual boundary).

## Row Level Security (RLS)

**EXISTING.** Enabled on all 25 tables. Two established, hard-learned
conventions:

1. **Role checks inside a policy must go through `is_admin(uid)`/
   `is_staff(uid)`** (`SECURITY DEFINER STABLE SQL`, `00021`/`00051`),
   never an inline `EXISTS (SELECT ... profiles.role = ...)` subquery. Real
   incident behind this rule: `00048` revoked `anon`'s column-level access
   to `profiles.role` (a genuine hardening), which caused every inline
   `EXISTS`-based admin/staff check elsewhere to **hard-error for anonymous
   requests** instead of evaluating false — breaking the public storefront
   and the public contact form. `00051` fixed this everywhere by switching
   to the wrapper functions, which evaluate cleanly regardless of caller
   privilege. **Do not reintroduce an inline role-subquery in a policy.**
2. **Money-affecting writes have zero client grants.** `orders`/`order_items`/
   `order_item_finishings`/`order_status_history`/`payments` have
   `INSERT`/`UPDATE`/`DELETE` `REVOKE`d from `authenticated`/`anon`
   outright (`00028`) — RLS policies on these tables only ever grant
   `SELECT`. The only way to write is a `SECURITY DEFINER` RPC that
   recomputes the value itself.

## Authentication

Frontend: Supabase Auth session via `@supabase/supabase-js` defaults
(`persistSession`, `autoRefreshToken`). Server: GoTrue validates every
request's JWT; `handle_new_user()` trigger is the only path that creates a
`profiles` row, and it whitelists `role` to `'provider'` or `'client'`
only — an admin account can never be created through the public signup API.
See `docs/architecture/AUTH_ARCHITECTURE.md`.

## Authorization / role escalation protection

- **Frontend**: `DashboardLayout`'s role check prevents the wrong dashboard
  shell from rendering — **UX only**.
- **Database**: `trg_profiles_role_guard` (`00027`) blocks any non-admin
  `UPDATE` that changes `profiles.role`, regardless of which RLS policy let
  the `UPDATE` statement through in the first place. This closed a real,
  previously-exploitable gap: before `00027`, `profiles_update_own`'s
  `USING (auth.uid() = id)` authorized the *row*, not the *columns* — any
  authenticated user could run `.from('profiles').update({role:'admin'})
  .eq('id', <own id>)` directly and succeed.
- **`suspendUser()`/`verifyProvider()` (admin actions)**: both were
  **silently non-functional** before their respective admin-all policies
  existed (`profiles_admin_all` `00027`; `provider_profiles_admin_all`
  `00059`) — an `UPDATE` that matches 0 rows under RLS returns success with
  no error from PostgREST, which is why these bugs went undetected until
  live testing specifically checked the *result*, not just the API
  response. **Lesson embedded in this architecture**: never assume an
  admin write "works" because it didn't throw.

## Storage policies

Path-based ownership: `(storage.foldername(name))[1] = auth.uid()::text`
on every private bucket (`provider-documents`, `order-documents`,
`payment-proofs`), plus a staff-read policy via `is_staff()`. Public
buckets (`avatars`, `service-images`) allow public `SELECT`, owner-only
write. `service-images`' write policy was fixed in `00042` after a bug
(the real owner's own uploads were rejected — see
`docs/architecture/DEBUGGING_PLAYBOOK.md`) using a new `is_own_service()`
helper, because the equivalent inline join silently never matched inside
`storage.objects`'s own RLS evaluation context.

**Never `getPublicUrl()` on a private bucket** — confirmed, by reading
`uploads.service.ts`, that this never happens anywhere in the codebase;
private files are always read via `createSignedUrl()` with a short
(typically 300s) expiry.

## Service-role boundary

`SUPABASE_SERVICE_ROLE_KEY` is used in exactly one place in this codebase:
`supabase/functions/register/index.ts` (via `auth.admin.createUser()`). It
is:
- Never in `.env`, `.env.example`, or any `VITE_`-prefixed variable.
- Never in frontend code, git history, or logs.
- Available to Edge Functions automatically (platform-injected), never
  manually configured.
- **Not available to this project's own development/AI-assisted sessions**
  by design — when a task required it (e.g. deleting Auth users, deleting
  another user's Storage objects), the established, followed practice
  (`docs/phase-6/QA_TEST_ACCOUNTS_CLEANUP_REPORT.md`) was to **stop and
  report it as unavailable**, never to request it through chat, and never
  to work around its absence by inventing a less-secure path.

## Edge Function security

- **`ai-assistant`**: CORS restricted via `ALLOWED_ORIGINS` secret (a
  comma-separated allow-list including the production Vercel domain and
  local dev origins); rate-limited via `check_ai_rate_limit()` backed by
  the durable (not in-memory) `ai_rate_limits` table, so limits survive
  cold starts/multiple instances; **rejects anonymous callers at the
  application layer** — restricted to authenticated users only per an
  explicit, later scope change from the original cahier des charges
  (which listed the assistant as public). The Gemini API key is never
  passed to or through the client.
- **`register`**: uses `service_role` to create a pre-confirmed user;
  validates `role` against the same whitelist as `handle_new_user()`
  (defense in depth — even if this function's own check were somehow
  bypassed, the trigger would still refuse a non-`'provider'` role); CORS
  via the same `ALLOWED_ORIGINS` secret.

## Rate limiting

Only the `ai-assistant` function is rate-limited today (10 req/min per
user/IP, `check_ai_rate_limit()`, `00032`). No rate limiting exists on
Auth endpoints beyond Supabase's own built-in defaults (`config.toml`
`[auth.rate_limit]`, e.g. `sign_in_sign_ups = 30` per 5 minutes — a
platform default, not custom to this app) or on any other RPC.

## Payment protection

- **Client can never set an order's total, subtotal, or delivery fee** —
  `create_order()` computes all three server-side from `services.price`/
  `finishing_options.cost`/`settings`/`delivery_zones`, ignoring any
  client-sent amount.
- **Client can never mark a payment "confirmed"** — `record_payment()` is
  staff-only; a client's `submit_payment_proof()` call only ever writes to
  `orders.payment_proof_*` (an unverified claim), never to `payments`. The
  two tables are deliberately kept separate for exactly this reason — see
  `docs/architecture/DECISIONS.md`.
- **`submit_payment_proof()` validates the payment method server-side**
  (only `moncash`/`natcash` orders may submit a proof) and ownership
  (`orders.client_id = auth.uid()`) — a crafted request for someone else's
  order, or for a cash/transfer order, is rejected inside the function,
  not just hidden by the UI.

## Private documents / payment proofs

Three private buckets, each owner-scoped + staff-read (see Storage
policies above). `payment-proofs` is deliberately **separate** from
`order-documents` (different retention/lifecycle — the print document vs.
payment evidence) rather than reusing the existing bucket, per
`00062`'s own comment.

## Session security (idle timeout + PIN) — full detail in `AUTH_ARCHITECTURE.md`

Summary: 1-hour idle timeout (admin/provider only) that calls real
`signOut()` (server-side revocation, not a UI facade); 6-digit PIN
step-up, hashed with `crypt()`/`gen_salt('bf')` (bcrypt) server-side,
5-attempt lockout (15 min), verified exclusively through `verify_pin()` —
the client can never itself decide `ok = true`. The `sessionStorage`
elevation marker is a UX convenience only; editing it client-side cannot
grant any RLS-gated data beyond what the account's real role already
permits (verified in the Phase 6 threat-model pass).

## Secrets — complete inventory

| Secret | Where it lives | Ever in frontend/git? |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env`, Vercel env | Yes — by design, safe |
| `VITE_SUPABASE_ANON_KEY` | `.env`, Vercel env | Yes — by design, safe (RLS-scoped) |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function runtime (platform-injected) | **Never** |
| `GEMINI_API_KEY` | Edge Function secret | **Never** |
| `ALLOWED_ORIGINS` | Edge Function secret | Never (server-side config, not a secret value per se, but managed the same way) |
| PIN (user-chosen 6 digits) | `profiles.pin_hash` (bcrypt) only | **Never plaintext, anywhere, ever** |
| QA test-account passwords (`*.test` domain, throwaway fixtures) | Committed in some `scripts/*.mjs` files | Yes, deliberately — these are disposable, non-production accounts; distinguished explicitly from real secrets in this project's own working practice |
