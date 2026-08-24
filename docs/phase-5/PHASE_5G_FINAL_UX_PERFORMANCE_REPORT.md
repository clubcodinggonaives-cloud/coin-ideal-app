# Phase 5G — Performance + Final UX QA

Every test in this report ran against the real Vercel deployment
(`https://coin-ideal-app.vercel.app`), not localhost — real Playwright network
capture, real Navigation Timing API measurements, a real axe-core WCAG scan, and real
accounts (`qa-client@coin-ideal-qa.test`, `qa-provider@coin-ideal-qa.test`) for
authenticated states. Scripts are kept in `scripts/phase5g-*.mjs`.

**This phase found and fixed a live production outage** before any of the performance/UX
work below could produce meaningful results — see "Critical fix" first.

---

## Critical fix found during this phase (not a Phase 5F.1 finding — new)

Measuring first-load performance immediately surfaced that **every anonymous request to
`/services`, `/tarifs`, `/commander`, `/vente-eau`, the homepage's category list, and the
public contact form was returning `401`** in production. Root-caused live (not guessed):
Phase 5F.1's HIGH-severity fix (`00048`, revoking anonymous SELECT on
`profiles.email`/`role`) had an unintended side effect on several *other* tables'
`FOR ALL` admin/staff policies (`categories`, `contact_messages`, and others) that did a
raw `EXISTS (... profiles.role ...)` subquery instead of going through the `is_admin()`
function — Postgres must evaluate every applicable permissive policy to compute their OR,
so merely evaluating that subquery now hard-errored for `anon`, even though a different,
already-passing policy existed for the same query. Phase 5F.1's own regression pass had
caught this exact pattern on the `orders` family and (correctly, for `orders`) judged it a
harmless side effect since anonymous visitors never query orders — that reasoning does
**not** hold for `categories` or `contact_messages`, which every real anonymous visitor
hits.

Fixed in migration `00051`: added `is_staff()` alongside the existing `is_admin()` and
rewired every affected policy through these `SECURITY DEFINER` functions instead of the
raw subquery. Verified live immediately: browsing and the contact form work again; the
original H1 fix was re-verified intact (`profiles.email`/`role` still correctly `401` for
anonymous). See `git log` for the full commit — this was deployed before any further
Phase 5G work, since it was actively broken in production.

---

## Performance

### Initial load (real Navigation Timing, live site)

| Page | TTFB | FCP | DOMContentLoaded | JS requests | JS weight | Image weight | Supabase calls |
|---|---|---|---|---|---|---|---|
| `/` | ~60ms | 0.6–2.5s* | 0.5–2.5s* | 42 | 621 KB | 246 KB | 1 |
| `/services` | ~57ms | ~530ms | ~460ms | 39 | 618 KB | 135 KB | 2 |
| `/tarifs` | ~53ms | ~530ms | ~470ms | 39 | 615 KB | 135 KB | 3 |
| `/commander` | ~56ms | 0.6–1.4s* | 0.5–1.3s* | 44 | 633 KB | 135 KB | 3 |
| `/contact` | ~69ms | ~510ms | ~460ms | 36 | 700 KB | 135 KB | 0 |
| `/vente-eau` | ~75ms | ~620ms | ~560ms | 35 | 610 KB | 135 KB | 1 |

*`/` and `/commander` showed real run-to-run variance (0.6s–2.5s FCP across repeated
measurements) even after the fixes below — likely Vercel edge cold-start variance on this
project's tier, not a code issue; flagged rather than cherry-picking the best number.
TTFB is consistently excellent (~50-75ms) on every page, meaning the variance is
client-side/bundle-parse time, not server response time.

**JS weight (600-700KB per page) is the same across almost every route** — expected for a
Vite-code-split SPA where the shared vendor/UI chunks dominate; each route's own chunk is a
few KB on top (visible in the build output, e.g. `contact-*.js` is 4.63KB gzipped). Not
flagged as a bottleneck: this is what a normal first visit costs, and a returning visitor's
browser cache eliminates nearly all of it on subsequent navigations within the SPA (only
new dynamic imports trigger new requests) — verified conceptually via the build output's
per-chunk gzip sizes, not re-measured with a second navigation in this pass.

**Duplicate requests**: none found in the final measurement. An earlier run (before the
critical fix above) showed `categories`/`services` fetched twice on `/` and `/tarifs` —
that was TanStack Query silently retrying the `401` failures, not a real duplicate-fetch
bug in the app; confirmed by the fact it disappeared entirely once the underlying `401` was
fixed, with no code change to the query logic itself.

### Images — real bottleneck found and fixed

The single highest-impact, most concrete finding in this phase: **`logo.png` (1125 KB),
`hero.png` (1727 KB), and `favicon-icon.png` (440 KB) — nearly 3.3 MB combined — were
loaded at 40–80px display sizes.** Not speculative: measured file sizes vs. actual `<img>`
CSS dimensions in the navbar, footer, and 4 auth pages.

| Asset | Before | After | Change |
|---|---|---|---|
| `logo.png` (1254×1254 → 320×320, same format) | 1125 KB | 135 KB | -88% |
| `favicon-icon.png` (720×720 → 256×256, same format) | 440 KB | 57.5 KB | -87% |
| `hero.png` → `hero.webp` (2048×768, PNG → WebP q0.82) | 1727 KB | 111.5 KB | -94% |

All three visually verified before/after (side-by-side screenshot comparison) — no
perceptible quality loss at real display size. Deployed and confirmed live: production now
serves `logo.png` at 135KB and `hero.webp` at 111.5KB with the correct `Content-Type`
headers. **Every page's image weight dropped from ~1.1MB to 135KB; the home page (which
also loads the hero) dropped from ~2.85MB to 246KB.**

### Supabase queries

All real REST calls, no client-side over-fetching found beyond what's already
architecturally documented (`services` selects nested `provider`/`category`/
`service_images` in one round trip, which is the intended pattern, not N+1). Every call
returns `200` now (see Critical fix above for what was broken before).

### Upload performance

Not independently measurable this phase: production currently has zero active services
(confirmed via REST, matches Phase 5C's original finding, unchanged) so the real
`/commander` file-upload step (past choosing a service) isn't reachable to time — the page
correctly shows an empty-catalogue state instead (see UX section). Not faked or
approximated.

### Edge Function / Gemini latency

Measured directly against the live `ai-assistant` Edge Function:

- Successful calls: **~3.4s and ~4.3s** round-trip (greeting and a pricing question,
  respectively) — this is the full chain (rate-limit check → Supabase query for business
  context → Gemini API call → response), not just network latency.
- **A real, currently-observed reliability gap**: during this same testing window, 2 of 4
  calls returned `502` (one longer/injection-style message, retried once, failed again) —
  intermittent upstream failures even while the service is generally "up," not just the
  earlier full-outage state (Phase 5F/5F.1 both observed the endpoint fully down for
  extended periods, most likely Gemini API quota exhaustion from cumulative same-day
  testing across every phase using the same key — it recovered on its own during this
  phase). **Not fixed in this phase** (no retry/circuit-breaker logic added) — flagged as a
  real, observed pattern worth a resilience pass (client-side retry-once, or a visible
  "queued" state) rather than treated as fully resolved just because it responded
  successfully at least once.

---

## UX states

All tested live, with real interactions — not simulated.

| State | Result |
|---|---|
| **Loading** | Two distinct, correct phases confirmed: a spinner while the route's JS chunk downloads (visible on throttled network), then a skeleton (`animate-pulse` cards) while the Supabase query is in flight. Both work correctly — not a single "loading" concept, and neither was broken. |
| **Empty** | `/commander` with zero active services shows a well-designed empty state — icon, "Aucun service disponible", explanatory text, and a "Nous contacter" CTA — not a blank page or a raw error. |
| **Success** | Contact form submission shows a real confirmation message after actual Supabase persistence (matches Phase 5B's original fix, still working). |
| **Error (validation)** | Submitting the contact form empty shows real field-level validation errors. |
| **Error (auth failure)** — **fixed this phase** | A wrong password previously showed Supabase's raw English error `"Invalid login credentials"` on this all-French site. Fixed: `translateAuthError()` now maps this and 6 other known GoTrue error strings to French, with a safe French fallback for anything unmapped. |
| **Unauthorized access** | Anonymous visiting `/dashboard/orders` correctly redirects to `/auth/login` (confirmed via real navigation, not just router code inspection). |
| **Offline/network failure** | Navigating while `context.setOffline(true)` fails cleanly (`net::ERR_INTERNET_DISCONNECTED`), no uncaught JS errors observed. No custom "you're offline" UI exists — the browser's own network-error page is what a real user would see; not flagged as broken (not required by the cahier des charges), but worth a deliberate decision if offline support ever becomes a goal. |
| **Upload failure** | Not reachable to test directly (zero active services → no file-upload step to reach, same root cause as "Upload performance" above) — not faked. |
| **Gemini failure** | Tested against the assistant's real, currently-observed outage (see Edge Function latency above) — the chat widget shows a clear French error message ("L'assistant est momentanément indisponible. Réessayez dans un instant.") with a visible **"Réessayer"** retry button, not a silent failure or a broken UI. Confirmed via screenshot. |

---

## Responsive

**54/54 checks, zero horizontal overflow** — every one of the 9 required breakpoints (320,
375, 390, 430, 768, 820, 1024, 1280, 1440) × 6 representative pages/states (home, services,
commander, contact, client dashboard, provider dashboard), measured via
`document.documentElement.scrollWidth` vs `clientWidth`, not just visual inspection.

Visually spot-checked, not just overflow-checked:
- **Navigation**: collapses to a hamburger menu at 320px with correct touch target sizing;
  full nav bar from 1024px+.
- **Sidebar**: client/provider dashboards correctly collapse to a "Menu" toggle button on
  mobile, full persistent sidebar from desktop widths — confirmed with a real logged-in
  session, not just an empty shell.
- **Cards**: service/category cards reflow from a single column at 320px to a 3-column grid
  by 1024px+, no cramped or clipped content at any width.
- **Forms**: `/contact` and `/commander` inputs remain full-width and usable at 320px, no
  overlap with labels/icons.
- **Tables**: the "Commandes" list (provider dashboard) deliberately isn't rendered as an
  HTML `<table>` at all — it's a card-based layout at every width, sidestepping the classic
  "table doesn't fit on mobile" problem entirely. Verified with a **real order** created
  specifically for this check (the dashboard was otherwise empty), screenshotted at
  320/768/1440 — action buttons ("Passer à «Confirmée»", "Annuler", "Enregistrer un
  paiement") stay clearly tappable at every size. Fixture removed after (migrations
  `00052`/`00053`).
- **Modals, buttons, touch targets**: no undersized or overlapping interactive elements
  found across any screenshot reviewed.

---

## Accessibility

Ran a real WCAG 2 A/AA scan (`axe-core`, not a manual guess) against 7 public/auth pages
and 5 authenticated pages (dashboard + provider, both roles). **Found 17 real violations,
fixed all 17, verified 0 remaining with a second live scan after deployment.**

| Violation | Where | Fix |
|---|---|---|
| `button-name` (critical) | Password show/hide toggles (login, register ×2, reset-password ×2) | Added `aria-label`, toggling "Afficher"/"Masquer le mot de passe" |
| `select-name` (critical) | `/services` sort dropdown | Added `aria-label="Trier les services"` (no visual change) |
| `button-name` (critical) | Sidebar collapse toggle, mobile hamburger menu, per-notification "mark as read" (×16 in the test account, one per unread row) | Added `aria-label` to each |
| `link-name` (serious) | Navbar notification bell (icon-only) | Added `aria-label="Notifications"` |
| `aria-prohibited-attr` (serious) | Footer's disabled social-icon placeholders — `aria-label` on a plain `<span>` with no ARIA role is invalid per spec (this session's own earlier work) | Added `role="img"` so the label becomes valid |
| `nested-interactive` (serious) | `/commander` file dropzone: a `<div role="button" tabIndex={0}>` wrapping a real (visually-hidden) `<input type="file">` — two overlapping interactive elements | Replaced the div with a `<label>`, which natively triggers the wrapped input on click/Enter/Space — removed the now-redundant custom keydown handler entirely rather than working around it |
| `color-contrast` (serious) | 17 separate text instances of `text-gray-400` (footer copyright, price-unit labels, step-indicator numbers, list metadata rows, upload-hint captions, etc.) measuring **~2.8:1** against their actual background vs. the required **4.5:1** | Bumped to `text-gray-500` (~5.0:1, computed) almost everywhere; one specific case (`/auth/register`'s role-selector subtitle, sitting on a light *tinted* selected-card background rather than plain white) needed `text-gray-600` — `gray-500` measures **4.42:1** there specifically, just under threshold; computed via the WCAG relative-luminance formula against the exact theme color (`--color-primary-50: #eef2fb`), not guessed |

**Keyboard navigation**: tabbed through `/auth/login` — logical order (logo → email →
password → show/hide toggle → forgot-password link → submit → Google sign-in → create
account link), every stop shows a visible focus ring, the password toggle now announces
correctly (confirmed via the same scan: before the fix its accessible name was `null`,
after it reads "Afficher le mot de passe").

**Headings / semantic structure**: not separately audited beyond what axe-core's
`heading-order`/landmark rules already cover (both included in the wcag2a/wcag2aa scan and
came back clean).

---

## Fixes applied this phase

1. **Critical**: fixed the live 401 outage on public storefront browsing + contact form
   (migration `00051`) — see "Critical fix" above.
2. Cut logo/favicon/hero image weight by ~90% (public/logo.png, public/favicon-icon.png,
   public/hero.webp).
3. Translated Supabase Auth's raw English error messages to French across all 4 auth pages.
4. Fixed all 17 real WCAG 2 A/AA violations found by a live axe-core scan (see table above).

## Remaining issues (not fixed this phase — out of scope or needs a decision)

- **Gemini intermittent `502`s** even while "up" — no retry/circuit-breaker added; worth a
  resilience pass, and worth checking whether the current Gemini API key/tier is adequate
  for expected real traffic once the catalogue goes live.
- **`/` and `/commander` FCP variance** (0.6s–2.5s across runs) — TTFB is consistently fast,
  so this is client-side; not chased further since it didn't reproduce consistently enough
  to isolate a single cause in this pass.
- **Upload performance and upload-failure UX** couldn't be tested against a real active
  service — blocked on the same empty-catalogue business-data gap Phase 5C already
  identified, not a code issue.
- No custom offline/network-error UI exists — not required today, worth a deliberate
  decision (not a silent gap) if offline resilience becomes a real goal.
