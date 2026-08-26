# COIN-IDEAL Change Map

**The most important document in this set.** Answers: "If I want to change
X, where do I go?" Every file referenced actually exists (see
`docs/architecture/ARCHITECTURE_DOCUMENTATION_REPORT.md` for the
verification pass). "DB Migration?"/"RLS?" columns say **No** unless a
schema/policy change is actually required — most UI changes need neither.

## UI changes

| Requested Change | Primary Files | Secondary Files | DB Migration? | RLS? | Tests |
|---|---|---|---|---|---|
| Change navbar | `src/components/layout/navbar.tsx` | `src/lib/constants.ts` (`ROUTES`) | No | No | Visual + responsive (8 breakpoints) + click-through nav links |
| Change footer | `src/components/layout/footer.tsx` | `src/lib/constants.ts` (`COMPANY`, `SOCIAL_LINKS`) | No | No | Visual |
| Change global colors | `src/index.css` (`@theme` block) | — | No | No | Check contrast, re-screenshot a few representative pages (colors are CSS variables, affect everything) |
| Change typography | `src/index.css` (`@layer base`), individual component classes | — | No | No | Visual, all breakpoints |
| Change responsive behavior of an existing page | the page file itself, e.g. `src/pages/admin/pricing.tsx` | `src/components/ui/responsive-table.tsx` if it's a table-overflow problem | No | No | Real browser at 360/390/414/768/820/1024/1280/1440 — see `docs/architecture/TESTING_ARCHITECTURE.md`; **do not** consider it done from source inspection alone |
| Add a public page | `src/pages/public/<new>.tsx`, `src/app/router.tsx` (new lazy route + `SuspenseWrapper`) | `src/lib/constants.ts` (`ROUTES`), `src/components/layout/navbar.tsx` if it needs a nav link | No (unless it needs new data) | No | Route loads, responsive, `npm run build` |
| Modify client dashboard page | `src/pages/dashboard/<page>.tsx` | matching `src/features/<feature>/hooks/use-*.ts` and `src/services/*.service.ts` | Only if new data needed | Only if new data needed | Real login as client, responsive |
| Modify admin page | `src/pages/admin/<page>.tsx` | `src/features/admin/hooks/use-admin*.ts`, `src/services/admin.service.ts` | Depends | Depends — admin-all policies aren't universal, check `docs/architecture/DATABASE_ARCHITECTURE.md` first | Real login as admin |
| Modify provider page | `src/pages/provider/<page>.tsx` | relevant feature hook/service | Depends | Depends | Real login as provider (and as admin, since admin can access `/provider/*` too) |
| Modify a form | the page/component owning it | `src/lib/validators.ts` (Zod schema), `src/components/ui/input.tsx`/`textarea.tsx`/`select.tsx` | No | No | Submit success + validation-error paths, mobile |
| Modify a modal | `src/components/ui/modal.tsx` (shared) or the specific modal (e.g. `RecordPaymentModal` in `staff-order-card.tsx`) | — | No | No | Open/close, Escape key, focus trap, mobile viewport height |
| Modify a card | `src/components/ui/card.tsx` (shared primitive) or a `src/components/shared/*-card.tsx` | — | No | No | Visual across usages |

## Authentication

| Requested Change | Primary Files | Secondary Files | DB Migration? | RLS? | Tests |
|---|---|---|---|---|---|
| Change login | `src/pages/auth/login.tsx`, `src/features/auth/services/auth.service.ts` | `src/features/auth/hooks/use-auth.tsx` | No | No | Real login, wrong-password path, redirect-by-role |
| Change registration | `src/pages/auth/register.tsx`, `supabase/functions/register/index.ts` | `src/lib/validators.ts` (`registerSchema`), `handle_new_user()` trigger if new metadata fields are needed | **Yes**, if new signup fields must be persisted (see `00057` for the pattern: extend `raw_user_meta_data` read in the trigger) | No (trigger, not RLS) | Full signup E2E with a real account, both roles |
| Change role handling | `handle_new_user()` trigger (`supabase/migrations/`), `src/features/auth/utils/dashboard-path.ts` | `DashboardLayout`'s role guard | **Yes** — new migration, never edit `00054`/`00057` directly | Possibly — any policy keying off `profiles.role` | Signup as each role, confirm `profiles.role` and redirect target |
| Change redirect (post-login/register/OAuth) | `src/features/auth/utils/dashboard-path.ts` | `login.tsx`, `register.tsx`, `callback.tsx` | No | No | Each role's redirect target |
| Change session handling | `src/services/supabase/client.ts` (client options), `src/features/auth/hooks/use-auth.tsx` | — | No | No | Full auth lifecycle: login, refresh (wait past a short window), logout |
| Add a protected route | `src/app/router.tsx` (nest under the right `DashboardLayout variant`) | — | No | Only if the route's data needs new RLS | Wrong-role redirect, right-role access |
| Add authentication security (new server-side check) | new migration + `SECURITY DEFINER` function/trigger, following `is_admin`/`is_staff` pattern | corresponding `src/services/*.service.ts` method | **Yes** | **Yes**, likely | Multi-role RLS test matrix (anon/client/provider/admin) |
| Add/modify PIN or step-up authentication | `supabase/migrations/` (new, following `00060`'s pattern), `src/services/pin.service.ts`, `src/features/auth/hooks/use-pin.ts`, `src/pages/auth/pin.tsx`, `src/features/auth/components/change-pin-card.tsx` | `src/components/layout/dashboard-layout.tsx` (gating point) | **Yes** | **Yes** | Setup, verify, lockout-after-5, change-PIN, cross-role (client never sees it) — all live, not just code review (this exact feature's own history includes 2 bugs found only by live testing) |

## Orders

| Requested Change | Primary Files | Secondary Files | DB Migration? | RLS? | Tests |
|---|---|---|---|---|---|
| Modify order creation | `supabase/migrations/` (new, extends `create_order()` — **never edit `00028`/`00030` directly**, `DROP FUNCTION`+recreate in a new file like `00030` did) | `src/services/orders.service.ts`, `src/features/document-orders/hooks/use-submit-document-order.ts` | **Yes** | Rarely (RLS on `orders` already covers SELECT; writes are RPC-gated, not RLS-gated) | Create an order end-to-end, confirm server-computed total matches expectation, confirm client cannot override it |
| Modify order status | `update_order_status()` RPC (new migration to change transition rules) | `src/services/orders.service.ts` (`updateOrderStatus`), `src/features/orders/components/staff-order-card.tsx`, `ORDER_STATUS_LABELS`/`ORDER_PICKUP_STEPS`/`ORDER_DELIVERY_STEPS` in `src/lib/constants.ts` | **Yes** | No (RPC-gated) | Every valid transition, at least one invalid-transition rejection, both client-cancel and staff-full-graph paths |
| Modify order pricing | `create_order()` RPC, `settings`/`finishing_options`/`delivery_zones` table rows (admin-editable via `/admin/pricing`, no migration needed for a **value** change) | `src/features/document-orders/utils/estimate.ts` (client preview — must track the same inputs) | Only if a new pricing *rule* (not just a value) is needed | No | Compare client preview vs. actual RPC-computed total for the same inputs |
| Modify delivery | `create_order()` RPC (fee logic), `src/features/document-orders/components/delivery-options.tsx` | `delivery_zones` table (currently empty — flat fee is the real behavior) | Only for new delivery *logic* | No | Pickup vs delivery paths, fee application |
| Modify payment method | `orders.preferred_payment_method` CHECK (new migration to add a value), `src/lib/constants.ts` (`PAYMENT_METHODS`) | `delivery-options.tsx` (payment-mode UI), `order-summary.tsx` | **Yes**, if adding a new method value | No | Full order creation with the new method |
| Add payment proof (already exists — extending it) | `submit_payment_proof()` RPC, `payment-proofs` bucket, `src/services/uploads.service.ts` | `delivery-options.tsx`, `staff-order-card.tsx` (staff review UI) | **Yes**, if extending which methods require proof or what's stored | **Yes**, if bucket/table access rules change | Proof upload + staff review, cross-tenant isolation (Client A cannot submit proof for Client B's order) |
| Modify order dashboard (client) | `src/pages/dashboard/orders.tsx` | `ORDER_SELECT` query shape in `src/services/orders.service.ts` if new fields must be shown | No, unless new columns needed | No | Responsive, real order data |
| Modify provider order processing | `src/features/orders/components/staff-order-card.tsx` (shared by provider **and** admin), `src/pages/provider/orders.tsx` | `record_payment()` RPC if payment-recording behavior changes | Only for `record_payment()` logic changes | No | Both provider and admin views (same component, `showClient` prop differs) |

## Services

| Requested Change | Primary Files | Secondary Files | DB Migration? | RLS? | Tests |
|---|---|---|---|---|---|
| Add service (as provider) | `src/pages/provider/service-new.tsx` | `src/features/services/hooks/use-service-image-picker.ts` | No | No (owner-insert policy already exists) | Create, confirm visible on own list, confirm **not** public until `is_verified` |
| Add service (as admin, on behalf of a provider) | `src/pages/admin/service-new.tsx` | `services_admin_all`/`service_images_admin_all` RLS (`00055`) — already exists, no change needed for this use case | No | No (already covered) | Admin picks provider, service appears both admin-side and (if provider verified) publicly |
| Modify service | `src/pages/provider/service-edit.tsx` (own) or extend admin with an edit page (does not exist yet — only `admin/service-new.tsx` exists, no `admin/service-edit.tsx`) | `src/services/services.service.ts` (read shape) | No | No | Edit + re-verify catalogue display |
| Modify service images | `src/features/services/hooks/use-service-image-picker.ts`, `service-edit.tsx`'s image mutations | `is_own_service()` helper if ownership-check logic changes | Only for RLS/helper changes | Only for RLS/helper changes | Upload, delete, confirm `service_images_write_own`/`_delete_own` still resolve correctly (this exact policy broke once — `00042`) |
| Modify categories | `src/pages/admin/categories.tsx` (has its own local hooks, no shared service) | — | Only for schema changes (e.g. adding a column) | No (admin-all already exists) | Create/toggle-active, confirm slug auto-generation |
| Provider-service relationship changes | `provider_profiles`/`services` FK, RLS ownership checks throughout | Every provider-scoped RLS policy references `provider_profiles.user_id = auth.uid()` — a structural change here is **HIGH/CRITICAL risk**, touches most of the schema | **Yes**, almost certainly | **Yes**, extensively | Full role matrix, see `docs/architecture/CHANGE_IMPACT_MATRIX.md` |

## Database

| Requested Change | Primary Files | DB Migration? | RLS? | Tests |
|---|---|---|---|---|
| Add table | new `supabase/migrations/000XX_create_<table>.sql` | **Yes** | **Yes** — RLS must be enabled and policies written in the same or an immediately-following migration; never ship a table without RLS | Full role matrix |
| Add column | new migration, `ALTER TABLE ... ADD COLUMN` (see `00030`/`00057`/`00061` for the established pattern — always additive, nullable or defaulted) | **Yes** | Only if the column needs different visibility than the rest of the row (e.g. `00048`'s column-level GRANT) | Confirm existing queries still work (a `select("*")` elsewhere may now expose the new column — see the PIN-hash lesson in `docs/architecture/DECISIONS.md`) |
| Modify constraint | new migration, `ALTER TABLE ... DROP CONSTRAINT` + `ADD CONSTRAINT` | **Yes** | No | Confirm no existing row violates the new constraint before applying (dry-run first) |
| Add index | new migration | **Yes** | No | Query-plan check if performance-motivated |
| Add RPC | new migration, `SECURITY DEFINER`, follow `is_admin`/`create_order` conventions (`REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO authenticated`) | **Yes** | N/A (function, not policy) — but write the authorization check *inside* the function body | Call it as every role it should and shouldn't work for |
| Modify RLS | new migration, `DROP POLICY` + `CREATE POLICY` (never `ALTER POLICY` for logic changes) | **Yes** | **Yes**, obviously | Full role matrix — this is a CRITICAL-risk change, see `docs/architecture/CHANGE_IMPACT_MATRIX.md` |
| Modify trigger | new migration, `CREATE OR REPLACE FUNCTION` (same function name, new body) — **never edit the migration that first created it** | **Yes** | Depends | Whatever event fires the trigger, both the "should fire" and "should not fire" cases |
| Seed data | `00025`-style migration if it's real, permanent business data (safe for prod); `supabase/seed.sql` if it's local-dev-only disposable data (never runs on `db push`) | Depends — see the distinction | No | Confirm which environment actually needs the data before choosing the file |

## Storage

| Requested Change | Primary Files | DB Migration? | RLS? | Tests |
|---|---|---|---|---|
| Add bucket | new migration (`INSERT INTO storage.buckets`, `ON CONFLICT DO UPDATE` — idempotent, follow `00062`'s pattern) | **Yes** | **Yes** — write the owner + staff-read policies in the same migration | Upload as owner, confirm another user/role can't read/write |
| Modify upload | `src/services/uploads.service.ts` (add/change a method), the calling component | No, unless bucket config (size/mime) must change | Only if bucket config changes | Upload success + rejected-file-type/size paths |
| Modify signed URLs | `uploads.service.ts` (`expiresInSeconds` params) | No | No | Confirm URL actually expires when expected |
| Change storage permissions | migration (`DROP POLICY`/`CREATE POLICY` on `storage.objects`) | **Yes** | **Yes** | Cross-account access attempt (should fail) |
| Payment proof storage | `payment-proofs` bucket (`00062`), `uploadPaymentProof`/`getPaymentProofUrl` in `uploads.service.ts` | Only for policy/bucket-config changes | Only for policy changes | Client A cannot read Client B's proof; staff can |
| Order document storage | `order-documents` bucket, `uploadOrderDocument`/`getOrderDocumentUrl` | Only for policy/bucket-config changes | Only for policy changes | Same pattern |

## AI

| Requested Change | Primary Files | DB Migration? | RLS? | Tests |
|---|---|---|---|---|
| Modify Gemini behavior/prompt | `supabase/functions/ai-assistant/index.ts` (business-context builder) | No | No | Redeploy (`supabase functions deploy ai-assistant`), real chat exchange |
| Modify chat UI | `src/features/ai-assistant/components/chat-widget.tsx`, `src/features/ai-assistant/hooks/use-ai-chat.ts` | No | No | Open/close, mobile full-screen, z-index vs. navbar (this exact widget had a real z-index bug once — see `DEBUGGING_PLAYBOOK.md`) |
| Modify Edge Function | `supabase/functions/ai-assistant/index.ts` | No (unless it needs new DB support) | No (unless new table access needed) | Redeploy + real call |
| Modify rate limiting | `check_ai_rate_limit()` RPC (new migration to change limits), the function's call site | **Yes** for limit changes | No | Exceed the limit, confirm rejection; confirm reset after window |
| Modify prompt/business context | `ai-assistant/index.ts`'s context-builder (reads `services`/`categories`) | No | No | Ask the assistant about the modified context, confirm it reflects reality |
| Gate chat to authenticated users only (already done — extending it) | `chat-widget.tsx` (don't render if `!isAuthenticated`), `ai-assistant/index.ts` (reject anonymous server-side too) | No | No | Anonymous visitor sees no widget AND a direct API call without a session is rejected — **both** layers matter, checking only the UI is insufficient (an anonymous visitor could otherwise call the endpoint directly with the public anon key) |

## Contact

| Requested Change | Primary Files | DB Migration? | RLS? | Tests |
|---|---|---|---|---|
| Modify contact form | `src/pages/public/contact.tsx`, `src/lib/validators.ts` (`contactSchema`) | No | No | Anonymous submission, length-boundary validation |
| Modify admin messages (view) | `src/pages/admin/messages.tsx`, `src/features/contact/hooks/use-contact.ts` | No | No | Real message list, mark-as-read |
| Modify admin reply | `src/services/contact.service.ts`, `contact_messages.admin_reply`/`replied_at` columns | Only if reply mechanism changes (e.g. real email sending instead of `mailto:`) | No | Reply saved, "Répondu le" shown |
| Add map | `src/pages/public/contact.tsx` (already added — a keyless Google Maps iframe, no API key) | No | No | Responsive iframe, no horizontal overflow at any of the 8 breakpoints |

## Deployment

| Requested Change | Primary Files | DB Migration? | RLS? | Tests |
|---|---|---|---|---|
| Vercel environment | Vercel dashboard (not in repo) | No | No | Redeploy, confirm env vars applied |
| Supabase environment (secrets) | `supabase secrets set` (terminal only, never chat) | No | No | Redeploy the function that consumes the secret |
| Edge Function deployment | `npx supabase functions deploy <name>` | No | No | Real call against the deployed function |
| Database migration deployment | `npx supabase db push --dry-run --linked` then, after explicit confirmation, `npx supabase db push --linked` | N/A (this *is* the deployment step) | N/A | Dry-run output reviewed before every real push, no exceptions |
