# COIN-IDEAL Change Impact Matrix

Classification is **RECOMMENDED** (a framework for judging future changes)
but every example given is real — drawn from this project's own change
history, not hypothetical.

## LOW

**Examples**: text copy, spacing, icon swap, color-token tweak (single
value), adding a nav link to an existing page.

**Required review**: self-review (read the diff once).
**Required tests**: visual check; `npm run build`.
**Required documentation**: none beyond the commit message.
**Deployment caution**: none — push and deploy normally.

## MEDIUM

**Examples**: new public page, new shared UI component, form field
addition/validation change, non-security RLS-unrelated hook/service
addition, responsive-layout fix on an existing page.

**Required review**: read the diff; confirm no unrelated file changed.
**Required tests**: `npx tsc -b`, `npx oxlint`, `npm run build`; manual
click-through of the changed flow; responsive check at the 8 breakpoints if
layout-related.
**Required documentation**: none required, but update
`docs/architecture/CHANGE_MAP.md`/`FILE_RESPONSIBILITY_MAP.md` if a new
file/pattern is introduced that a future developer would need to find.
**Deployment caution**: normal push; a quick post-deploy smoke check of the
changed page.

## HIGH

**Examples**: authentication flow changes, role handling, session/idle-
timeout logic, new payment-adjacent UI, order-flow changes that don't touch
money computation directly (e.g. adding a delivery-instructions field),
Storage bucket/policy changes, new Edge Function.

**Required review**: read the diff in full; trace every RLS/RPC touched
back to `docs/architecture/DATABASE_ARCHITECTURE.md` to confirm the change
doesn't silently widen access.
**Required tests**: everything in MEDIUM, plus: real login as every
affected role (not just the one the feature targets); if Storage is
touched, a cross-account access attempt that should fail.
**Required documentation**: a short report of what changed and how it was
verified — this project's own convention (`docs/phase-*/`) is a per-session
`.md` report with a real, non-fabricated verification section.
**Deployment caution**: dry-run any migration
(`supabase db push --dry-run --linked`) and get explicit confirmation
before the real push; deploy the Edge Function separately and verify with
one real call before considering the change done.

## CRITICAL

**Examples**: any RLS policy change, any RPC touching `orders`/`payments`,
`service_role`-adjacent code (Edge Functions using
`SUPABASE_SERVICE_ROLE_KEY`), authentication security (PIN, idle timeout,
password/OAuth flow), database authorization (`is_admin`/`is_staff`
functions, role-guard triggers), any change to `handle_new_user()`.

**Required review**: full read-through by treating the change as
adversarial — ask "how would a malicious authenticated user, or an
unauthenticated one, try to abuse this?" for every new code path. This
project's own real history includes **at least four** RLS/RPC bugs
(`profiles_update_own` privilege escalation, `suspendUser()`/
`verifyProvider()` silent no-ops, `00048`→`00051`'s admin-check regression,
the never-working PIN verify-button equivalent for providers) that shipped
initially and were only caught by later, deliberate live testing — treat
that as the expected bar, not paranoia.
**Required tests**: the full role matrix (Anonymous, Client A, Client B,
Provider, Admin) against real accounts, not mocked; explicit attempts at
the specific abuse the change could enable (e.g. "can Client A read Client
B's payment proof," "can a locked-out PIN attempt still succeed," "can a
non-admin call this RPC and get anything other than a rejection").
**Required documentation**: a dedicated report, following this project's
established phase-report format, with an explicit PASS/PARTIAL/NO-GO-style
verdict and a documented threat-model section — see
`docs/phase-6/SECURITY_ORDER_UX_IMPLEMENTATION_REPORT.md`'s "RLS
Validation"/"Security Threat Model" sections as the template.
**Deployment caution**: dry-run reviewed and **explicitly confirmed by a
human** before every real migration push (this project's non-negotiable
rule, stated in `CLAUDE.md`); never batch a CRITICAL change with unrelated
work in the same migration/commit, so it can be identified and reverted
independently if needed.

## Quick self-check before starting any change

1. Does this touch `orders`/`payments`/`order_items`/`order_item_finishings`/
   `order_status_history`? → at least HIGH, likely CRITICAL.
2. Does this touch any RLS policy or a `SECURITY DEFINER` function? → CRITICAL.
3. Does this touch `SUPABASE_SERVICE_ROLE_KEY`, an Edge Function, or
   anything auth/session/PIN-related? → CRITICAL.
4. Does this only touch presentation (JSX/Tailwind classes) with no new
   data access? → LOW or MEDIUM, per the table above.
5. When in doubt, treat it as one level higher than your first instinct —
   this project's own incident history is entirely "looked fine, wasn't,"
   never "looked risky, was fine."
