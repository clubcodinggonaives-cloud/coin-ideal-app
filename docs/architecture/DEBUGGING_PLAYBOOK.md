# COIN-IDEAL Debugging Playbook

Every entry marked "**Real incident**" actually happened in this project's
history and is cited; entries without that marker are general guidance for
this stack, not yet-observed-here problems.

## React

### `useContext` returns null / "Cannot read properties of null (reading 'useContext')"
**Real incident** — `docs/phase-5/REACT_QUERY_RUNTIME_ERROR_REPORT.md`.
- **SYMPTOM**: crash inside a `useMutation`/`useQuery` call, deep in
  `@tanstack/react-query`'s internals, on a specific (often not-yet-visited)
  page.
- **LIKELY CAUSE**: *not* a broken provider hierarchy in this codebase
  (verified correct — `Providers` wraps `RouterProvider` fully in
  `src/App.tsx`). The actual root cause found here was a narrow, timing-
  dependent Vite dev-server dependency-optimizer race affecting a
  not-yet-loaded lazy route chunk — structurally impossible in a production
  build (no dev-server optimizer exists there).
- **FILES TO INSPECT**: `src/App.tsx`, `src/app/providers.tsx`, the
  specific page/hook in the stack trace.
- **COMMANDS TO RUN**: hard refresh; if it persists, `rm -rf
  node_modules/.vite` and restart `npm run dev`.
- **HOW TO CONFIRM**: reproduce with a cold dev-server start (cache
  cleared) — if it doesn't reproduce cold, it's the dev-only race, not a
  code bug.
- **SAFE FIX LOCATION**: do not "fix" by restructuring the provider tree
  unless you've actually confirmed it's broken (check `App.tsx` first).
  The permanent, low-risk fix already applied here:
  `src/components/error-boundary.tsx`'s `RouteErrorBoundary`, wired as
  `errorElement` on every top-level route, turns any recurrence into a
  clean fallback (with a narrow, dev-only auto-reload for this exact
  signature) instead of a raw crash.
- **REGRESSION TEST**: load every React-Query-using page cold and via full
  HMR navigation; confirm the production build shows zero such errors.

### Invalid hook call
- **LIKELY CAUSE**: a hook called conditionally, in a loop, or outside a
  component/hook function body. `.oxlintrc.json`'s `react/rules-of-hooks:
  error` should catch most of these at lint time — if it didn't, check
  whether the violation is inside a callback passed to something oxlint
  doesn't trace into.
- **FILES TO INSPECT**: the component in the stack trace.
- **COMMANDS**: `npx oxlint` (should already fail on this).
- **CONFIRM**: read the component top-to-bottom for early returns before a
  hook call.

### Duplicate React instance
- **LIKELY CAUSE**: (not currently present in this project — verified via
  `npm ls react react-dom` showing a single deduped `19.2.8` throughout,
  see `docs/phase-5/REACT_QUERY_RUNTIME_ERROR_REPORT.md`). Would arise from
  a new dependency bundling its own React copy, or a monorepo/npm-link
  setup.
- **COMMANDS**: `npm ls react react-dom`; look for more than one non-
  "deduped" entry.
- **SAFE FIX**: a Vite `resolve.dedupe: ['react','react-dom']` alias — only
  add this with evidence a duplicate actually exists; don't add
  speculatively.

### Provider missing
- **FILES TO INSPECT**: `src/App.tsx` (order: `AppErrorBoundary` →
  `Providers` → `RouterProvider`), `src/app/providers.tsx`.
- **CONFIRM**: the component needing the provider is rendered somewhere
  under `RouterProvider`'s tree (every route is, by construction — check
  `src/app/router.tsx` for a route that might bypass the standard layouts).

### Component crash (uncaught render error)
- **SAFE FIX LOCATION**: this is exactly what `AppErrorBoundary` (root) and
  `RouteErrorBoundary` (per top-level route branch,
  `src/app/router.tsx`'s `errorElement`) exist for. If a crash shows
  React Router's raw default page instead of the custom fallback, the
  route that crashed is missing an `errorElement` — check it inherits one
  from an ancestor route object.

## React Query

### "No QueryClient set"
- **LIKELY CAUSE**: a hook using `useQuery`/`useMutation`/`useQueryClient`
  rendered outside `<Providers>`. Structurally shouldn't happen here (see
  above) — if it does, it's a new route or portal rendered outside
  `RouterProvider`'s tree.
- **FILES**: `src/app/providers.tsx`, the offending component's render
  path.

### Infinite loading
- **LIKELY CAUSE**: a query's `enabled` condition never becomes true (e.g.
  `useUserAddresses(user?.id ?? "")` — check the hook requires a non-empty
  id), or the underlying RLS SELECT silently returns 0 rows forever without
  erroring.
- **FILES**: the specific `use-*.ts` hook, its `enabled` flag.
- **CONFIRM**: check the Network tab for the actual REST/RPC call — does it
  return, and with what?

### Mutation errors not surfacing
- **LIKELY CAUSE**: an RPC's `RAISE EXCEPTION` message isn't being
  extracted from the Supabase error object correctly, or a generic fallback
  message is swallowing it. See `auth.service.ts`'s `signUp()` for the
  established pattern of extracting a specific server message from an Edge
  Function error vs. falling back to a generic French message.
- **FILES**: the calling `use-*.ts` hook's `onError`, the page's error
  display.

### Stale cache after a mutation
- **LIKELY CAUSE**: missing or mis-scoped `queryClient.invalidateQueries({
  queryKey: [...] })` in the mutation's `onSuccess`. Check the query key
  used by the read matches exactly (including any parameterized part, e.g.
  `["addresses", userId]`).
- **FILES**: the `use-*.ts` hook defining both the query and the mutation.

### Failed queries (silent)
- **CONFIRM**: `isError`/`error` state actually rendered somewhere (most
  pages use `ErrorState` — check it's present, not just the loading/success
  branches).

## Supabase

### 401 Unauthorized
- **LIKELY CAUSE**: no session (anon request to something requiring auth),
  or an expired/invalid JWT not yet refreshed.
- **CONFIRM**: check `supabase.auth.getSession()` client-side; check the
  request's `Authorization` header in Network tab.

### 403 / RLS violation ("new row violates row-level security policy")
**Real incident (multiple)** — `service_images` uploads (`00042`),
`contact_messages` inserts (`00035`).
- **LIKELY CAUSE**: the operation doesn't match any policy's `USING`/
  `WITH CHECK` for the caller's actual role — often because the *table
  grant* itself is missing (not just the policy), or because the policy's
  ownership join doesn't resolve the way you'd expect (e.g.
  `services.provider_id` references `provider_profiles.id`, **not**
  `auth.uid()` or `profiles.id` directly — a very common source of "should
  work but doesn't" in this schema).
- **FILES TO INSPECT**: the relevant `supabase/migrations/00020_create_rls_policies.sql`
  or the table-specific migration, `docs/architecture/DATABASE_ARCHITECTURE.md`
  for the current policy.
- **COMMANDS**: reproduce with a real authenticated session (not the
  service-role key, which would mask the issue by bypassing RLS entirely).
- **HOW TO CONFIRM**: query the same condition manually as that user to see
  whether the `EXISTS`/ownership join actually matches.
- **SAFE FIX LOCATION**: a new migration with a corrected policy (see
  `00042`'s `is_own_service()` helper as the pattern for "the inline join
  doesn't work inside `storage.objects`' RLS context, wrap it in a
  function instead").

### Admin/staff write "succeeds" but nothing changes (silent no-op)
**Real incident (twice)** — `suspendUser()`/role changes before `00027`;
`verifyProvider()` before `00059`.
- **SYMPTOM**: no error thrown, but the target row is unchanged.
- **LIKELY CAUSE**: an `UPDATE`/`DELETE` whose `WHERE` clause matches 0 rows
  under RLS returns success with an empty result set — PostgREST does not
  error on this. This is the single most dangerous silent-failure pattern
  in this codebase.
- **HOW TO CONFIRM**: **always re-query the target row after a write to
  confirm the change actually happened** — this project's own established
  practice (see every phase report's "Vérification réelle" section) never
  trusts a write's lack of error as proof of success.
- **SAFE FIX LOCATION**: add the missing `_admin_all`/staff policy in a new
  migration.

### Missing table / "relation does not exist"
- **LIKELY CAUSE**: migration not yet applied to the target environment
  (local vs. linked project mismatch), or `search_path` doesn't include the
  schema (see the `00033` incident below).
- **COMMANDS**: `npx supabase db push --dry-run --linked` to see pending
  migrations; confirm you're on the linked project (`supabase/.temp/project-ref`).

### RPC error
- **FILES**: the RPC's definition in `supabase/migrations/`, the calling
  `src/services/*.service.ts` method.
- **CONFIRM**: call the RPC directly (`supabase.rpc(name, args)`) to isolate
  whether the bug is in the function or in how the frontend calls it.

### Migration failure ("function uuid_generate_v4() does not exist" or similar)
**Real incident** — `00033_fix_search_path_extensions.sql`.
- **SYMPTOM**: a migration that works locally fails on `supabase db push`
  against the real Cloud project.
- **LIKELY CAUSE**: local `supabase/config.toml`'s `extra_search_path`
  masks a schema-qualification problem that Cloud Postgres doesn't have —
  an unqualified extension function call (e.g. `uuid_generate_v4()`
  instead of `extensions.uuid_generate_v4()`) only resolves locally.
- **SAFE FIX**: schema-qualify extension calls explicitly inside any
  `SECURITY DEFINER` function with `SET search_path = public` (which
  deliberately excludes `extensions` — see `00060`'s `set_pin()`/
  `verify_pin()` for the pattern of using `extensions.crypt(...)` fully
  qualified rather than relying on search_path inclusion).

### Storage permission error
- **FILES**: the bucket's RLS in `00023`/`00042`/`00062`, the exact object
  path being written (`(storage.foldername(name))[1]` must equal
  `auth.uid()::text` — check the path convention matches exactly).

## Auth

### Login succeeds but redirect fails / always goes to client dashboard
**Real incident** — `docs/phase-5/BATCH_FIX_ADMIN_ROLES_CHAT_REPORT.md`.
- **LIKELY CAUSE**: `signIn()`/`signUp()` not returning the freshly-loaded
  profile, or `dashboardPathForRole()` not being called with the real role.
- **FILES**: `src/features/auth/utils/dashboard-path.ts`,
  `src/pages/auth/login.tsx`, `register.tsx`.

### Role incorrect / "provider becomes client"
**Real incident** — the original, pre-`00054` bug: `handle_new_user()`
never read `role` from signup metadata at all, so every signup silently
became `client` regardless of intent.
- **FILES TO INSPECT**: `handle_new_user()`'s current body (`00057`'s final
  version — see `docs/architecture/DATABASE_ARCHITECTURE.md`), the signup
  form's metadata payload (`src/pages/auth/register.tsx`).
- **CONFIRM**: query `profiles.role` directly for the test account after
  signup — don't trust the UI redirect alone as proof.

### Session expires unexpectedly / doesn't expire when it should
- **FILES**: `src/features/auth/hooks/use-idle-timeout.ts` (admin/provider
  only, 1h), `supabase/config.toml`'s `jwt_expiry` (access token, silently
  auto-refreshed — expiring alone is invisible to the user by design).
- **CONFIRM**: which of the three distinct concepts is actually being
  observed — see `docs/architecture/AUTH_ARCHITECTURE.md`'s session-mechanics
  table before assuming "session expired" means the same thing as "idle
  timeout fired."

### Google callback 404
**Real incident** — `docs/phase-5/BATCH_FIX_ADMIN_ROLES_CHAT_REPORT.md`.
- **CAUSE**: `redirectTo: /auth/callback` pointed at a route that didn't
  exist in the router — fixed by adding `src/pages/auth/callback.tsx` and
  its route.
- **CONFIRM**: `src/app/router.tsx` has an `/auth/callback` entry.

### OAuth redirect mismatch
- **LIKELY CAUSE**: the Supabase project's Auth settings' allowed redirect
  URLs don't include the current origin — a **Supabase Dashboard**
  configuration, not something in this repo (do **not** try to fix this by
  running `supabase config push` — see
  `docs/architecture/SUPABASE_ARCHITECTURE.md`'s caveat on that file).

## Orders

### Wrong total
- **FILES**: `create_order()`'s current body (never trust the frontend
  `estimate.ts` value — confirm what the RPC actually computed by querying
  the created `orders` row).
- **CONFIRM**: compare `orders.subtotal + orders.delivery_fee` against
  `orders.total`, and each against the inputs (`services.price`,
  `finishing_options.cost` for the chosen items).

### Delivery fee incorrect
- **LIKELY CAUSE**: `delivery_zones` has zero rows in practice — confirm
  whether the fee came from a real zone or the `settings.flat_delivery_fee`
  fallback, and whether that's the expected behavior for this order.

### Order creation failure
- **FILES**: `create_order()`, `src/services/orders.service.ts`,
  `src/features/document-orders/hooks/use-submit-document-order.ts`.
- **CONFIRM**: check the RPC's own validation order (service active?
  delivery address ownership? item shape?) — the error message usually
  states which check failed.

### Payment proof upload failure
- **FILES**: `uploadsService.uploadPaymentProof()`, the `payment-proofs`
  bucket's RLS/mime-type/size limits (`00062`), `submit_payment_proof()`'s
  method-whitelist check (only `moncash`/`natcash`).
- **CONFIRM**: is the order's `preferred_payment_method` actually one of
  the two proof-requiring values? The RPC rejects otherwise.

### Status transition failure
- **FILES**: `update_order_status()`'s transition graph.
- **CONFIRM**: is the caller a client (only `en_attente → annulee`
  allowed) or staff (full graph)? Client attempts outside that one
  transition are correctly rejected, not a bug.

## Frontend

### Blank screen
- **FIRST CHECK**: browser console for a React error — likely caught (or
  should be) by `AppErrorBoundary`/`RouteErrorBoundary`; if the screen is
  truly blank with no fallback UI either, the error boundary itself may not
  be mounted yet (very early crash, before `App.tsx` renders).

### Route 404
- **FILES**: `src/app/router.tsx` — confirm the path exists exactly (case,
  trailing segments); the catch-all `*` route renders `not-found.tsx`.

### Mobile overflow / broken responsive layout
**Real incidents (multiple, found only by real browser screenshots, not
source review)** — ChatWidget z-index vs. navbar (Phase 5H); admin/provider
tables hiding columns with no scroll affordance; `admin/pricing.tsx` having
zero responsive classes at all.
- **METHOD**: `document.documentElement.scrollWidth` vs `clientWidth` for a
  quick automated check, but **always also look at a real screenshot** at
  each of the 8 breakpoints — the scrollWidth check does not catch
  z-index/stacking bugs or "content technically fits but is hidden without
  a discoverability cue" bugs, both of which have actually occurred here.
- **FILES**: the page in question, `src/components/ui/responsive-table.tsx`
  if it's a data-table overflow problem.

### Missing data (page loads but shows nothing)
- **CHECK**: is this an RLS issue (query succeeds, returns 0 rows because
  the policy excludes them) vs. a genuinely empty table vs. a query-key/
  `enabled` bug? Distinguish by checking the Network tab's actual response,
  not just the rendered `EmptyState`.

## Build

### TypeScript error
- **COMMAND**: `npx tsc -b` (also runs as part of `npm run build`).
  `tsconfig.app.json` has `strict: true`, `noUnusedLocals`,
  `noUnusedParameters` — these are enforced, not suggestions.

### Vite error
- **COMMON CAUSE IN THIS PROJECT**: a stale `node_modules/.vite` cache
  after a dependency or config change — `rm -rf node_modules/.vite` and
  restart.

### Lint error
- **COMMAND**: `npx oxlint`. Only two rules are set to `error`
  (`react/rules-of-hooks`); most output is `warn`-level and pre-existing
  (Fast-Refresh/React-Compiler advisory warnings) — don't assume every
  warning is new or must be fixed before shipping; check `git diff` to see
  if your change introduced it.

### Dependency error
- **COMMAND**: `npm ls react react-dom @tanstack/react-query` to check for
  unexpected duplicates before assuming a code bug.
