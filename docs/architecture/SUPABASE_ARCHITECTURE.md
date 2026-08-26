# COIN-IDEAL Supabase Architecture

## Components (EXISTING)

- **Client**: `src/services/supabase/client.ts` — one `createClient(url,
  anonKey)` call, no custom options (defaults: `persistSession: true`,
  `autoRefreshToken: true`, `detectSessionInUrl: true`). Never instantiate a
  second client.
- **Auth (GoTrue)**: email/password + Google OAuth. Session persisted in
  `localStorage` by the client default. `jwt_expiry = 3600` (1h access
  token, silently auto-refreshed). See
  `docs/architecture/AUTH_ARCHITECTURE.md`.
- **PostgreSQL 17**: 25 tables, RLS on every one. See
  `docs/architecture/DATABASE_ARCHITECTURE.md`.
- **RLS**: row-level policies plus, in one case (`profiles`, `00048`), a
  narrower column-level `GRANT` on top of a permissive row policy — two
  independent layers that both apply.
- **RPCs**: `SECURITY DEFINER` functions — the only path for money-affecting
  writes and for anything requiring a check RLS alone can't express
  cleanly (rate limiting, PIN hashing/lockout).
- **Triggers**: 15 total — auto-profile-creation, `updated_at`
  maintenance, rating aggregation, role-change/status-change guards,
  order-status notifications. Full list in
  `docs/architecture/DATABASE_ARCHITECTURE.md`.
- **Storage**: 5 buckets, 2 public (display images) / 3 private (documents,
  proofs), signed URLs only for private ones.
- **Edge Functions**: `ai-assistant`, `register` — Deno, service-role
  access, the only place that secret is ever used.
- **Migrations**: `supabase/migrations/`, sequential, immutable once
  applied.
- **Seed**: `supabase/seed.sql` — local-only (`supabase db reset`/`start`),
  never runs on `db push`.
- **Generated types**: **none** — `src/types/database.ts`/`index.ts` are
  hand-maintained; no `supabase gen types` marker found in either file
  (flagged as a gap, see `docs/architecture/ARCHITECTURE_RULES.md` #13).

## Decision guide: frontend service vs. RPC vs. Edge Function vs. direct query vs. Storage API

| Need | Use | Why |
|---|---|---|
| Read a table your RLS role can already see | Direct query via a `src/services/*.service.ts` method (`.from(table).select()`) | Simplest, RLS is the boundary, no extra layer needed. Every read in this codebase works this way. |
| Write to a table with normal owner-scoped RLS (`addresses`, `favorites`, `service_requests`, `reviews`, `services` as its owner, etc.) | Direct `.insert()`/`.update()`/`.delete()` via a service, same as reads | RLS `WITH CHECK`/`USING` already enforces ownership; no server-side computation needed. |
| Write that must recompute or validate something the client cannot be trusted to supply correctly (an order's total, a status transition, a payment record, a PIN hash/lockout counter) | **RPC** (`SECURITY DEFINER` Postgres function) | The function runs with elevated privilege but a narrow, audited surface — it recomputes the authoritative value itself rather than trusting a client-submitted one. This is why `orders`/`payments` have zero client grants at all: a policy alone can authorize a write, but it can't *recompute a price* — only a function body can. |
| Something requiring a secret that must never reach the browser (Gemini API key, `auth.admin.*` calls, creating a user with `email_confirm: true`) | **Edge Function** | RPCs run inside Postgres and can't call an external HTTP API or use `SUPABASE_SERVICE_ROLE_KEY`-gated Admin Auth endpoints; Edge Functions can, and are the only place that key is ever available. |
| Uploading/reading a file | **Storage API** (`supabase.storage.from(bucket)`) directly from a service, RLS on `storage.objects` (path-based ownership) is the boundary; private buckets are read via `createSignedUrl()`, never `getPublicUrl()`. | Storage has its own RLS system (policies on `storage.objects`, matched by `bucket_id` + `(storage.foldername(name))[1]`), separate from table RLS but following the identical `is_admin()`/`is_staff()` helper pattern for staff-read policies. |
| A write that must bypass RLS entirely (e.g. deleting a Storage object owned by a different, already-deleted user) | Edge Function or manual Dashboard action with `service_role`, **never** a frontend call | Same secret-boundary reason as above — see `docs/phase-6/QA_TEST_ACCOUNTS_CLEANUP_REPORT.md` for a worked example of exactly this situation and how it was handled (blocked pending the key, not routed around). |

## Security boundaries (summary — full detail in `SECURITY_ARCHITECTURE.md`)

- **`anon`/`authenticated` keys are the only credentials ever in the
  browser.** Both are safe to expose (RLS-scoped by design) — `.env`,
  `.env.example`, Vercel env vars only ever contain
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`.
- **`service_role` never leaves the Supabase Edge Function runtime**, where
  it's injected automatically as `SUPABASE_SERVICE_ROLE_KEY` — never set
  manually, never logged, never in git.
- **RLS is the real authorization boundary**, not the frontend router guard
  (`DashboardLayout`'s role check) — see
  `docs/architecture/ARCHITECTURE_RULES.md` rule 9.
- **Role-check logic must go through `is_admin(uid)`/`is_staff(uid)`**, not
  an inline subquery — see `docs/architecture/DECISIONS.md` for the
  `00048`→`00051` incident this rule comes from.

## `supabase/config.toml` caveat (important, repeated from `DEPLOYMENT_ARCHITECTURE.md`)

This file configures the **local** stack only. Its `[auth]` `site_url`/
`additional_redirect_urls` were never aligned with the real remote
project's settings — running `supabase config push` as-is would overwrite
production OAuth/redirect configuration with local placeholder values.
**Never run it without first fixing those values.**
