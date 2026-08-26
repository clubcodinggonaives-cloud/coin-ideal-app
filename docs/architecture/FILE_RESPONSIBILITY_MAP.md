# COIN-IDEAL File Responsibility Map

Covers architecturally significant files only (router, providers, auth,
Supabase client, representative services/hooks/pages, feature modules,
shared components, types, constants, key migrations, Edge Functions) — not
every trivial file. See `docs/architecture/DIRECTORY_MAP.md` for directory-
level coverage of everything not individually listed here.

---

### `src/App.tsx`
**Purpose**: composition root — wraps `Providers` and `RouterProvider` in
`AppErrorBoundary`.
**Responsibilities**: nothing beyond this 3-level wrap; no logic.
**Imported by**: `src/main.tsx` only.
**Depends on**: `src/app/providers.tsx`, `src/app/router.tsx`,
`src/components/error-boundary.tsx`.
**Safe to modify**: yes, but rarely needs to change.
**Usually modified when**: adding a new root-level provider/boundary.
**Do not modify when**: adding a page or feature (→ `router.tsx` / the
feature directory instead).
**Related files**: `src/main.tsx`.
**Potential regressions**: breaking the wrap order breaks either error
handling or the query/auth context for the whole app.

### `src/app/router.tsx`
**Purpose**: every route definition, all pages lazy-loaded.
**Responsibilities**: `createBrowserRouter([...])`; `SuspenseWrapper` per
route; `errorElement={<RouteErrorBoundary/>}` on every top-level route
branch; nested children for `/dashboard`, `/provider`, `/admin`.
**Imported by**: `src/App.tsx`.
**Depends on**: every page component (lazily), `DashboardLayout`/
`PublicLayout`, `RouteErrorBoundary`.
**Safe to modify**: yes — this is the expected place to add any new route.
**Usually modified when**: adding a page, changing a path, adding/removing
a nested dashboard route.
**Do not modify when**: the change is about what a page *does*, not which
URL reaches it.
**Related files**: `src/lib/constants.ts` (`ROUTES` — keep path strings in
sync), `src/components/layout/dashboard-layout.tsx`.
**Potential regressions**: forgetting `errorElement` on a new top-level
branch leaves that branch without the custom error fallback; forgetting
`SuspenseWrapper` breaks lazy-loading.

### `src/app/providers.tsx`
**Purpose**: the single `QueryClient` instance + `AuthProvider` wrap.
**Responsibilities**: `useState(() => new QueryClient({...}))` — the
stable-instance pattern (never recreated per render).
**Imported by**: `src/App.tsx`.
**Depends on**: `@tanstack/react-query`, `src/features/auth/hooks/use-auth.tsx`,
`src/services/supabase/client.ts` (`isSupabaseConfigured`).
**Safe to modify**: yes, for query defaults (staleTime, retry).
**Usually modified when**: changing global React Query defaults.
**Do not modify when**: you need a differently-configured query for one
specific hook — use `useQuery`'s own options instead of changing the
global default.
**Related files**: every `use-*.ts` hook (all inherit these defaults).
**Potential regressions**: recreating the `QueryClient` on every render
(NOT the current pattern — would break caching entirely) — if you ever see
`new QueryClient()` without a `useState`/`useRef` wrapper, that's a bug.

### `src/services/supabase/client.ts`
**Purpose**: the one Supabase JS client instance.
**Responsibilities**: `createClient(url, anonKey)`, no custom options.
**Imported by**: every `src/services/*.service.ts` file.
**Safe to modify**: only to add client-level options (rare); never to add
a second client.
**Do not modify when**: you need different behavior for one call — use
that call's own options, not a client-wide change.
**Potential regressions**: any change here affects literally every
Supabase interaction in the app.

### `src/features/auth/hooks/use-auth.tsx`
**Purpose**: the `AuthContext`/`AuthProvider`/`useAuth()` hook — the
single source of truth for `user`/`profile`/`isAuthenticated` throughout
the app.
**Responsibilities**: seeds state from `authService.getSession()`,
subscribes to `onAuthStateChange` (`SIGNED_IN`/`SIGNED_OUT` only —
`TOKEN_REFRESHED` etc. are no-ops), exposes `signIn`/`signUp`/`signOut`/
`signInWithGoogle`/`refreshProfile`.
**Imported by**: `DashboardLayout`, `Navbar`, every page/hook needing
`user`/`profile`, `use-idle-timeout.ts`, `use-pin.ts` (indirectly via
`PinGate`).
**Depends on**: `src/features/auth/services/auth.service.ts`,
`src/features/auth/hooks/use-pin.ts` (`clearPinElevationStorage`, called
from `signOut`).
**Safe to modify**: yes, carefully — this is a CRITICAL/HIGH-risk file per
`docs/architecture/CHANGE_IMPACT_MATRIX.md`.
**Usually modified when**: adding a new auth-derived piece of context
state, or changing sign-out side effects (like the PIN-elevation clear).
**Do not modify when**: the change is really about role *authorization*
(→ RLS/RPC) rather than *session state*.
**Related files**: `auth.service.ts`, `use-idle-timeout.ts`, `use-pin.ts`,
`dashboard-layout.tsx`.
**Potential regressions**: forgetting to clear PIN elevation on sign-out
would let a second account on the same browser tab inherit the previous
account's elevated PIN state (a real risk this file's `signOut` already
guards against — don't remove that call).

### `src/features/auth/services/auth.service.ts`
**Purpose**: all direct Supabase Auth calls — the one exception to
"services live in `src/services/`", kept feature-nested for its tight
coupling to the auth context.
**Responsibilities**: `signUp()` (via the `register` Edge Function, not
`supabase.auth.signUp()` directly — see
`docs/architecture/DECISIONS.md`), `signIn`, `signOut`, `signInWithGoogle`,
`getSession`, `getProfile` (**explicit column list, never `select("*")`** —
excludes `pin_hash`/`failed_pin_attempts`/`pin_locked_until`), `updateProfile`,
`onAuthStateChange`.
**Imported by**: `use-auth.tsx` only.
**Safe to modify**: yes, CRITICAL-risk for anything touching `signUp`/PIN-
adjacent columns.
**Usually modified when**: changing what data signup collects, or which
profile columns are fetched.
**Do not modify when**: tempted to `select("*")` for convenience — see the
pin_hash-exposure lesson in `docs/architecture/DECISIONS.md`; always use
an explicit column list on `profiles`.
**Related files**: `supabase/functions/register/index.ts`,
`00054`/`00057`'s `handle_new_user()`.
**Potential regressions**: reverting to `select("*")` on `profiles`
re-introduces a PIN-hash exposure to the browser.

### `src/features/auth/hooks/use-idle-timeout.ts`
**Purpose**: 1-hour admin/provider idle timeout, real `signOut()` on
expiry.
**Responsibilities**: debounced (≤1 write/30s) activity tracking via
`mousemove`/`keydown`/`touchstart`/`pointerdown`/`visibilitychange`;
`setInterval` check every 60s; on timeout, sets a `sessionStorage` flag
(`consumeIdleTimeoutFlag`, read once by `login.tsx`) then calls the real
`signOut()`.
**Imported by**: `dashboard-layout.tsx` (unconditionally called, no-ops
when `enabled=false`), `login.tsx` (`consumeIdleTimeoutFlag`).
**Safe to modify**: yes — HIGH-risk (security feature).
**Usually modified when**: changing the timeout duration or which roles it
applies to.
**Do not modify when**: tempted to use router `state` to pass the
"session expired" message instead of `sessionStorage` — this was tried and
found to **race** with `DashboardLayout`'s own unauthenticated `<Navigate>`
(both fire off the same `signOut()`-triggered state change); `sessionStorage`
sidesteps the race deliberately.
**Related files**: `use-auth.tsx` (`signOut`), `dashboard-layout.tsx`,
`login.tsx`.
**Potential regressions**: reverting to router-state messaging
reintroduces the race that silently drops the "expired due to inactivity"
message.

### `src/features/auth/hooks/use-pin.ts`
**Purpose**: PIN elevation state + `set_pin`/`verify_pin` mutations.
**Responsibilities**: `sessionStorage`-backed `elevated` boolean (20-minute
lifetime), `elevate()`/`refreshElevated()`/`clearElevated()`,
`clearPinElevationStorage()` (standalone, called from `use-auth.tsx`'s
`signOut`).
**Imported by**: `dashboard-layout.tsx`, `pages/auth/pin.tsx`,
`change-pin-card.tsx`, `use-auth.tsx`.
**Depends on**: `src/services/pin.service.ts`.
**Safe to modify**: yes — CRITICAL-risk (auth security feature).
**Do not modify when**: tempted to trust the `elevated` flag for anything
beyond "should the PIN screen re-prompt" — it grants no data access by
itself; the real check is always `verify_pin()`.
**Related files**: `pin.service.ts`, `pin.tsx`, `change-pin-card.tsx`,
`dashboard-layout.tsx`.

### `src/services/pin.service.ts`
**Purpose**: thin wrapper around `set_pin`/`verify_pin` RPCs.
**Responsibilities**: never resolves the PIN comparison client-side —
purely relays the RPC's `{ok, lockedUntil}` result.
**Related files**: `00060_add_pin_security.sql` (the RPCs themselves).

### `src/components/layout/dashboard-layout.tsx`
**Purpose**: the single chokepoint for every `/dashboard`, `/provider`,
`/admin` route — auth check, role check, idle-timeout activation, PIN
gating, sidebar/navbar shell. Also exports `PublicLayout`.
**Responsibilities**: in order — loading state → unauthenticated redirect
→ wrong-role redirect → idle-timeout hook call → PIN-gate render (if
admin/provider and not elevated) → full dashboard shell with
`DashboardSidebar` + `Outlet`.
**Imported by**: `router.tsx` (lazily, as the `element` for each dashboard
route group).
**Depends on**: `use-auth`, `use-idle-timeout`, `use-pin`,
`pages/auth/pin.tsx` (`PinGate` — the one `pages/`→`components/layout/`
import direction).
**Safe to modify**: yes — CRITICAL-risk, this file IS the security
boundary's frontend half for three separate concerns at once.
**Usually modified when**: changing what gates dashboard access (a new
role, a new step-up factor).
**Do not modify when**: the change is really about *what's inside* a
specific dashboard page, not the gate itself.
**Related files**: every dashboard/provider/admin page (all render inside
this component's `Outlet`).
**Potential regressions**: reordering the guard checks (e.g. checking PIN
before role) could show a PIN prompt to a wrong-role user, or idle-time-out
a user who shouldn't have the hook active.

### `src/components/error-boundary.tsx`
**Purpose**: `RouteErrorBoundary` (router `errorElement`) + `AppErrorBoundary`
(root class-component boundary).
**Responsibilities**: always logs the full error (`console.error`, never
suppressed); renders a clean French fallback with retry/home actions;
dev-only stack-trace `<details>`; a narrow, dev-only, signature-scoped
auto-reload for one specific known transient Vite-dev-server error (see
`docs/architecture/DEBUGGING_PLAYBOOK.md`'s `useContext`-null entry) —
**inert in production** (`import.meta.env.DEV`-gated).
**Imported by**: `router.tsx` (`RouteErrorBoundary` on every top-level
route), `App.tsx` (`AppErrorBoundary`).
**Safe to modify**: yes.
**Do not modify when**: tempted to widen the auto-reload's matched error
signature — it should stay narrow (this exact known race) to avoid masking
a real, different bug behind an automatic reload.

### `src/services/orders.service.ts`
**Purpose**: all `orders`/`order_items`/`payments` data access.
**Responsibilities**: `createOrder()`→`create_order()` RPC,
`updateOrderStatus()`→`update_order_status()` RPC,
`submitPaymentProof()`→`submit_payment_proof()` RPC, `getMyOrders`/
`getAllOrders`/`getOrder` (direct SELECT, `ORDER_SELECT` shared query
shape). **Never** a direct INSERT/UPDATE/DELETE on these tables — matches
the database-level `REVOKE`.
**Imported by**: `use-submit-document-order.ts`, `dashboard/orders.tsx`
(indirectly via a hook), `staff-order-card.tsx`'s hooks.
**Safe to modify**: yes — CRITICAL-risk (money/status).
**Do not modify when**: tempted to add a direct table write method here —
if it's not an RPC call, it will fail against the database's own REVOKE,
by design.
**Related files**: `00028`/`00030`/`00061` migrations (the RPCs this calls).

### `src/services/uploads.service.ts`
**Purpose**: all Storage upload/signed-URL logic, one method pair per
bucket concept (avatar, service image, order document, provider document,
payment proof).
**Responsibilities**: never calls `getPublicUrl()` on a private bucket;
consistent path convention (`{userId}/...` or `{userId}/{orderId}/...`).
**Safe to modify**: yes — HIGH-risk (private-document exposure risk if a
new method accidentally uses a public URL on a private bucket).
**Do not modify when**: adding a new private-bucket method — copy the
`uploadOrderDocument`/`getOrderDocumentUrl` pattern exactly (upload
returns only `{path}`, a separate signed-URL getter is called on demand).

### `src/features/document-orders/types.ts`
**Purpose**: `DocumentOrderState` (the order wizard's local form state) +
`INITIAL_ORDER_STATE` + `isProofPaymentMethod()` helper.
**Responsibilities**: the wizard's entire client-side state shape —
`deliveryAddressId` (a real `addresses.id`, never free text),
`deliveryInstructions` (mapped to `create_order()`'s `p_notes` param),
`paymentProofFile`/`paymentReference`.
**Imported by**: `pages/order/document.tsx`, every wizard step component,
`order-summary.tsx`.
**Safe to modify**: yes, when adding a new wizard field — also update
`use-submit-document-order.ts`'s mapping to the RPC call.
**Related files**: `use-submit-document-order.ts`, `delivery-options.tsx`,
`order-summary.tsx`.

### `src/pages/auth/pin.tsx`
**Purpose**: exports `PinGate` — **not a routed page** despite its
location under `pages/auth/`.
**Responsibilities**: setup form (no `pin_set_at` yet) vs. verify form
(exists), calling `usePin()`'s mutations, calling `onUnlocked()` (passed by
`DashboardLayout`, wired to `refreshElevated`) on success.
**Imported by**: `dashboard-layout.tsx` only — rendered in place of the
dashboard `Outlet`, never reached via router navigation.
**Do not modify when**: tempted to add a router entry for this — it's
intentionally not a navigable route.
**Related files**: `use-pin.ts`, `dashboard-layout.tsx`,
`change-pin-card.tsx` (a related but separate component for changing an
already-set PIN).

### `src/lib/constants.ts`
**Purpose**: `COMPANY`, `ROUTES`, `STORAGE_BUCKETS`, `PAYMENT_METHODS`,
`ORDER_STATUS_LABELS`, `ORDER_PICKUP_STEPS`/`ORDER_DELIVERY_STEPS`,
`PAGE_SIZE`, file-upload limits.
**Responsibilities**: the single source of truth for route path strings
and bucket name strings — never hardcode either elsewhere.
**Imported by**: nearly every page/component.
**Safe to modify**: yes, additive changes are LOW risk; changing an
existing `ROUTES` value is MEDIUM (breaks any hardcoded path elsewhere that
should have used the constant instead — grep for the literal string first).

### `src/lib/validators.ts`
**Purpose**: every Zod schema in the app.
**Responsibilities**: one schema per form, `.refine()` for cross-field
rules, exported inferred types.
**Safe to modify**: yes.
**Usually modified when**: adding/changing a form field.

### `src/types/index.ts` / `src/types/database.ts`
**Purpose**: TypeScript domain types.
**See**: `docs/architecture/ARCHITECTURE_RULES.md` #13 and
`docs/architecture/ARCHITECTURE_DOCUMENTATION_REPORT.md` — the
relationship between these two files is not documented; treat `index.ts`
as the one actually imported throughout the app (confirmed by usage) and
verify `database.ts` isn't silently diverging before relying on it.

### `supabase/functions/register/index.ts`
**Purpose**: signup via `auth.admin.createUser({email_confirm: true})`
using `service_role`.
**Responsibilities**: whitelists `role` (`'provider'` or default
`'client'` — never trusts anything else), validates password length,
CORS via `ALLOWED_ORIGINS`.
**Depends on**: `SUPABASE_SERVICE_ROLE_KEY` (platform-injected), `jsr:@supabase/supabase-js@2`.
**Safe to modify**: yes — CRITICAL-risk (uses service_role; any bug here
is a full-database-bypass risk in the worst case).
**Do not modify when**: tempted to accept `role: 'admin'` from the
request body under any circumstance.
**Related files**: `auth.service.ts` (`signUp`, the only caller),
`handle_new_user()` (fires identically regardless of which API inserted
the `auth.users` row).

### `supabase/functions/ai-assistant/index.ts`
**Purpose**: Gemini proxy.
**Responsibilities**: CORS via `ALLOWED_ORIGINS`; rejects anonymous
callers (application-layer, independent of the UI hiding the widget);
`check_ai_rate_limit()` before calling Gemini; builds business context
from `services`/`categories` (read-only).
**Depends on**: `GEMINI_API_KEY` secret, `ALLOWED_ORIGINS` secret.
**Safe to modify**: yes — HIGH-risk (cost/quota exposure if the
authentication check is weakened).

### Key migrations (representative, not exhaustive — see `docs/architecture/DATABASE_ARCHITECTURE.md` for the full table-by-table reference)

- **`00020_create_rls_policies.sql`**: the original RLS policy set for
  tables `00003`–`00019`. Safe to read for the *pattern*, several
  individual policies here were later superseded (see `00048`/`00051`/
  `00055`/`00058`/`00059`/`00063`) — check
  `docs/architecture/DATABASE_ARCHITECTURE.md` for which policies are
  still exactly as written here vs. replaced.
- **`00021_create_functions.sql`**: `is_admin()` and the rating/updated_at
  triggers — the original security-helper convention.
- **`00027_security_hardening_profile_roles.sql`**: the role-escalation
  fix + client-update guard triggers — read this to understand *why*
  `profiles_update_own`/`service_requests`/`bookings` have the shape they
  do today.
- **`00028_create_orders_payments_pricing.sql`**: the entire orders/
  payments/pricing foundation in one migration — the most important single
  file to read before touching anything order-related.
- **`00051_fix_admin_policy_profiles_regression.sql`**: introduces
  `is_staff()` and explains, in its own header comment, the exact incident
  that makes rule "never inline a role subquery" non-negotiable (see
  `docs/architecture/DECISIONS.md`).
- **`00060_add_pin_security.sql`** / **`00061_add_payment_proof_and_address_phone.sql`**
  / **`00062_create_payment_proofs_bucket.sql`**: the complete Phase 6
  security/payment feature set, each well-commented with its own rationale.
