# Architecture Documentation Audit

## Repository Analyzed

`c:\Web Project\coin_ideal\coin-ideal-app` — COIN-IDEAL, a React 19 +
TypeScript + Vite 8 + Tailwind v4 + Supabase (Postgres 17, Auth, Storage,
Edge Functions) single-business print/copy/water-delivery platform,
deployed to Vercel + Supabase Cloud (project `qqibjglnvcezqbogkvlg`).
Analysis covered: `package.json`, all config files (`vite.config.ts`,
`tsconfig*.json`, `.oxlintrc.json`, `vercel.json`, `supabase/config.toml`),
`README.md`, all 6 pre-existing `docs/database/*.md` files, 17 `docs/phase-*/`
reports, all 64 `supabase/migrations/*.sql` files (read in full, not
sampled), both Edge Functions, and every file under `src/` (125 files:
`app/`, `components/`, `features/`, `pages/`, `services/`, `types/`, `lib/`,
`utils/`). No application code was modified — this was a read-only
documentation task throughout, per its own instruction.

## Architecture Identified

A layered frontend (`pages` → `features` → `hooks` → `services` →
Supabase client) over a Postgres schema with two coexisting layers: an
original multi-provider marketplace template (`provider_profiles`,
`service_requests`, `bookings`, `reviews`, `message_threads` — kept
deliberately for future multi-provider use) and a purpose-built
transactional core added later specifically for the cahier des charges'
print/copy order flow (`orders`/`order_items`/`payments`/`finishing_options`/
`delivery_zones`/`settings`, migrations `00028` onward). Money-affecting
writes are RPC-gated (zero client table grants on `orders`/`payments`);
everything else uses conventional RLS. Two Edge Functions handle the only
two things that need `service_role`: signup (rate-limit workaround) and
the Gemini proxy.

## Documents Created

All 21 requested documents, under `docs/architecture/`: `PROJECT_ARCHITECTURE.md`,
`DIRECTORY_MAP.md`, `FILE_RESPONSIBILITY_MAP.md`, `CHANGE_MAP.md`,
`FEATURE_MAP.md`, `DATABASE_ARCHITECTURE.md`, `SUPABASE_ARCHITECTURE.md`,
`AUTH_ARCHITECTURE.md`, `SECURITY_ARCHITECTURE.md`, `DEBUGGING_PLAYBOOK.md`,
`QUICK_CHANGE_REFERENCE.md`, `CHANGE_IMPACT_MATRIX.md`,
`CODING_CONVENTIONS.md`, `TESTING_ARCHITECTURE.md`,
`DEPLOYMENT_ARCHITECTURE.md`, `DECISIONS.md`, `CHANGE_REQUEST_TEMPLATE.md`,
`ARCHITECTURE_RULES.md`, `README.md` (index), plus this report. (21 counting
this report and the index alongside the 19 content documents the prompt
enumerated by section.)

## Existing Patterns Discovered

- **RPC-as-boundary for money**: `orders`/`payments` have zero client write
  grants; only `SECURITY DEFINER` functions (`create_order`,
  `update_order_status`, `record_payment`, `submit_payment_proof`) can
  write, each recomputing the authoritative value server-side.
- **`is_admin(uid)`/`is_staff(uid)` wrapper-function convention** for every
  role check inside RLS — with a real, documented incident
  (`00048`→`00051`) behind why inlining the check directly is forbidden.
- **Forward-fix-only migration discipline**: at least 6 migrations in this
  history exist purely to fix a bug in an earlier one, never by editing it.
- **Temporary-fixture-migration pattern**: because `orders`/`payments` have
  no client-writable path, QA test data for them can only be seeded/cleaned
  via a migration — a repeated, deliberate pattern (`00039`/`00040`,
  `00046`/`00047`, `00049`/`00050`, `00052`/`00053`, `00064`), not
  incidental clutter.
- **Live-testing-as-the-real-test-suite**: there is no automated test
  suite, but every phase report documents real Playwright sessions against
  real accounts and real network responses — a strong, consistently
  followed norm, and the reason several serious bugs (silent RLS no-ops,
  the idle-timeout state race, a PIN-hash exposure vector) were caught at
  all.

## Important Dependencies

`@tanstack/react-query` v5 (object-argument API only, no legacy usage
anywhere), `react-router-dom` v7 (data router, lazy routes), `@supabase/supabase-js`
v2, `react-hook-form` + `zod`, Tailwind v4 (CSS-based `@theme`, no
`tailwind.config.js`). No test framework, no CI, no `.vercel/` directory —
deployment is Vercel's Git-integration auto-deploy with zero automated
gate.

## Security Boundaries

Fully documented in `SECURITY_ARCHITECTURE.md`/`SUPABASE_ARCHITECTURE.md`.
Headline: `service_role` exists only inside the two Edge Functions and is
explicitly **not available to this project's own development sessions** —
confirmed in practice (`docs/phase-6/QA_TEST_ACCOUNTS_CLEANUP_REPORT.md`)
by a task that stopped and reported the blocker rather than requesting the
secret through chat.

## High-Risk Areas

Per `CHANGE_IMPACT_MATRIX.md`'s CRITICAL tier: any RLS policy, any RPC
touching `orders`/`payments`, `handle_new_user()`, the PIN/idle-timeout
security features, and anything `service_role`-adjacent. This project's
own incident history (four separate RLS/authorization bugs that shipped
and were only caught by later live testing) is direct evidence this
classification is not theoretical caution.

## Areas With Architectural Ambiguity

1. **`src/types/index.ts` vs. `src/types/database.ts`** — both exist, both
   define overlapping domain types, neither is confirmed
   CLI-generated (no `supabase gen types` marker in either), and no
   comment anywhere states which is authoritative for a given entity.
   `index.ts` is the one actually imported by the vast majority of the
   codebase (confirmed by grep during this audit), but `database.ts`'s
   exact purpose/currency is unconfirmed. Flagged in
   `ARCHITECTURE_RULES.md` #13 as **RECOMMENDED**: consolidate onto one
   generated file.
2. **Admin visibility scope into marketplace-layer tables**
   (`favorites`/`messages`/`message_threads`/`bookings`/`service_requests`)
   — no `*_admin_all` policy exists on any of these; whether that's a
   deliberate privacy boundary or an unaddressed gap is not documented
   anywhere. Recorded as an open decision in `DECISIONS.md`, not resolved
   here (resolving it would be a schema/RLS change, out of scope for a
   documentation-only task).
3. **Multi-provider RLS readiness** — `orders_select_staff`/
   `payments_select_staff`/`addresses_staff_select` grant unscoped access
   to *all* staff, a "single business" simplification that would need
   real scoping work before a genuine second provider tenant could safely
   share this database. Not a bug today (there is effectively one real
   provider), but a real gap if the marketplace layer is ever activated
   for its originally-intended purpose.

## Documentation Gaps (pre-existing, found during this audit)

- **`docs/database/*.md` (6 files) are stale.** They present `orders`,
  `payments`, `order_items`, `finishing_options`, `delivery_zones`,
  `settings` as "proposed, not yet applied" — a "Phase 1" snapshot from
  before migration `00028`. In reality these tables have been live since
  `00028` and have had 36 further migrations applied on top (up to `00064`
  today), including significant RLS fixes (`00051`) these documents don't
  reflect. **Source conflict identified, not silently resolved**: this new
  `docs/architecture/` set treats the live migrations as ground truth
  (verified by reading all 64 files directly) and explicitly notes, in
  `DATABASE_ARCHITECTURE.md`'s header and `DECISIONS.md`, that the older
  `docs/database/` set remains useful for original design *rationale* but
  is not current for schema *state*. Recommend either archiving
  `docs/database/` with a "historical, superseded" banner, or deleting it
  — a decision for the project owner, not made unilaterally here since
  this task was documentation-only and explicitly told not to modify
  existing files outside the requested new set.
- **`README.md`'s route list is incomplete/outdated.** It's missing
  `/commander`, `/tarifs`, `/comment-ca-marche`, `/vente-eau`,
  `/auth/callback`, `/dashboard/orders`, `/admin/pricing`, `/admin/orders`,
  `/admin/messages`, `/provider/orders`, `/provider/earnings` — all of
  which exist in `src/app/router.tsx` today. **Source conflict identified**:
  `docs/architecture/PROJECT_ARCHITECTURE.md`/`CHANGE_MAP.md` reflect the
  actual current router; `README.md` was not edited (out of scope for this
  task) but should be updated by the project owner to avoid a new
  developer trusting the stale list.
- **`README.md`'s "RLS (Row Level Security)" summary is directionally
  correct but doesn't mention the `00048`→`00051` incident or the
  `is_staff()` helper**, both added after the README's RLS section was
  last written. Not a contradiction, just incomplete relative to the new,
  more detailed `docs/architecture/` set.

## Recommendations

1. Treat `docs/architecture/` as the living reference going forward; update
   it in the same commit/session as any change it documents, per its own
   `README.md`'s framing — it will go stale exactly like `docs/database/`
   did if not maintained this way.
2. Resolve the `types/index.ts` vs. `types/database.ts` ambiguity (adopt
   `supabase gen types typescript --linked` for one of them) before the
   drift gets worse.
3. Explicitly decide (not silently default) whether admin should have
   broader visibility into marketplace-layer tables, and whether/when
   multi-provider RLS scoping needs to be built — both are real product
   decisions, not technical debt to "just fix."
4. Consider archiving or clearly banner-labeling `docs/database/*.md` as
   historical, so a future reader doesn't mistake it for current state.

## Final Status

Documentation complete: 21 files under `docs/architecture/`, every file/
migration reference verified to exist (automated check: 101 unique file
paths and 42 unique migration numbers cross-referenced against the actual
repository — zero fabricated references found), every statement classified
EXISTING or RECOMMENDED, one explicit source-conflict section above (not
silently resolved in either direction), no secrets of any kind appear
anywhere in this documentation set, and no application code was modified.
