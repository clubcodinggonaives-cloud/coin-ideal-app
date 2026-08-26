# Phase 6 — Implementation Plan

Contact map, admin/provider session security (idle timeout + 6-digit PIN
step-up), responsive fixes on `/admin/pricing` and `/dashboard/orders`, and
a payment-proof / pay-in-person / delivery-address upgrade to the order flow.

Investigation performed via 3 parallel read-only audits (auth/session
architecture + admin pricing/dashboard orders responsive state; orders/
payments/addresses/delivery_zones schema + RLS + RPCs + storage buckets;
contact page + map/location constants) before any code was written, per
this phase's own requirement.

## 1. Existing implementation, per feature

| Feature | Existing implementation |
|---|---|
| Contact map | None. `contact.tsx` renders the address as plain text only. |
| Idle timeout | None. No activity tracking, no timeout concept anywhere in `src/`. |
| PIN / 2FA | None. Supabase's native `[auth.mfa]` (TOTP/phone/WebAuthn) exists in `config.toml` but is fully disabled and unrelated to a PIN. |
| Admin pricing responsive | Zero Tailwind breakpoint classes in the entire 330-line file. |
| Dashboard orders responsive | Partially responsive — `OrderCard`'s header already has a `sm:flex-row` breakpoint; the page-level header does not. |
| Payment mode | `orders.preferred_payment_method` (`cash\|moncash\|natcash\|transfer`) already captured as an intent at order creation, but with no proof-submission flow and no in-person vs. proof UI distinction. |
| Delivery | `reception_method` (`pickup\|delivery`), `delivery_address_id`, `delivery_zone_id`, `delivery_fee` all exist and are correctly computed server-side by `create_order()`. The client-facing form only captures delivery address as **free text** and creates a throwaway `addresses` row on submit — no saved-address picker exists. |

## 2. Existing database support

- `orders` (created `00028`, altered `00030` to add `preferred_payment_method`): `id, client_id, service_id, status, reception_method, delivery_address_id, delivery_zone_id, delivery_fee, subtotal, total, notes, cancelled_reason, ready_at, completed_at, created_at, updated_at, preferred_payment_method`.
- `payments` (unchanged since `00028`): `id, order_id, amount, method, reference, status, recorded_by, paid_at, created_at`.
- `addresses` (`00010`, never altered): `id, user_id, label, street, city, state, zip_code, country, latitude, longitude, is_default, created_at` — **no `phone` column**.
- `delivery_zones` (`00028`): `id, name, fee, is_active, created_at` — **exists but has zero rows** (deliberately, per `00029`'s comment: no real zone list confirmed by the business yet). `create_order()` already falls back to `settings.flat_delivery_fee` when no zone is given.
- `profiles`: `id, email, first_name, last_name, phone, avatar_url, bio, role, created_at, updated_at` — no PIN/MFA columns.
- RPCs (all `SECURITY DEFINER`, the only sanctioned write path — direct `INSERT/UPDATE/DELETE` on `orders`/`payments` is `REVOKE`d from `authenticated`/`anon`): `create_order()`, `update_order_status()`, `record_payment()`.
- Storage buckets: `avatars` (public), `service-images` (public), `provider-documents` (private, owner+admin), `order-documents` (private, owner+staff-read-all) — **no payment-proof bucket**.
- Role-check convention: `is_admin(uid UUID)` / `is_staff(uid UUID)`, both `SECURITY DEFINER STABLE SQL` — the mandatory pattern for any new role-gated check, established after a real production incident (`00051`) caused by inlining role subqueries directly in RLS policies instead.

## 3. Missing database fields/tables

- `profiles`: `pin_hash`, `pin_set_at`, `failed_pin_attempts`, `pin_locked_until`.
- `orders`: `payment_proof_path`, `payment_reference`, `payment_proof_submitted_at`.
- `addresses`: `phone`.
- New storage bucket: `payment-proofs`.
- New RPCs: `set_pin`, `verify_pin`, `submit_payment_proof`.

No new tables are required — every gap is an additive column or a new
`SECURITY DEFINER` function on top of tables that already exist.

## 4. Existing security rules that must be preserved

- `orders`/`payments` have zero direct write grants for `authenticated`/`anon` — any new write path must be a new `SECURITY DEFINER` RPC, never a direct table write from the frontend.
- `create_order()`'s pricing logic (subtotal, finishing costs, delivery fee via zone-or-flat-fallback, total) is the sole source of truth for money and is **not modified** by this phase — the payment-proof and address changes are additive fields alongside it, not replacements.
- All private storage buckets use owner-path-scoped RLS (`(storage.foldername(name))[1] = auth.uid()::text`) plus a staff-read policy via `is_staff()`/`is_admin()` — the new `payment-proofs` bucket follows the identical pattern.
- Role checks must go through a `SECURITY DEFINER STABLE SQL` function taking `uid UUID`, never an inline `EXISTS (...)` subquery directly in a policy (per the `00051` incident).

## 5. Required frontend changes

Contact page map; a new idle-timeout hook wired into `DashboardLayout`; a
new PIN setup/verify page gating the admin/provider dashboard; responsive
class fixes on `admin/pricing.tsx` and `dashboard/orders.tsx`; a
payment-mode UI (in-person vs. proof cards) and a real saved-address picker
in the order flow; extended order-summary, client order card, and staff
order card to surface the new fields. Full file list in the "Files touched"
section below.

## 6. Required backend/Supabase changes

Two to three new migrations (PIN columns + RPCs; payment-proof columns +
RPC + `addresses.phone`; new storage bucket + its RLS — may be combined or
split for clarity during implementation) and zero changes to any existing
migration file.

## 7. Required RLS changes

- New `payment-proofs` bucket RLS (owner + staff-read, mirroring `provider-documents`).
- No changes to any existing RLS policy on `orders`, `payments`, `addresses`, or `delivery_zones` — all new behavior is additive (new columns + new RPCs), the existing SELECT/INSERT/UPDATE/DELETE policies on these tables remain correct and untouched.

## 8. Required tests

Real Playwright browser QA at 360/390/414/768/820/1024/1280/1440 on
`/contact`, `/admin/pricing`, `/dashboard/orders`, `/order/document`,
`/provider/orders`, `/admin/orders`; real multi-account RLS verification
(anonymous, Client A, Client B, Provider, Admin) for every new RPC/bucket;
real PIN setup/verify/lockout flow; idle-timeout firing (shortened test
threshold, clearly labeled as such rather than a literal 1-hour wait);
full order creation end-to-end for both payment paths; `tsc -b`, `oxlint`,
`npm run build`; regression pass on login/register/Google OAuth/existing
order flow.

## 9. Potential regressions

- Idle-timeout logic must never fire for `client`-role sessions (explicitly out of scope) or misfire during active use due to under-throttled event tracking.
- Gating the admin/provider dashboard behind a new PIN screen must not break the existing `DashboardLayout` auth/role redirect logic (unauthenticated → login, wrong role → `/dashboard`) — the PIN check is an additional layer after those, not a replacement.
- Replacing the free-text delivery address with a saved-address picker must not break existing orders that already reference a throwaway `addresses` row created under the old flow — those rows remain valid, only new submissions change behavior.
- Reusing `create_order()`'s existing `p_notes` parameter for delivery instructions must not collide with any other current use of `notes` — confirmed unused by the current order-creation UI before this reuse.

## Implementation order

1. This document.
2. Contact map (isolated, no schema).
3. Admin pricing + dashboard orders responsive fixes (isolated, no schema).
4. PIN step-up migration + RPCs + UI + idle timeout (security core).
5. Payment-proof + address-phone migration + RPC + bucket + order-flow UI + summary/client/staff view updates.
6. Full regression + RLS threat-model verification + screenshots.
7. `docs/phase-6/SECURITY_ORDER_UX_IMPLEMENTATION_REPORT.md`.

See prior conversation / commit history for the detailed per-feature design
(exact SQL, exact component structure) — this document records the analysis
and decisions; implementation commits carry the specifics.
