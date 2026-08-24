# Phase 5F.1 — Security Remediation: HIGH Finding

Scope: **only** finding H1 from `docs/phase-5/PHASE_5F_SECURITY_REPORT.md`. No other finding
from that report was touched. No broad refactor. Project identity verified before any
remote operation (`supabase projects list` → only `qqibjglnvcezqbogkvlg` linked;
`dcsnmvbtsmdbwrwbutph` never referenced or touched).

---

## Finding

**H1 (HIGH) — Anonymous can enumerate every user's email address and role.**

Original report text: *"Any unauthenticated visitor can dump the entire `profiles` table —
every registered client, provider, and admin's email address and role, no rate limit on
this endpoint beyond Supabase's platform-wide defaults."*

Reproduced again, fresh, before touching anything:
```
GET https://qqibjglnvcezqbogkvlg.supabase.co/rest/v1/profiles?select=id,email,role,phone,bio,first_name,last_name,avatar_url
(apikey header only — no Authorization, i.e. a genuine unauthenticated request)

→ 200
[
  {"id":"f0000000-...","email":"qa-client@coin-ideal-qa.test","role":"client", ...},
  {"id":"a1000000-...","email":"qa-provider@coin-ideal-qa.test","role":"provider", ...},
  {"id":"47fda6af-...","email":"clubcodinggonaives@gmail.com","role":"admin",
   "first_name":"Guy","last_name":"Petit-Homme", ...}
]
```
This reproduction is worse than the original report's evidence: it now includes the real
admin account's real email and full name (`clubcodinggonaives@gmail.com`, Guy Petit-Homme),
not just QA test accounts — confirming this is live, current, production PII exposure, not
a theoretical or fixture-only artifact.

---

## Root Cause

Two layers stack to produce the exposure — both had to be inspected, per the brief, rather
than assuming the frontend was the boundary (it never queries `email`/`role` for other
users, but that was never the actual control):

1. **`00026_grant_api_roles.sql`**: `GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon` —
   a table-level grant. This is a Postgres/PostgREST prerequisite (RLS decides which *rows*
   a role may see; the GRANT decides whether it may touch the table *at all*), applied
   blanket to every table including `profiles`.
2. **`00020_create_rls_policies.sql`**: `profiles_select_public ON public.profiles FOR
   SELECT USING (true)` — every row visible to every role once the row-level check runs.
   RLS operates on rows, not columns, so it cannot narrow which columns come back once a row
   passes.

Combined: `anon` has table-level SELECT (#1) and every row passes the RLS check (#2), so
every column of every row — `email`, `role`, `phone`, `bio` included — is retrievable.
Neither a view, an RPC, nor a separate API surface is involved; this is the base table
queried directly, and it is also how every current frontend nested-embed query
(`reviewer:profiles(*)`, etc.) reaches the same table.

`profiles_select_public` exists for a real reason, not by mistake: `first_name`/
`last_name`/`avatar_url` for *any* profile (not just providers) is genuinely needed
publicly — `reviews_select_public` (00020) already lets anonymous visitors read reviews,
and the review author is typically a **client**, not a provider, so narrowing which *rows*
are public (e.g. `role = 'provider'`) would have broken that already-working feature. The
defect is specifically that the *columns* were never narrowed for the public case.

---

## Fix

**Database-level, not frontend-level** — verified to remain effective when Supabase is
queried directly, bypassing the React app entirely (see Attack Tests).

Column-level `REVOKE`/`GRANT` (Postgres native, not RLS): removes `anon`'s blanket
table-level SELECT on `profiles` and replaces it with SELECT on exactly the four columns
the public UI actually consumes (`provider-card.tsx`, `review-card.tsx`):

```sql
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, first_name, last_name, avatar_url) ON public.profiles TO anon;
```

No RLS policy was changed — `profiles_select_public USING (true)` is untouched, since the
row-level need (any profile's public-safe fields, for the reviews feature) was already
correct; only the column dimension was over-broad. `authenticated` and `service_role`
grants are untouched (see Residual Risk — this was a deliberate scope decision, not an
oversight).

**Required follow-through, not scope creep:** this DB change makes any query for a
non-granted column fail outright for `anon` (see Root Cause of the regression below), which
broke the one real anonymous-facing feature that asked for more than it needed:
`reviews.service.ts` requested `reviewer:profiles(*)` (all columns) to show a reviewer's
name/avatar on the public `/service/:id` and `/provider/:id` pages. Narrowed to
`reviewer:profiles(id, first_name, last_name, avatar_url)` — the exact columns
`review-card.tsx` renders — in the same file, all 4 call sites, for consistency (the other
3 are authenticated-only paths unaffected by the `anon` grant change, but there was no
reason to leave them requesting columns they don't use either). No other file needed
changes — every other `profiles(*)`/`profiles:profiles(*)` embed in the codebase
(`orders.service.ts`, `bookings.service.ts`, `messages.service.ts`, `favorites.service.ts`,
`admin.service.ts`) sits behind RLS that already requires authentication, so `authenticated`
role's unchanged full grant keeps them working exactly as before.

---

## Migration

- `supabase/migrations/00048_restrict_public_profile_columns.sql` — the fix itself.
- `supabase/migrations/00049_phase5f1_regression_fixtures.sql` /
  `00050_phase5f1_regression_cleanup.sql` — temporary accounts/service created solely to
  run the regression pass below, removed immediately after (verified — see Validation).
- No previously-applied migration was edited. No reset. No history rewrite.
- Dry-run (`supabase db push --linked --dry-run`) confirmed each migration was the *only*
  one pending before every real push, per this project's standing discipline.

---

## Validation

**Before the fix** (reproduction above): `email`, `role`, `phone`, `bio` all returned for
every user, unauthenticated.

**After the fix:**

| Request (anonymous) | Before | After |
|---|---|---|
| `select=id,email,role,phone,bio,first_name,last_name,avatar_url` (original exploit) | `200`, full data | `401` `permission denied for table profiles` |
| `select=*` | `200`, full data | `401` `permission denied` |
| No `select` param (PostgREST default `*`) | `200`, full data | `401` `permission denied` |
| `select=email` only | `200`, email | `401` `permission denied` |
| `select=role` only | `200`, role | `401` `permission denied` |
| `?email=eq.clubcodinggonaives@gmail.com&select=id` (enumeration via filter predicate) | `200`, matched | `401` `permission denied` |
| `select=id,first_name,last_name,avatar_url` (the intended public fields) | `200` | **`200`, unchanged** — legitimate access preserved |

A real review was created (as the authenticated `qa-client` account) and then read back
**anonymously** through the fixed `reviewer:profiles(id, first_name, last_name,
avatar_url)` embed: `200`, reviewer's name and avatar present, `email`/`phone`/`bio`/`role`
absent from the embedded object — confirmed the public review-display feature genuinely
still works end to end, not just that the query no longer errors. Test row deleted after.

Own-profile access re-verified unaffected: an authenticated user reading `select=*` on
**their own** `profiles` row still returns every column (`200`, full row including
`email`/`role`) — `profiles_select_own` combined with `authenticated`'s untouched
table-level grant.

---

## Attack Tests

Re-run of the original exploit and every variant Step 5 asked for, against the live
`qqibjglnvcezqbogkvlg` project, unauthenticated:

| Test | Expected | Result |
|---|---|---|
| Retrieve all users (`select=*`) | DENIED or public-only fields | **DENIED** (`401`) |
| Retrieve `email` | DENIED | **DENIED** (`401`) |
| Retrieve `role` | DENIED | **DENIED** (`401`) |
| Enumerate via filter predicate (`email=eq....`) | DENIED | **DENIED** (`401`) — filtering by a column you can't select is rejected the same as selecting it |
| Alternate path: nested embed (`reviews?select=*,reviewer:profiles(*)`) | DENIED for the ungranted columns | **DENIED** (`401`, same `permission denied for table profiles`) — confirms the fix holds through PostgREST's embedding layer too, not just direct table queries |
| Public-safe fields only (`id,first_name,last_name,avatar_url`) | ALLOWED | **ALLOWED** (`200`) |

Every test used a real unauthenticated HTTP request against Supabase directly (no browser,
no frontend involved) — satisfies "must remain effective if an attacker bypasses the
frontend."

---

## Regression Tests

Re-ran the Phase 5F CRITICAL/role-boundary controls the brief named explicitly, using fresh
temporary fixtures (a second client, an admin account, a test service — `00049`/`00050`):

| Control | Result |
|---|---|
| Anonymous access (settings write) | **PASS** — still denied |
| Client isolation (Client B reading Client A's order) | **PASS** — still denied |
| Provider access (staff reading any order — positive control) | **PASS** — still works |
| Admin access (`admin_logs` — positive control) | **PASS** — still works |
| Order ownership (Client B vs. Client A's order) | **PASS** — still denied |
| Document ownership (Client B signing a URL for Client A's document; staff positive control) | **PASS** — both still correct |
| Role escalation (client self-promoting to admin) | **PASS** — still denied (`enforce_profile_role_change` trigger, 00027, untouched) |
| Price tampering (`create_order` with a smuggled `unit_price`) | **PASS** — server still recomputes (3 pages × 2 copies × 1 HTG = 6 HTG, ignoring the tampered value) |

**One side effect found and documented, not silently absorbed:** anonymous requests to
`orders` (and by the same pattern, `order_items`/`order_item_finishings`/
`order_status_history`/`payments`) now return `401 permission denied` instead of `200 []`.
Root cause: `orders_select_staff` and siblings (`00028`) do a raw
`EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN
(...))` subquery rather than going through the `is_admin()`-style `SECURITY DEFINER`
pattern — for the `anon` role, evaluating that subquery now itself hits the same
column-permission wall (`profiles.role` no longer granted to `anon`), before RLS even gets
to return "no matching rows." **No new data exposure**: zero order rows reached `anon`
before this fix and zero reach it after — only the HTTP status/error shape changed
(`200 []` → `401`). No real user flow is affected — the actual application never queries
`orders`/`payments`/etc. as an anonymous visitor; every real path to those tables already
requires login. Listed here in full rather than quietly adjusting the test to hide it.

---

## Residual Risk

1. **The same over-exposure exists for the `authenticated` role, untouched by this fix.**
   `profiles_select_public USING (true)` has no `TO` role qualifier, and `authenticated`
   still has the full, unrestricted table-level grant from `00026`
   (`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES ... TO authenticated`). Verified
   live: a plain logged-in client account can still read `email`/`role` for *any other*
   user, including the real admin account:
   ```
   (as qa-client) GET /profiles?email=eq.clubcodinggonaives@gmail.com&select=email,role
   → 200 [{"email":"clubcodinggonaives@gmail.com","role":"admin"}]
   ```
   Registration is open and free, so this is trivially reachable by anyone willing to sign
   up — a determined attacker is not meaningfully slowed down by the `anon` fix alone.
   **Deliberately not fixed in this phase**: the finding as written, and the task's explicit
   scope, name "unauthenticated"/"anonymous" specifically; extending the same column-grant
   treatment to `authenticated` needs its own check of every authenticated query path
   (dashboards, provider/admin views that legitimately need broader profile data than a
   public visitor) before narrowing it, which is exactly the kind of broader review this
   phase was told not to do. Recommend it as the very next remediation phase.
2. **The `orders`/`payments`/etc. `401`-instead-of-`200-empty` side effect** (see Regression
   Tests) is cosmetic from a security standpoint but is a real, live change in API error
   shape for that whole family of tables when queried anonymously. Not a vulnerability;
   worth a follow-up pass replacing the raw `profiles.role` subqueries in those policies
   with the `is_admin()`/a `is_staff()` `SECURITY DEFINER` equivalent, both for consistency
   with how `is_admin()` is already used elsewhere and to avoid this exact class of surprise
   the next time a `profiles` grant changes.
3. **`created_at`/`updated_at` on `profiles` are now also hidden from `anon`** (they were
   never consumed by any public component, confirmed by search) — a strictly tighter
   default, not a regression, but noting it since it's a small, deliberate behavior change
   beyond the literal finding.

---

## Verdict

**PASS.**

The confirmed HIGH finding is fixed at the database/grant layer, verified to hold when
Supabase is queried directly (not just through the frontend), the one genuinely affected
legitimate feature (public review display) was found and repaired rather than left broken,
and every previously-passing Phase 5F control that was re-run still passes. One new,
non-exploitable side effect (error-shape change on anonymous order-table queries) was found
during regression testing and is fully documented above rather than omitted. The
`authenticated`-role version of the same underlying issue remains open and is explicitly
flagged as the next priority, not silently left for someone else to rediscover.

No MEDIUM finding from Phase 5F was implemented in this phase, per the stop condition. No
production deployment beyond the standard Vercel auto-deploy-on-push this project has used
all session (same as every prior phase) — no new deployment action was taken.
