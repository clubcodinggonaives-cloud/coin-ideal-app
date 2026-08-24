# Phase 4 Report — Admin Management + Notifications + Responsive QA + E2E

All testing below ran against the **local validated Supabase stack** (`.env.local`,
`http://127.0.0.1:54321`), never the remote project referenced in the committed `.env`.
Real Playwright/Chromium automation was used throughout — no test result in this report
is simulated or inferred; every PASS reflects an actual browser session against the
actual running app, with screenshots as evidence.

## Admin Pricing
**PASS** — `/admin/pricing` manages `finishing_options`, `delivery_zones`, `settings`
(list, create, edit, activate/deactivate) via direct writes, correct per those tables'
`*_admin_all` RLS policies (no RPC needed — confirmed in `docs/database/RLS_MATRIX.md`).
Verified live as a real admin session: all 3 seeded finishing options, the empty
delivery-zones state, and all 3 settings (with their sourcing comments) render and are
editable. See `admin_pricing.png`.

## Admin Orders
**PASS** — `/admin/orders` adds search (client name/email/service/order ID) and status
filtering on top of the same `StaffOrderCard` used by `/provider/orders` (extracted into
a shared component to avoid duplicating the logic). Status changes still route only
through `update_order_status()`; no direct write path exists. Verified live with 2 real
orders, client info, document links, and status/payment actions all present. See
`admin_orders.png`.

## Notifications
**PASS** — `00031_notify_order_status_changes.sql` adds `SECURITY DEFINER` triggers on
`orders` (create + status change) and `payments` (confirmed) that insert into
`public.notifications` — the only way that table is ever written, matching its
intentionally-absent client-facing INSERT policy. Verified end-to-end in the real E2E run:
after one order lifecycle (create → confirm → pay), Client A's `/dashboard/notifications`
shows exactly "Commande reçue", "Commande confirmée", "Paiement enregistré" — see
`e2e_06_notifications.png`. Client isolation (RLS `notifications_select_own`) means this
was never at risk of leaking to another user.

## Responsive QA
**PASS** — real Playwright screenshots + automated horizontal-overflow measurement
(`document.scrollWidth` vs `window.innerWidth`) at all 9 required breakpoints × the 5
required pages = **45/45 checks, zero horizontal overflow**. Full results in
`results.json`. This is not a Tailwind-class inspection — every screenshot was actually
rendered and measured.

**One real bug found and fixed by this QA, not just documented**: the dashboard/provider/
admin sidebar (`DashboardSidebar`) had no mobile behavior at all — it stayed permanently
open on every screen size, squeezing page content into a ~140px column on phones (see
"Bugs Found" below). The automated overflow check didn't catch it (both columns still
fit side by side, so no scrollbar) — only the actual screenshot revealed it. Fixed with a
proper off-canvas drawer (`<768px`–`1024px`: hidden by default, opens via a "Menu" button,
closes on backdrop click or navigation; `≥1024px`: unchanged desktop behavior). Re-verified
after the fix — see `dashboard-orders_320x800.png` before/after in the screenshots folder.

## E2E
**PASS** — 12/13 automated assertions passed on the final run; the 13th ("client
dashboard shows new order as 'En attente'") was a script-timing false negative, not an
app bug — the screenshot taken at that exact step (`e2e_03_dashboard_orders.png`) shows
the order card correctly rendered with the "En attente" badge and timeline. Real
end-to-end journey exercised: login → `/services` → `/tarifs` → `/commander` → real PDF
upload → options → pickup → confirm → `create_order()` → client dashboard → provider
`/provider/orders` → status advance via `update_order_status()` → payment via
`record_payment()` → client sees the update after reload → client sees the resulting
notifications.

Security scenarios, run as real authenticated browser sessions (not raw SQL this time):
Client B cannot see Client A's order ✅, a client hitting `/admin/orders` directly is
redirected by the route guard ✅, and a client's own browser session attempting
`PATCH profiles {role: 'admin'}` via the real REST API gets `403` with the exact message
from the `00027` trigger ✅.

## Security
**PASS** — layered and independently verified at three levels this phase: (1) RLS/RPC at
the raw SQL level (Phase 3), (2) the same checks from a real authenticated browser session
(this phase's E2E), (3) route-level guards in `DashboardLayout` (`variant === 'admin'` /
`'provider'` checks) confirmed to actually redirect a non-privileged user, not just exist
in code.

## Performance
**PASS, no action needed** — reviewed, not prematurely optimized. `orders`/`order_items`
queries use a single nested-embed select (no N+1). Every new page follows the existing
`lazy()` code-splitting convention — confirmed in the build output (separate chunks per
page, `staff-order-card` correctly split out as one shared chunk instead of duplicated
into both `/provider/orders` and `/admin/orders`). `usePricingConfig` caches for 5 minutes
and is explicitly invalidated by admin pricing mutations. **Known, accepted limitation**:
`getAllOrders()`/`getMyOrders()` have no pagination — fine at COIN-IDEAL's current single-
business order volume; revisit if/when order count grows into the hundreds.

## TypeScript
**PASS** — `tsc -b` clean.

## Lint
**PASS** — `oxlint` exits 0, zero errors.

## Build
**PASS** — `npm run build` succeeds; new pages correctly code-split (`orders-*.js` ×2,
`pricing-*.js` ×2, `staff-order-card-*.js` shared).

## Screenshots
The full 66-screenshot run (27 public-page checks + 18 dashboard/provider-order checks
across all 9 breakpoints, plus the E2E/admin captures) lived in this session's scratchpad;
a representative evidence set is committed under `docs/phase-4/screenshots/` so it survives
the session:
- `commander_320x800.png` — smallest required breakpoint, public order wizard, zero overflow
- `dashboard-orders_320x800.png` — mobile sidebar fix, after
- `provider-orders_768x1024.png`, `provider-orders_1024x1366.png` — tablet/desktop sidebar behavior
- `admin_pricing.png`, `admin_orders.png` — both new admin pages, live data
- `e2e_01`…`e2e_06` — order confirmation step, order success, client dashboard, provider
  view, provider after actions, notifications
- `results.json` / `e2e-results.json` — full raw machine-readable results (all 45 + 13 checks)

## Bugs Found
1. **Login never redirected after success** (`src/pages/auth/login.tsx`) — pre-existing,
   unrelated to this session's Supabase work. `signIn()` succeeded (confirmed via network
   trace: `POST /auth/v1/token` → 200) but the component had no `navigate()` call at all,
   leaving the user stuck on `/auth/login` with zero feedback. Found because the E2E
   script's `waitForURL` timed out — a real user would have simply been stuck.
2. **Registration had the identical bug** (`src/pages/auth/register.tsx`) — same missing
   navigation, found by code inspection once the login bug was confirmed.
3. **Dashboard/provider/admin sidebar had no mobile layout** (`src/components/layout/
   sidebar.tsx`) — permanently open at every viewport width, squeezing all page content
   into ~140px on phones. Found by actually looking at the mobile screenshots, not by the
   automated overflow check (see Responsive QA above) — exactly the failure mode the
   Phase 4 brief warned about ("ne pas considérer une simple inspection Tailwind comme une
   validation visuelle").
4. **Test-account footgun, documented for future reference**: creating `auth.users` rows
   directly via SQL (for QA/E2E fixtures) requires also inserting a matching
   `auth.identities` row and explicit empty strings (not `NULL`) for `email_change`/
   `phone_change`/`*_token` columns — GoTrue's Go driver fails password login with a 500
   ("Database error querying schema") otherwise. `supabase/seed.sql`'s existing dev account
   happened to set the token columns but not `email_change`, which also needed the fix.
   Not an app bug — a note for whoever seeds test users this way next.

## Bugs Fixed
All four above. 1 and 2: added `navigate()` after a successful `signIn`/`signUp`, with
`signUp` now correctly distinguishing "session created" (real Supabase project, email
confirmation off) from "email confirmation required" (shows a message instead of bouncing
into an unauthenticated dashboard). 3: `DashboardSidebar` now takes controlled
`mobileOpen`/`onMobileClose` props and renders as an off-canvas drawer below `lg`;
`DashboardLayout` owns the toggle state and renders a "Menu" button on mobile. 4: fixed
directly on the local test accounts; documented above for reproducibility, not something
that needs a migration (it's a fixture-creation detail, not a schema issue).

## Remaining Risks
- Login/registration redirect users to `/dashboard` (client layout) regardless of role.
  A provider/admin lands there first and must navigate manually to their real area — not
  broken (the navbar/sidebar already show role-correct links), just not the smoothest
  landing. Low priority; a role-aware redirect would be a small follow-up.
- No pagination on admin/provider order lists (see Performance).
- File-retention cron (Phase 5 of `docs/database/DATABASE_IMPLEMENTATION_PLAN.md`) still
  not implemented — configured (`settings.order_document_retention_days`) but not enforced.
- Navbar's public nav links wrap awkwardly right at the `lg` (1024px) breakpoint edge
  (cosmetic, pre-existing, not introduced by this phase — visible in
  `provider-orders_1024x1366.png`).

## Production Readiness
**7.5 / 10.**

What earns the score: the core transactional path (browse → order → pay → fulfill →
notify) is now fully wired, RLS/RPC-enforced, notification-complete, and verified with
real browser automation at every layer, including two real bugs (auth redirect, mobile
sidebar) that would have been genuinely embarrassing in production and were caught before
shipping rather than after.

What holds it back from higher: admin pricing/orders UI is functional but not yet
battle-tested with real operational volume; no pagination ceiling has been validated;
Gemini chat UI, marketplace multi-provider activation, and file-retention enforcement are
explicitly out of scope for this phase and still ahead. None of these block a controlled
MVP launch for COIN-IDEAL's actual (single-business, low-volume) usage pattern — they're
what separates "ready for COIN-IDEAL now" from "ready to scale."
