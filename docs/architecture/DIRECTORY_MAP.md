# COIN-IDEAL Directory Map

**EXISTING** — every directory below was confirmed present via a full
repository listing; nothing is invented. See `docs/architecture/FILE_RESPONSIBILITY_MAP.md`
for individual-file detail within these directories.

```
coin-ideal-app/
├── src/
│   ├── app/                    # Router + provider composition root
│   ├── components/
│   │   ├── ui/                 # Design-system primitives
│   │   ├── layout/              # Navbar, Footer, Sidebar, DashboardLayout/PublicLayout
│   │   ├── forms/               # Shared form-field wrapper
│   │   ├── shared/               # Cross-page display components (cards, search bar)
│   │   └── error-boundary.tsx   # Root + route-level error boundaries
│   ├── features/                # Feature-scoped hooks + feature-specific components
│   ├── pages/                    # Route-level page components, grouped by area
│   ├── services/                  # Supabase data-access layer (one class per domain)
│   ├── types/                      # Hand-maintained TypeScript types
│   ├── lib/                         # Cross-cutting constants/validators/errors
│   └── utils/                        # Small stateless helpers
├── supabase/
│   ├── migrations/                    # Sequential, immutable SQL migrations (64 as of writing)
│   ├── functions/                      # Deno Edge Functions
│   ├── config.toml                      # Local Supabase stack config (see caveat below)
│   └── seed.sql                          # Local-only dev seed data
├── docs/
│   ├── database/                          # Early (now partly stale) schema analysis
│   ├── phase-4/, phase-5/, phase-6/         # Per-phase implementation/QA reports
│   └── architecture/                         # This documentation set
├── scripts/                                    # One-off Playwright QA/audit scripts (not a test suite)
├── vite.config.ts, tsconfig*.json, .oxlintrc.json, vercel.json
└── package.json
```

---

## `src/app/`

**Purpose**: the composition root — where the router is defined and where
global providers (React Query, Auth) are assembled before the router mounts.

**Responsibilities**: `router.tsx` defines every route (via
`createBrowserRouter`) and lazy-loads every page component;
`providers.tsx` creates the single `QueryClient` instance and wraps
`AuthProvider` around it.

**What belongs here**: router configuration, top-level provider wiring.
Nothing else — this directory intentionally stays tiny (2 files).

**What must NOT go here**: page components, business logic, Supabase calls.

**Typical files**: `router.tsx`, `providers.tsx`.

**Dependencies**: imports every page (lazily) and every layout component;
imported only by `src/App.tsx`.

---

## `src/components/ui/`

**Purpose**: the project's design-system primitives — the "shadcn-style"
building blocks every page composes.

**Responsibilities**: `Button`, `Card`/`CardHeader`/`CardContent`/etc.,
`Input`, `Textarea`, `Select`, `Modal`, `Badge`, `Alert`, `Avatar`,
`Pagination`, `Rating`, `Skeleton`, `Spinner`, `Separator`, `EmptyState`/
`ErrorState`/`SearchEmpty`, and the `ResponsiveTableScroll`/`TableScrollHint`/
`STICKY_COL_CLASS` responsive-table helper (added during the Phase 5H
responsive pass). All re-exported from `index.ts` — pages import from
`@/components/ui`, never a specific file directly (**EXISTING convention**,
consistently followed).

**What belongs here**: presentational, business-logic-free components used
by 3+ unrelated pages/features. `class-variance-authority` (`cva`) is the
established pattern for variant props (`button.tsx`, `badge.tsx`).

**What must NOT go here**: anything that calls a Supabase service, anything
feature-specific (e.g. an order-status badge belongs in `features/orders/`,
not here, even though it visually wraps `Badge`).

**Dependencies**: `lucide-react`, `class-variance-authority`, `@/utils/cn`.
Depended on by nearly every page/feature component in the app.

---

## `src/components/layout/`

**Purpose**: the two page-shell layouts and their shared chrome.

**Responsibilities**: `navbar.tsx` (public nav + auth-aware user menu),
`footer.tsx`, `sidebar.tsx` (`DashboardSidebar`, role-aware off-canvas
drawer on mobile), `dashboard-layout.tsx` (exports both `PublicLayout` and
`DashboardLayout` — the latter is the single chokepoint for auth/role
guarding, idle-timeout activation, and PIN-gate rendering for
`/dashboard`|`/provider`|`/admin`).

**What belongs here**: only the shell components mounted once per layout,
never per-page content.

**What must NOT go here**: page-specific UI.

**Dependencies**: `@/features/auth/hooks/use-auth`,
`@/features/auth/hooks/use-idle-timeout`, `@/features/auth/hooks/use-pin`,
`@/pages/auth/pin` (`PinGate` — a rare, deliberate exception where a
`pages/` component is imported by `components/layout/`, because the PIN
gate is rendered in place of the dashboard `Outlet`, not routed to
directly).

---

## `src/components/forms/` and `src/components/shared/`

**Purpose**: `forms/form-field.tsx` is a shared label+error wrapper used by
some (not all — react-hook-form's `register()` is more commonly spread
directly onto `Input`/`Textarea`) forms. `shared/` holds cross-page display
cards: `category-card.tsx`, `provider-card.tsx`, `review-card.tsx`,
`service-card.tsx`, `search-bar.tsx` — used by the public catalogue pages.

**What belongs here**: components reused across 2+ *public* pages that
aren't generic enough for `ui/` (they know about domain shapes like
`Service`/`Provider`).

---

## `src/features/`

**Purpose**: feature-scoped code — hooks (TanStack Query wrappers around a
service) and, where a feature has non-trivial UI of its own, its
components. This is the largest and most actively-grown directory.

**Responsibilities** (one subdirectory per feature area):
`auth/` (hooks, services/auth.service.ts *inside* the feature — an
exception to the top-level `src/services/` convention, kept because auth is
tightly coupled to React context; see `FILE_RESPONSIBILITY_MAP.md`),
`ai-assistant/` (chat widget + hook), `admin/` (admin-only hooks:
`use-admin.ts`, `use-admin-pricing.ts`), `document-orders/` (the entire
`/commander` wizard: components, hooks, `types.ts`, `utils/`), `orders/`
(staff-facing order display components + hooks, distinct from
`document-orders/` which is the client-facing creation wizard),
`bookings/`, `reviews/`, `favorites/`, `messages/`, `notifications/`,
`categories/`, `providers/`, `services/` (each: a thin `use-*.ts` hook
file wrapping the matching `src/services/*.service.ts`).

**What belongs here**: a hook is created here whenever a feature needs
React Query integration (caching, invalidation) around a service call.
Feature-specific components (not reusable elsewhere) also live here, e.g.
`document-orders/components/delivery-options.tsx`.

**What must NOT go here**: generic, feature-agnostic UI (→ `components/ui`);
raw Supabase calls with no React Query wrapper (→ `src/services/`, called
directly from a hook here).

**Naming convention (EXISTING)**: `use-<feature>.ts` for the primary hook
file; one file per feature subdirectory unless the feature is large enough
to need `components/`/`hooks/`/`utils/` splits (only `document-orders/` and
`orders/` currently do).

---

## `src/pages/`

**Purpose**: route-level components — one file per route (or per route
segment for nested dashboard routes), lazy-loaded by `src/app/router.tsx`.

**Responsibilities**: compose feature hooks/components into a full page;
own page-level state (e.g. wizard step, filters, pagination page number);
render loading/error/empty states.

**Structure**: `public/` (12 routes), `auth/` (`login`, `register`,
`forgot-password`, `reset-password`, `callback` — Google OAuth landing —
and `pin` — not a route, see note below), `dashboard/` (client, 8 routes),
`provider/` (10 routes), `admin/` (11 routes), `order/document.tsx` (the
`/commander` wizard shell), `not-found.tsx`.

**Note on `pages/auth/pin.tsx`**: despite living in `pages/auth/`, this
file is **not wired into the router** — it exports `PinGate`, a component
rendered directly by `DashboardLayout` in place of the dashboard `Outlet`.
It's a `pages/`-located component consumed by `components/layout/` rather
than the reverse — a deliberate, documented exception (see
`FILE_RESPONSIBILITY_MAP.md` for this file).

**What must NOT go here**: reusable logic used by more than one page
(extract to `features/` or `components/`); direct Supabase calls (go
through a service/hook).

---

## `src/services/`

**Purpose**: the Supabase data-access layer — one class-based module per
domain (`orders.service.ts`, `addresses.service.ts`, `admin.service.ts`,
`pin.service.ts`, `uploads.service.ts`, etc.), each exporting a singleton
instance (`export const ordersService = new OrdersService()`).

**Responsibilities**: every `.from()`/`.rpc()`/`.storage` call in the
codebase lives here (or in `src/features/auth/services/auth.service.ts` —
the one feature-nested exception). Services return typed data or throw;
they do not know about React Query.

**What belongs here**: any new Supabase table/RPC/bucket interaction.

**What must NOT go here**: React hooks, component state, UI logic.

**Dependencies**: `@/services/supabase/client` (the singleton client),
`@/types`. Depended on by `features/**/hooks/use-*.ts` almost exclusively
(pages call services directly in only a handful of legacy spots — prefer
the hook layer for new code, **RECOMMENDED**).

---

## `src/services/supabase/`

**Purpose**: the single Supabase JS client instantiation.

**Typical files**: `client.ts` — `createClient(url, anonKey)` with no
custom options object (default `persistSession`/`autoRefreshToken`/
`detectSessionInUrl`). Never instantiate a second client elsewhere.

---

## `src/types/`

**Purpose**: TypeScript types for the whole app.

**Responsibilities**: `index.ts` — the primary, hand-maintained domain
types (`Profile`, `Order`, `Address`, `Service`, etc.) actually imported
throughout the app; `database.ts` — a broader, more mechanically-shaped set
of types (closer to a `supabase gen types` shape) that appears to overlap
with `index.ts` for some entities — **see
`docs/architecture/ARCHITECTURE_DOCUMENTATION_REPORT.md`, "Areas With
Architectural Ambiguity"**: which of the two is authoritative for a given
entity is not consistently documented, and neither is confirmed to be
CLI-generated (no `supabase gen types` marker found in either file).
**RECOMMENDED**: standardize on running `supabase gen types typescript
--linked` into one generated file, and hand-maintain only the types that
add computed/joined shapes on top.

**What must NOT go here**: Zod schemas (→ `src/lib/validators.ts`).

---

## `src/lib/`

**Purpose**: small, cross-cutting, non-React modules.

**Typical files**: `constants.ts` (`COMPANY`, `ROUTES`, `STORAGE_BUCKETS`,
`PAYMENT_METHODS`, status label maps, file-upload limits — the single
source of truth for route path strings, imported everywhere instead of
hardcoded path literals), `validators.ts` (every Zod schema in the app),
`errors.ts`.

---

## `src/utils/`

**Purpose**: small stateless helper functions with no domain knowledge.

**Typical files**: `cn.ts` (Tailwind class merge, `clsx` + `tailwind-merge`
— used by nearly every component with a `className` prop), `format.ts`
(currency/date formatting), `helpers.ts`.

---

## `supabase/migrations/`

**Purpose**: the database's entire history, as sequentially-numbered,
**immutable once deployed** SQL files (`00001` → `00064` as of writing).

**Critical rule (EXISTING, stated repeatedly in migration comments and in
`CLAUDE.md`)**: never edit a migration that has already been pushed to the
linked project — always add a new, forward-fixing migration instead. Several
migrations in this history exist specifically because an earlier one had a
bug found via live testing (e.g. `00042` fixes `00023`'s `service-images`
RLS; `00051` fixes a regression from `00048`; `00059` fixes a
never-actually-worked admin verify button) — this pattern of "ship, test
live, forward-fix" is the project's normal, accepted workflow, not a sign of
instability.

**What belongs here**: schema changes, RLS policy changes, RPC/trigger
definitions, one-time data promotions (e.g. `00037`/`00038` promoting real
accounts), and — unusually but consistently — **temporary QA fixture
creation/cleanup pairs** (`00039`/`00040`, `00046`/`00047`, `00049`/`00050`,
`00052`/`00053`, `00064`), used because `orders`/`payments` have no
client-writable path, so seeding/cleaning test data for those tables can
only happen via a migration.

---

## `supabase/functions/`

**Purpose**: Deno Edge Functions — the only place `SUPABASE_SERVICE_ROLE_KEY`
is ever used, and the only way to bypass RLS safely.

**Current functions**: `ai-assistant/` (Gemini proxy, rate-limited, CORS
via `ALLOWED_ORIGINS` secret), `register/` (creates a signed-up user via
`auth.admin.createUser({ email_confirm: true })` to avoid the project's
2-emails/hour confirmation-email rate limit).

**What must NOT go here**: anything callable safely from the client without
elevated privilege (→ a normal service + RLS-protected table/RPC instead).

---

## `docs/`

**Purpose**: permanent + per-phase documentation.

- `docs/database/` — an early, now **partially stale** schema-design
  analysis (predates `orders`/`payments`, several migrations). Historically
  valuable for design rationale; not authoritative for current schema state
  — this new `docs/architecture/` set is.
- `docs/phase-4/`, `docs/phase-5/`, `docs/phase-6/` — dated implementation/
  QA reports, one per work session. Read for historical "why", not current
  "what" (a later report can supersede an earlier one's findings).
- `docs/architecture/` — this documentation set, intended to stay
  continuously accurate (update alongside code changes, not per-phase).

## `scripts/`

**Purpose**: standalone Playwright-based QA/audit scripts, run directly
with `node`, **not** a `playwright test` suite (no `playwright.config.ts`
exists, no `tests/` directory, no `npm test` script). Each script is named
after the phase/purpose it was written for (e.g. `phase5g-responsive.mjs`,
`phase5h-responsive-audit.mjs`). See `docs/architecture/TESTING_ARCHITECTURE.md`.
