# COIN-IDEAL Architecture Rules

Rules 1–9 are **EXISTING** — they describe enforced or consistently-followed
patterns, with the file/migration that enforces or demonstrates each. Rules
marked **RECOMMENDED** are not yet universally enforced; they describe where
the codebase should converge.

1. **Never write to `orders`/`order_items`/`order_item_finishings`/
   `order_status_history`/`payments` directly from the frontend.** These
   tables have `INSERT`/`UPDATE`/`DELETE` `REVOKE`d from `authenticated`/
   `anon` (`supabase/migrations/00028_create_orders_payments_pricing.sql`).
   All writes go through `create_order()`, `update_order_status()`,
   `record_payment()`, or `submit_payment_proof()` (`00061`) —
   `SECURITY DEFINER` functions that recompute money and validate status
   transitions server-side. **EXISTING**, database-enforced (not just
   convention).

2. **Use `src/services/*.service.ts` for all Supabase data access** — one
   class per domain, exported as a singleton instance. Hooks and pages
   never call `supabase.from()`/`supabase.rpc()`/`supabase.storage` directly.
   **EXISTING**, consistently followed across ~20 service files; the one
   structural exception is `src/features/auth/services/auth.service.ts`,
   kept feature-nested because of its tight coupling to `AuthProvider`.

3. **Use a `use-*.ts` hook (TanStack Query) as the bridge between a service
   and a component** — `useQuery`/`useMutation`, with `queryClient.invalidateQueries`
   on mutation success scoped to the relevant query key. **EXISTING**
   convention across every `src/features/*/hooks/use-*.ts` file.

4. **Keep authoritative financial calculations server-side.** The frontend
   (`src/features/document-orders/utils/estimate.ts`) computes a *preview*
   total for UX only; `create_order()` recomputes subtotal, finishing
   costs, and delivery fee from `services.price`/`finishing_options.cost`/
   `settings.flat_delivery_fee`/`delivery_zones.fee` and stores that
   result — never the client-submitted estimate. **EXISTING**, confirmed
   by reading `create_order()`'s SQL body.

5. **Never expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend, git, logs, or
   chat.** It exists only as an Edge Function secret
   (`supabase secrets set`), used inside `supabase/functions/register/index.ts`
   and available implicitly to any future Edge Function. **EXISTING**, and
   additionally a hard operational rule followed throughout this project's
   own development sessions (see `docs/phase-6/QA_TEST_ACCOUNTS_CLEANUP_REPORT.md`
   for a worked example of a task that intentionally stopped rather than
   requesting this secret through chat).

6. **Never bypass RLS.** Every table has RLS enabled
   (`00020_create_rls_policies.sql` and per-table policies added since).
   Where a role-based check is needed inside a policy, use a
   `SECURITY DEFINER STABLE SQL` helper function (`is_admin(uid)`,
   `is_staff(uid)`) — **never** inline an `EXISTS (SELECT ... profiles.role
   = ...)` subquery directly inside a policy. **EXISTING rule, with a
   documented incident behind it**: `00051_fix_admin_policy_profiles_regression.sql`'s
   own comment explains that Postgres evaluates every permissive policy's
   condition regardless of short-circuit `OR`, so an inline subquery
   referencing a table without its own safe default can break anonymous
   access in ways a wrapper function avoids.

7. **Never edit a migration that has already been applied to the linked
   project.** Always add a new, forward-fixing migration. **EXISTING**,
   stated in `CLAUDE.md` and demonstrated repeatedly (`00042`, `00051`,
   `00059` are all forward-fixes of earlier migrations' bugs, never edits).

8. **Do not duplicate business logic between the client-side estimate and
   the server-side RPC.** When a pricing rule changes, it changes in the
   RPC/`settings`/`finishing_options`/`delivery_zones` table first; the
   frontend estimate is a display convenience that should track the same
   inputs, not reimplement independent rules. **EXISTING** intent,
   confirmed by `estimate.ts`'s own comments referencing the RPC as the
   source of truth.

9. **Keep role authorization enforced server-side (RLS/RPC), never only in
   the frontend router guard.** `DashboardLayout`'s role check
   (`src/components/layout/dashboard-layout.tsx`) is a UX convenience that
   prevents an unauthorized user from seeing a dashboard shell they can't
   use — it is not the security boundary. The real boundary is RLS. This
   is explicitly why, for example, a client role never sees the
   provider/admin dashboard shell, but even if that check were bypassed
   client-side, RLS would still block any actual data read/write beyond
   what the client role's policies allow. **EXISTING**, verified in
   practice: `docs/phase-6/SECURITY_ORDER_UX_IMPLEMENTATION_REPORT.md`'s
   RLS threat-model section tests exactly this distinction for the PIN
   elevation marker.

10. **Keep reusable, domain-agnostic UI in `src/components/ui/`; keep
    feature-specific UI inside its feature's `src/features/<feature>/components/`
    directory.** **EXISTING** convention — see
    `docs/architecture/DIRECTORY_MAP.md` for the exact boundary and its one
    documented cross-cutting exception (`PinGate`).

11. **A new reusable, cross-page pattern found while fixing one page should
    become a shared primitive, not be repeated per-page.** **EXISTING**,
    demonstrated by `src/components/ui/responsive-table.tsx` (built once
    during the Phase 5H responsive pass, then applied to all 5 pages that
    had the same hand-rolled-table mobile-overflow problem, rather than
    patched five separate times).

12. **Add real, live-tested verification for any security-sensitive
    change** (RLS, RPC, Storage policy, auth flow, PIN, idle timeout,
    payment) — not just a code read-through. **EXISTING** practice
    throughout this project's phase reports: e.g. the PIN lockout, the
    idle-timeout redirect race, and the "verify provider" button's silent
    no-op were all found by live Playwright testing with real accounts, not
    by static review. **RECOMMENDED**: formalize this into a checklist
    (see `docs/architecture/CHANGE_IMPACT_MATRIX.md`'s HIGH/CRITICAL rows)
    rather than relying on each session to remember to do it.

13. **RECOMMENDED**: standardize `src/types/` on one CLI-generated schema
    file (`supabase gen types typescript --linked`) plus hand-written
    extension types, instead of the current two hand-maintained files
    (`index.ts`, `database.ts`) whose relationship isn't documented. See
    `docs/architecture/ARCHITECTURE_DOCUMENTATION_REPORT.md`.

14. **RECOMMENDED**: narrow `authService.updateProfile()`'s parameter type
    to exclude `role`/`id`/`email` at the TypeScript level, not just rely
    on the database trigger (`00027`) to reject a role change at runtime —
    catch the mistake at compile time too. Flagged originally in
    `docs/database/FRONTEND_DATABASE_MAPPING.md`, not yet applied.

15. **RECOMMENDED**: before introducing a second Supabase project or
    environment, re-confirm project identity via at least two independent
    sources (`.env`'s project ref, `supabase/.temp/project-ref`,
    `supabase projects list`) before running any destructive operation —
    demonstrated as a real, followed practice in
    `docs/phase-6/QA_TEST_ACCOUNTS_CLEANUP_REPORT.md`, worth keeping as an
    explicit rule rather than session-specific caution.
