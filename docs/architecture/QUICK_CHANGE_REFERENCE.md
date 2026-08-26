# COIN-IDEAL Quick Change Reference

Consult this **before** coding. For the full table-form version of every
change type, see `docs/architecture/CHANGE_MAP.md` — this document is the
narrative "walk me through it" version for the most common requests.

---

## I want to... Add a public page

**Read**:
- `src/app/router.tsx` (see how existing public routes are declared —
  lazy-loaded, wrapped in `SuspenseWrapper`, nested under the
  `PublicLayout` route object)
- An existing simple public page, e.g. `src/pages/public/about.tsx`

**Modify**:
- `src/app/router.tsx` — add the lazy import + a new child route under the
  `PublicLayout` object
- `src/lib/constants.ts` — add the path to `ROUTES` (never hardcode the
  path string elsewhere)

**Maybe modify**:
- `src/components/layout/navbar.tsx` — if it needs a nav link
- `src/components/layout/footer.tsx` — if it needs a footer link

**Test**: navigate to the route directly (hard refresh) and via in-app
navigation; check responsive at the 8 required breakpoints; `npm run build`.

---

## I want to... Change order pricing

**Read**:
- `create_order()`'s current SQL body (`docs/architecture/DATABASE_ARCHITECTURE.md`
  has the summary; the real source is `supabase/migrations/00028`/`00030`)
- `src/features/document-orders/utils/estimate.ts` (the client-side preview)
- `settings`/`finishing_options`/`delivery_zones` tables (the actual
  configurable values — most "pricing changes" are a **data** change via
  `/admin/pricing`, not a code change at all)

**Modify**:
- If it's a value (a price, a fee, a multiplier): `/admin/pricing` UI, no
  code change, no migration.
- If it's a new **rule** (e.g. a new surcharge type): a new migration that
  redefines `create_order()` (never edit `00028`/`00030` directly — follow
  `00030`'s own pattern of `DROP FUNCTION IF EXISTS ...` then recreate with
  the new signature/logic in a new file).

**Then update**:
- `estimate.ts` to preview the same new rule, so the client-shown estimate
  doesn't silently diverge from what the RPC will actually charge.

**Test**:
- Compute the same order manually against the new rule, compare to what
  `create_order()` actually returns.
- Attempt to submit a tampered/inconsistent client state (e.g. via
  devtools) and confirm the server-computed total is what gets stored, not
  anything client-supplied.
- Confirm RLS still rejects a direct `INSERT`/`UPDATE` on `orders` (it
  always should — this table has zero client write grants).
- Full order creation E2E with a real account.

---

## I want to... Add a new database table

**Read**:
- `docs/architecture/DATABASE_ARCHITECTURE.md` for the existing schema
  shape and naming conventions (snake_case, `id UUID PK DEFAULT
  extensions.uuid_generate_v4()`, `created_at`/`updated_at` pattern)
- A recent, well-commented migration as a template — `00061` or `00060`

**Modify**:
- New file: `supabase/migrations/000XX_create_<table>.sql` (next sequential
  number — check `ls supabase/migrations/ | tail -1` first)

**Must include in the same migration** (or a same-session follow-up before
calling the feature done):
- `ENABLE ROW LEVEL SECURITY`
- At minimum a `SELECT` policy for every role that should read it — **never
  ship a table with RLS enabled but zero policies unless that's
  deliberately the point** (like `ai_rate_limits`, intentionally
  inaccessible except via its RPC)
- If money/status-critical: consider whether writes should be RPC-only
  (REVOKE table grants, like `orders`) rather than RLS-gated direct writes

**Also update**:
- `src/types/index.ts` (or `database.ts` — see
  `docs/architecture/ARCHITECTURE_RULES.md` #13 for the ambiguity between
  the two) with the new shape
- A new `src/services/<table>.service.ts` for data access
- A new `src/features/<feature>/hooks/use-<table>.ts` if it needs React
  Query integration

**Test**:
- `npx supabase db push --dry-run --linked` reviewed **before** the real
  push, then explicit confirmation, then the real push
- RLS role matrix (anon/client/provider/admin) against the new table
- `npx tsc -b`, `npx oxlint`, `npm run build`

---

## I want to... Add or modify an RPC

**Read**:
- `is_admin()`/`is_staff()` (the role-check convention — **never** inline a
  role subquery, see `docs/architecture/DECISIONS.md`'s `00048`/`00051`
  incident)
- `create_order()` or `set_pin()` as a template for a money/security-
  sensitive RPC's structure (validate → compute/check → write → return)

**Modify**:
- New migration, `CREATE OR REPLACE FUNCTION` — if changing an *existing*
  RPC's signature, follow `00030`'s pattern (`DROP FUNCTION IF EXISTS
  old_signature` first, in the same migration, before recreating)
- `REVOKE ALL ON FUNCTION ... FROM PUBLIC; GRANT EXECUTE ON FUNCTION ... TO
  authenticated;` (or `anon` too, only if genuinely needed — `check_ai_rate_limit`
  is the only RPC granted to `anon` today)
- Matching `src/services/*.service.ts` method wrapping `supabase.rpc(...)`

**Test**: call it as every role it should and shouldn't succeed for; if
it's money/status-related, also attempt the specific tampering it's meant
to prevent.

---

## I want to... Modify RLS on an existing table

**Read**: `docs/architecture/DATABASE_ARCHITECTURE.md` for the table's
current policies; `docs/architecture/DECISIONS.md` for why the
`is_admin`/`is_staff` convention exists before touching a role check.

**Modify**: new migration, `DROP POLICY "name" ON table;` then
`CREATE POLICY "name" ...` with the new logic. Never `ALTER POLICY` for a
logic change (it only supports renaming/role changes, not condition
changes) — always drop+recreate.

**CRITICAL**: this is one of the highest-risk change types in this
codebase (see `docs/architecture/CHANGE_IMPACT_MATRIX.md`). Before writing
the new policy, ask: does this need to reference `profiles.role`? If so,
use `is_admin(auth.uid())`/`is_staff(auth.uid())`, never an inline
subquery.

**Test**: the full role matrix (anonymous, Client A, Client B for
cross-tenant isolation, Provider, Admin) — not just "does it work for the
role I'm building this for," but "does it correctly reject every role that
shouldn't have access."

---

## I want to... Add a field to the order flow (delivery, payment, etc.)

**Read**: `docs/architecture/DATABASE_ARCHITECTURE.md`'s `orders` entry —
check whether an existing column can represent it before adding a new one
(e.g. delivery instructions reused `orders.notes`, which the UI never
otherwise exposed — see `00061`'s and the Phase 6 report's reasoning).

**Modify** (only if no existing column fits):
- New migration: `ALTER TABLE orders ADD COLUMN ...` (nullable or
  defaulted — never a breaking change to existing rows)
- If the new field needs to reach `create_order()`: a new migration
  redefining it with the extra parameter (see `00030`'s pattern)
- `src/types/index.ts`'s `Order` type
- `src/features/document-orders/types.ts`'s `DocumentOrderState` (client
  wizard state)
- The relevant wizard step component
  (`src/features/document-orders/components/delivery-options.tsx` or
  similar)
- `src/features/document-orders/components/order-summary.tsx` (confirmation
  display)
- Client view (`src/pages/dashboard/orders.tsx`) and staff view
  (`src/features/orders/components/staff-order-card.tsx`) if the field
  should be visible there too

**Test**: full order creation E2E with the new field populated and
unpopulated; confirm it round-trips correctly through `ORDER_SELECT`
(`src/services/orders.service.ts`).
