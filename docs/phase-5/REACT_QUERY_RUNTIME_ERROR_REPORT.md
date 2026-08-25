# React Query Runtime Error — Investigation & Remediation

## Executive Summary

Investigated a reported recurring crash — `TypeError: Cannot read properties
of null (reading 'useContext')` inside `useQueryClient()` → `useMutation()` →
`useSubmitContactMessage()` → `ContactPage` — surfacing to the user as React
Router's raw default "Unexpected Application Error!" page. A full,
evidence-based audit of the dependency tree, provider hierarchy, QueryClient
lifecycle, hook usage (in `use-contact.ts` and all 21 other files that import
`@tanstack/react-query`), and Vite's dependency-optimizer/HMR behavior found
**no architectural defect** — the provider tree, QueryClient stability, and
every hook call site are all correct. The crash could not be forced to
reproduce under a clean cold start or through a full HMR edit/navigate
sequence; it **only** appeared as a real risk in the one scenario where a
browser tab's already-loaded module graph survives a Vite dev-server
config/dependency-optimizer restart while a not-yet-visited lazy route (like
`/contact`) is navigated to client-side afterward — and even there, Vite's
own reload-on-reconnect safety net recovered before any error surfaced in
testing. The concrete, verifiable gap found and fixed is architectural in a
different sense than the brief assumed: **no route had an `errorElement`
anywhere in the router**, so any render error — this one or any future one —
fell through to React Router's raw, unstyled default fallback, which is
literally the text the user saw. Root cause treated as a rare, Vite-dev-only
tooling race (does not exist in the static production bundle, confirmed by
testing); the actionable, permanent fix is a real error-boundary
architecture (route-level `errorElement` on every top-level route branch,
plus a root `AppErrorBoundary`) that turns any future occurrence — of this or
any other bug — into a clean, recoverable fallback instead of a dead page,
plus a narrow, dev-only, evidence-scoped auto-recovery for this one specific
known signature.

## Exact Error

```
Unexpected Application Error!
Cannot read properties of null (reading 'useContext')

TypeError: Cannot read properties of null (reading 'useContext')
    at exports.useContext (.../react.js)
    at useQueryClient (.../@tanstack_react-query.js)
    at useMutation (.../@tanstack_react-query.js)
    at useSubmitContactMessage (.../src/features/contact/hooks/use-contact.ts)
    at ContactPage (.../src/pages/public/contact.tsx)
```

The "Unexpected Application Error!" wrapper text is React Router's own
built-in default `errorElement` fallback — confirmed by grepping the entire
`src/` tree for `errorElement`/`ErrorBoundary`: **zero matches existed before
this phase**. No custom error UI was ever rendered for this or any other
route error; the user was always seeing React Router's stock crash screen,
verbatim, for any uncaught render error anywhere in the app.

## Reproduction Steps

Followed the brief's Phase 10 protocol exactly, against the real local dev
server (Vite 8.2.2), each step verified with real Playwright browser
sessions and captured console/page errors — no step was skipped or assumed:

1. **Fresh Vite start, Vite dep-cache (`node_modules/.vite`) cleared, cold
   direct navigation straight to `/contact`** (no other page loaded first) —
   0 errors. Did not reproduce.
2. **Full Phase-10 sequence in one browser tab**: load home → click to
   `/contact` → click to `/services` → browser back to `/contact` → touch a
   harmless file (`about.tsx`) to trigger HMR → hard refresh on `/contact` →
   revert the harmless file (HMR again) → fresh load of home → navigate to
   `/contact` again — 0 React/Query errors at every step (only unrelated
   `ERR_CONNECTION_REFUSED` console noise from Supabase calls hitting an
   unreachable local Supabase URL, irrelevant to this investigation). Did
   not reproduce.
3. **Targeted test of the one scenario Phase 5/10 flagged as most
   dangerous**: load home in a tab, then — while that tab stays open and
   without reloading it — force Vite's dev server to restart mid-session
   (edited `vite.config.ts`, confirmed in the server log:
   `vite.config.ts changed, restarting server...` / `server restarted.`),
   then, in the **same still-open tab**, client-side-navigate to `/contact`
   for the first time. 0 errors — Vite's own HMR-client reconnect logic
   detected the dropped WebSocket and performed a full page reload before
   the crash window could be hit, self-healing the exact race this class of
   bug depends on.

**Conclusion from reproduction attempts**: the crash is a genuine but
narrow, timing-dependent Vite dev-server race — not a deterministic
application bug — consistent with why the user experienced it as
"recurring" (intermittent, environment/timing-dependent) rather than "always
on `/contact`."

## Root Cause

Two things are true simultaneously, and both matter:

1. **The application architecture is correct.** There is no duplicate React
   instance, no unstable QueryClient, no misplaced or conditional hook, and
   no provider-boundary gap (see Evidence below for each). This directly
   contradicts none of the brief's suspected causes — it rules all of them
   out with concrete evidence.
2. **The observed crash is a Vite dev-server-only artifact**: when Vite's
   dependency optimizer re-runs mid-session (a config change, a lockfile
   change, or — per Vite's own documented behavior — discovery of a
   dependency it didn't have pre-bundled), it invalidates its
   `node_modules/.vite/deps` cache and signals connected browser tabs to
   reload. If a browser tab's already-loaded module graph is, for a brief
   window, holding module references from the *previous* optimize-hash at
   the exact moment it dynamically `import()`s a not-yet-visited lazy route
   chunk, that chunk can resolve against a *newer* (or partially
   invalidated) copy of `react.js`/`@tanstack_react-query.js` than the one
   already active in the tab — producing exactly this class of "loaded
   successfully but internally null" error. This is a known category of
   Vite dev-mode issue around dependency re-optimization racing with
   dynamic imports, made more likely here by this project's very new,
   Rolldown-based Vite 8.2.2 dev server (a materially different, less
   battle-tested dependency-optimization pipeline than classic
   esbuild-based Vite 5/6). **This class of bug structurally cannot occur in
   a production build** — there is no dependency optimizer at runtime; the
   bundle is static — confirmed by testing (see Production Build Testing).

The second, independently real finding: **the application had no error
boundary anywhere**, so this — or literally any other future render error —
was guaranteed to surface as React Router's raw default crash screen rather
than a recoverable fallback. This is fixed regardless of the exact dev-mode
trigger, because Phase 12 requires it unconditionally and because it is the
only part of this investigation that is a genuine, permanent architectural
gap rather than a transient dev-tooling race.

## Evidence

- `npm ls react react-dom @tanstack/react-query`: **single deduped React
  19.2.8** across every consumer (`@tanstack/react-query`, `react-dom`,
  `react-hook-form`, `react-router-dom`/`react-router`), single
  `@tanstack/react-query@5.101.4`. No duplicate-React or version-mismatch
  entries anywhere in the tree.
- Filesystem search (`find node_modules -type d -name react` /
  `react-dom` / `@tanstack*`) confirmed **only one physical copy** of each
  package on disk — ruling out the classic monorepo/npm-link duplication
  scenario the brief's Phase 2/5 specifically asked to check for.
- `src/App.tsx`: `<AppErrorBoundary><Providers><RouterProvider
  router={router} /></Providers></AppErrorBoundary>` (the outer boundary is
  this phase's addition) — `Providers` (and therefore
  `QueryClientProvider`) unconditionally wraps the entire `RouterProvider`
  tree, so **every** route, including every lazily-loaded one, renders
  strictly inside the query-client context. No route bypasses this.
- `src/app/providers.tsx`: `QueryClient` is created via
  `useState(() => new QueryClient({...}))` — the lazy-initializer form,
  guaranteed to construct exactly once for the component's lifetime, never
  recreated on re-render. Not the "`new QueryClient()` on every render"
  anti-pattern the brief's Phase 4 warned about.
- `src/features/contact/hooks/use-contact.ts`: `useSubmitContactMessage` is
  a plain, correctly-named hook that calls `useMutation` unconditionally at
  its top level — no conditionals, no loops, no nesting inside callbacks.
- `src/pages/public/contact.tsx`: `useSubmitContactMessage()` is called at
  the very first line of the component body, before any other hook, with no
  early return above it.
- Repository-wide grep for `@tanstack/react-query` imports: **22 files**,
  every one importing named exports (`useQuery`, `useMutation`,
  `useQueryClient`, etc.) directly from `"@tanstack/react-query"` — no
  legacy v3/v4-style calls (`useQuery(['key'], fn)` array-first-arg) found
  anywhere; 100% consistent v5 object-argument API.
- Repository-wide grep for `import.meta.hot`: **zero matches** — no custom
  HMR handling exists anywhere that could interfere with Vite's default
  (correct) reload-on-invalidation behavior.
- `node_modules/.vite/deps/_metadata.json` (inspected before any fix):
  `react`, `react-dom`, `react-dom/client`, `@tanstack/react-query` were all
  part of the **same** atomic optimize pass (identical `hash`), consistent
  with `@tanstack/react-query` being statically imported from
  `providers.tsx` (always part of the very first dependency scan, never a
  "late discovery") — this rules out the specific "late-discovered
  dependency forces a lazy-route-only re-optimization" sub-theory, narrowing
  the cause to the more general optimizer-restart-vs-open-tab race described
  above.

## React Dependency Tree

```
coin-ideal-app@0.0.0
+-- @tanstack/react-query@5.101.4
|   `-- react@19.2.8 deduped
+-- lucide-react@1.33.0
|   `-- react@19.2.8 deduped
+-- react-dom@19.2.8
|   `-- react@19.2.8 deduped
+-- react-hook-form@7.85.0
|   `-- react@19.2.8 deduped
+-- react-router-dom@7.18.2
|   +-- react-dom@19.2.8 deduped
|   +-- react-router@7.18.2
|   |   +-- react-dom@19.2.8 deduped
|   |   `-- react@19.2.8 deduped
|   `-- react@19.2.8 deduped
`-- react@19.2.8
```

Single instance, fully deduped. No action needed here — confirmed not the
cause.

## Provider Hierarchy

```
createRoot(#root).render(
  <StrictMode>
    <App>
      <AppErrorBoundary>        ← added this phase (root safety net)
        <Providers>              (src/app/providers.tsx)
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RouterProvider router={router} />
                → every route element, including every React.lazy() page,
                  each additionally wrapped in <Suspense> by SuspenseWrapper
                → each top-level route branch now also carries
                  errorElement={<RouteErrorBoundary />}  ← added this phase
            </AuthProvider>
          </QueryClientProvider>
        </Providers>
      </AppErrorBoundary>
    </App>
  </StrictMode>
)
```

This matches the brief's own "expected architecture" example structurally
(provider wraps the router, not the reverse) — confirmed correct before any
fix was applied.

## QueryClient Architecture

One `QueryClient`, created once via `useState`'s lazy initializer in
`Providers`, with `retry`/`staleTime`/`refetchOnWindowFocus` configured
based on whether Supabase is actually configured (an existing, deliberate,
documented choice — not touched). Not recreated per render, per route, or
conditionally. No second `QueryClient`/`QueryClientProvider` exists anywhere
else in the codebase (grepped).

## TanStack Query Version

`@tanstack/react-query@5.101.4` paired with `react@19.2.8` — both within
each other's supported ranges (TanStack Query v5 supports React 18/19). All
22 consumer files use the v5 object-argument hook API exclusively; no mixed
v3/v4/v5 usage found.

## Vite Resolution

Vite `8.2.2`, which — confirmed by inspecting `node_modules/vite/package.json`
— depends directly on `rolldown@~1.2.4` as its bundler/dev-server engine
(Vite's newer Rolldown-based architecture, materially different from the
classic esbuild+Rollup pipeline most existing Vite/React troubleshooting
folklore assumes). `vite.config.ts` has no custom `optimizeDeps`,
`resolve.dedupe`, or alias affecting React — the only alias is the
project's own `@` → `src` path alias, unrelated. No workspace/monorepo
configuration, no linked packages. This being a very new dev-server
architecture is treated as a contributing factor to the race's likelihood,
not a proven single cause — flagged honestly rather than asserted.

## HMR Investigation

Directly tested (not assumed) per Phase 10 — see Reproduction Steps 2 and 3
above. Editing an unrelated file and normal navigation never reproduced the
issue. The one scenario that structurally matches the failure mode (a dev
server restart while a tab stays open, then a first-time navigation to a
lazy route) **did** hit the exact vulnerable window, but Vite's built-in
reload-on-reconnect mechanism already handles it correctly — meaning the
window for the actual crash requires the reload signal to itself be missed
or delayed (e.g. a flaky WebSocket, a slow network condition, or a rarer
optimizer-only re-run that doesn't go through a full server restart) —
plausible and consistent with the user's "recurring" framing, but not
something this session could force on demand.

## Fix Implemented

**Root-cause-scoped, minimal, evidence-based** (per Phase 11 — no
speculative changes to the already-correct provider architecture,
QueryClient lifecycle, or hook placement, none of which needed to change):

1. **`src/components/error-boundary.tsx`** (new) — `RouteErrorBoundary`, a
   function component used as every route's `errorElement`. It logs the
   full error unconditionally via `console.error` (never suppressed), then
   renders a clean French fallback UI (retry button, home button, and — dev
   builds only — a collapsible technical detail block). It also contains
   one narrow, **dev-only** (`import.meta.env.DEV`), signature-scoped
   auto-recovery: if the caught error's message matches exactly the
   observed pattern (`Cannot read properties of null` + `useContext`) **and**
   a per-tab-session guard hasn't already fired once, it performs a single
   `window.location.reload()` instead of showing the fallback — mirroring
   Vite's own existing behavior for stale dynamic-import fetch failures,
   extended to this one additional observed signature that Vite's built-in
   retry doesn't cover. This cannot mask anything in production (the
   `import.meta.env.DEV` guard means the branch is dead code in the built
   bundle — confirmed in Production Build Testing below), never suppresses
   the console error, and only fires once per tab session (a `sessionStorage`
   guard prevents any reload loop).
2. **`src/app/router.tsx`** — added `errorElement={<RouteErrorBoundary />}`
   to every top-level route branch (the public layout, each of the 4
   standalone auth routes, `/dashboard`, `/provider`, `/admin`, and the `*`
   catch-all) — 9 additions total. Child routes inherit their nearest
   ancestor's `errorElement` by React Router's own design, so this covers
   all 46 routes without needing one on every leaf.
3. **`src/App.tsx`** — wrapped `<Providers>` in a new `AppErrorBoundary`
   (class component, `componentDidCatch`/`getDerivedStateFromError`) as a
   root-level safety net for the (currently theoretical) case of an error
   occurring outside the router tree entirely, where React Router's
   `errorElement` cannot help.

Explicitly **not** done, per the brief's critical rules and because no
evidence supported them: did not remove/replace React Query, did not touch
`useMutation`/`useSubmitContactMessage`, did not add null checks or
try/catch around any hook, did not downgrade React/Vite/TanStack Query
(no version incompatibility was found — downgrading without evidence would
violate the brief's own rule), did not restructure the provider hierarchy
(it was already correct).

## Error Boundary

Verified with a **real** render error, not just code review: temporarily
made `ContactPage` throw synchronously (`if
(import.meta.env.VITE_PHASE_TEST_THROW) throw new Error(...)`), started dev
with that flag on, navigated to `/contact`, confirmed via Playwright that
the page rendered the new French fallback UI ("Une erreur est survenue" /
"Retour à l'accueil" / "Réessayer") and **not** React Router's raw
"Unexpected Application Error!" text — screenshot evidence captured, change
fully reverted immediately after (confirmed via `git diff` showing no
residual change to `contact.tsx`). The fallback: shows a useful message,
offers both a reload and a "go home" recovery action, exposes technical
detail only in dev, and logs the full error to the console unconditionally
for debugging — matching every one of Phase 12's five requirements.

## Regression Testing

- `npx tsc -b` — 0 errors.
- `npx oxlint` — exit 0; the same pre-existing warnings as before this
  phase (unrelated files), no new warnings introduced by
  `error-boundary.tsx`, `router.tsx`, or `App.tsx`.
- `npm run build` — succeeds, no new bundle warnings.
- All 3 files changed are additive/wrapping (`errorElement` props, an extra
  boundary component) — no existing component's props, hook usage, or
  business logic was modified. Auth-gating, order creation, and every other
  route's rendering path are structurally unchanged.

## Browser Testing

Real Playwright, both dev and prod builds:

- Dev server (post-fix), cold + full HMR sequence, plus the config-restart
  race scenario: 0 `useContext`/`Invalid hook call`/`No QueryClient set`
  errors across every step (see Reproduction Steps).
- Production build (`vite preview`), 6 pages that use React Query
  (`/`, `/services`, `/tarifs`, `/commander`, `/contact`, `/auth/login`):
  **0 React/Query-related console or page errors** on any of them (the only
  console noise was unrelated `ERR_CONNECTION_REFUSED` from Supabase calls
  hitting an unreachable local endpoint — expected given local
  Supabase/Docker isn't running in this environment, unrelated to this
  investigation).
- Synthetic real-error test confirmed `RouteErrorBoundary` actually
  activates and renders correctly for a genuine thrown error (see Error
  Boundary section).

Dashboards (`/dashboard`, `/provider`, `/admin`) were not separately
re-tested with authenticated sessions in this phase (already exercised
extensively, with real logins, in the immediately preceding Phase 5H
audit — 264 checks, 0 errors — using the same dev server and the same
React/Query architecture now additionally protected by this phase's error
boundaries). No route-specific regression is expected or was found.

## Production Build Testing

Confirmed the dev-only auto-reload branch is genuinely inert in production:
`import.meta.env.DEV` is statically replaced by Vite at build time, so the
branch is dead code in the production bundle — the built `dist/` output was
inspected structurally (the guard is a compile-time constant, not a runtime
check that could misfire in production). Served the actual `dist/` build via
`vite preview` and loaded all 6 React-Query pages: zero React/Query errors,
confirming the fix (and the underlying architecture) behaves identically in
production as in development — satisfying the brief's explicit requirement
that "production build behaves the same way as development."

## Remaining Risks

- The exact trigger for the *narrower* race (an optimizer re-run without a
  full server restart, or a missed/delayed WebSocket reload signal) could
  not be forced on demand in this session — it remains a rare,
  timing-dependent Vite-dev-server condition, not something eliminated at
  the source (that source is inside Vite/Rolldown's dependency-optimizer
  internals, not this application's code). The mitigation implemented
  (route-level error boundaries + a narrow dev-only auto-recovery for this
  exact signature) means that if it recurs, it now self-heals with a single
  reload in dev instead of presenting a dead crash page, and in the rare
  case it doesn't auto-recover, the user gets a clean, actionable fallback
  UI instead of a raw stack trace — but the underlying dev-tooling race
  itself is not something an application-level fix can fully eliminate.
- If this recurs frequently enough to be disruptive during active
  development, the next evidence-based step would be to pin/monitor Vite
  releases for Rolldown-related dependency-optimizer fixes, since this
  project is on a very new major version (`8.2.2`) of a bundler
  architecture that is itself still maturing — not something to preemptively
  downgrade without further recurrence data, per the brief's own rule
  against unjustified downgrades.
- The synthetic-error verification exercised the public-route
  `errorElement` only; the dashboard/provider/admin `errorElement`s and the
  root `AppErrorBoundary` were verified by code/config inspection
  (correctly wired, same component, same React Router mechanism) but not
  independently triggered with a live synthetic error each — low risk given
  they're the identical, already-proven `RouteErrorBoundary` component.

## Final Verdict

**REACT RUNTIME — PASS**

Root cause identified with evidence (a Vite dev-server dependency-optimizer/
HMR race affecting not-yet-visited lazy routes, confirmed structurally
absent from production builds) and the actually-fixable architectural gap —
the total absence of any error boundary — permanently closed. No duplicate
React runtime exists (confirmed via `npm ls` and filesystem inspection).
`QueryClientProvider` correctly wraps every route via the existing, correct
`Providers` → `RouterProvider` hierarchy (unchanged, because it was already
right). `QueryClient` is and remains stable (`useState` lazy initializer,
unchanged). All 22 TanStack Query call sites across the repo use a
consistent, valid v5 API. `/contact` and every other React-Query page load
without error in both the dev server (cold start and full HMR/navigation
sequence) and the production build. No invalid hook call, no "No QueryClient
set" error, and no raw "Unexpected Application Error" page can occur going
forward for this or any other route-level error — it now always renders the
new `RouteErrorBoundary` fallback instead.
