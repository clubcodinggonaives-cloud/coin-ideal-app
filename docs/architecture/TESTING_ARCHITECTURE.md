# COIN-IDEAL Testing Architecture

**EXISTING state, confirmed by direct inspection**: there is **no automated
test suite**. No `playwright.config.ts`, no `tests/` directory, no
`*.test.ts`/`*.spec.ts` file anywhere in `src/`, no `test` script in
`package.json`, and no CI workflow (no `.github/workflows/`). Testing is
performed via:

1. **Compiler/linter as a correctness gate** — `npx tsc -b` (strict mode:
   `strict: true`, `noUnusedLocals`, `noUnusedParameters`,
   `noFallthroughCasesInSwitch` all on, per `tsconfig.app.json`) and
   `npx oxlint` (`react/rules-of-hooks: error`, `react/only-export-components: warn`,
   per `.oxlintrc.json`). Run as part of `npm run build` (`tsc -b && vite build`)
   and separately before considering any change complete.
2. **One-off Playwright scripts** (`scripts/*.mjs`, 14 files as of writing,
   named per the phase/purpose they were written for) — run directly with
   `node scripts/whatever.mjs`, not through a `playwright test` runner.
   Several (`phase5f-security-audit.mjs`) point directly at the **live
   production** Supabase REST API and Vercel URL with real QA-account
   credentials; others point at a local dev server. **RECOMMENDED**: a new
   script should clearly comment at the top which target (local vs.
   production) it hits, following the pattern already used by
   `scripts/phase5h-responsive-audit.mjs`.
3. **Live, real-account verification as the actual acceptance bar** — every
   phase report in `docs/phase-4/`, `docs/phase-5/`, `docs/phase-6/`
   documents *real* browser interactions (Playwright), *real* Supabase
   accounts (`qa-client@coin-ideal-qa.test`, `qa-provider@coin-ideal-qa.test`,
   plus the real admin account), and *real* network responses — never a
   fabricated "it should work" claim. This is a strong, consistently
   followed **EXISTING** norm (see `CLAUDE.md` rule 2: "never fabricate a
   test result"), even though it isn't automated/repeatable via CI.

## What should be tested, per feature (RECOMMENDED sequencing — no formal
test suite enforces this order today, but every phase report has
informally followed it)

```
ORDER CREATION / PAYMENT / DELIVERY
Logic (client-side estimate matches RPC inputs)
      ↓
Database/RPC (create_order/submit_payment_proof — call directly, verify
  computed total, verify rejected on bad input e.g. wrong payment method)
      ↓
RLS (Client A cannot read Client B's order/address/payment proof; a client
  cannot call submit_payment_proof for someone else's order)
      ↓
E2E (real browser: full wizard, both payment paths, both delivery paths)
      ↓
Responsive (8 breakpoints: 360/390/414/768/820/1024/1280/1440)
      ↓
Production smoke test (after deploy: load the real page, confirm no
  console error, confirm a real order can still be created)
```

```
AUTH / PIN / IDLE TIMEOUT
Unit-level logic (PIN format validation, idle-threshold math) — informal,
  no unit test framework exists; verified by direct RPC calls in past
  sessions instead
      ↓
RPC (set_pin/verify_pin: correct PIN accepted, wrong PIN rejected, 5th
  wrong attempt locks out, 6th attempt rejected even if correct)
      ↓
RLS/ownership (a user's own verify_pin call only ever affects their own row
  — the RPC reads auth.uid() internally, no user-id parameter exists,
  which structurally prevents targeting another account)
      ↓
E2E (real login → PIN setup screen shown once → verify screen on next
  session → lockout → change-PIN form)
      ↓
Cross-role check (client role never sees the PIN gate at all)
```

```
RESPONSIVE UX (any page)
Source-level check (are the obvious Tailwind breakpoint classes present?)
  — explicitly NOT sufficient alone, per this project's own repeated
  finding that "classes exist" ≠ "usable in a real browser"
      ↓
Real browser render at each of the 8 required breakpoints
      ↓
document.documentElement.scrollWidth vs clientWidth (horizontal-overflow
  check) — the specific technique used by scripts/phase5g-responsive.mjs
  and phase5h-responsive-audit.mjs
      ↓
Visual screenshot review (the overflow check alone misses real bugs found
  this way in past phases — e.g. the ChatWidget z-index issue, the admin
  table mobile-scroll-discoverability issue — neither produced a scrollWidth
  mismatch)
```

## RLS testing pattern (EXISTING, repeated across every security-sensitive
change in this project's history)

Every RLS-affecting change in this project's history has been verified with
**real accounts across the actual role matrix**, not just one account:
Anonymous, Client A, Client B (for cross-tenant isolation), Provider,
Admin. See `docs/phase-6/SECURITY_ORDER_UX_IMPLEMENTATION_REPORT.md`'s "RLS
Validation" section for a worked example against the payment-proof/address
changes, and `docs/phase-5/PHASE_5F_SECURITY_REPORT.md` for the original,
broader RLS audit that found and fixed the `profiles_update_own`
privilege-escalation issue.

## Database/migration testing (EXISTING practice)

`npx supabase db push --linked --dry-run` is run and its output reviewed
**before every real push** — never pushed blindly. See `CLAUDE.md` rule 3
and the repeated pattern across this session's own migrations (`00057`
through `00064`, each dry-run-reviewed and explicitly confirmed before the
real push). Local validation via `supabase db reset` (Docker-based local
stack) is the documented preferred path when Docker is available;
`--dry-run --linked` is the fallback when it isn't (as was the case
throughout this project's actual sessions — Docker was consistently
unavailable in the working environment, confirmed by repeated
`failed to connect to the docker API` errors logged in phase reports).

## Gaps (honestly flagged, not silently ignored)

- No regression suite exists that runs automatically on every change — a
  fix in one area has, more than once, required manually re-verifying
  unrelated areas by hand (e.g. the Phase 6 payment-proof work required a
  manual re-check that login/registration/Google OAuth still worked).
  **RECOMMENDED**: even a minimal Playwright suite wired into `npm test`
  and run before deploy would close this gap; not built today because no
  CI pipeline exists to run it in either.
- `scripts/phase5f-security-audit.mjs` hardcodes production credentials and
  URLs in a file that is committed to git. This is consistent with the
  project's already-accepted practice of committing QA-fixture credentials
  for `*.test`-domain throwaway accounts (see `CLAUDE.md`'s security rules,
  which draw a real distinction between production secrets — never
  committed — and disposable QA fixture credentials), but is worth a
  developer's awareness before assuming "nothing in this repo talks to
  prod" — some scripts explicitly do, by design.
