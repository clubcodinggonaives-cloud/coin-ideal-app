# COIN-IDEAL — Database Architecture

Status: **Phase 1 analysis output.** Nothing in this document has been applied to a
remote Supabase project. It describes what exists today, what is missing versus the
cahier des charges, and the target architecture. See `DATABASE_IMPLEMENTATION_PLAN.md`
for how to get from here to there, and `RLS_MATRIX.md` / `STORAGE_ARCHITECTURE.md` for
the security detail.

## 1. Where this project actually is

The repo is **not** a greenfield project. `supabase/migrations/00001`…`00026` already
implement a working, RLS-enabled Postgres schema (17 tables), 4 storage buckets, triggers
for `updated_at` and rating aggregation, and a Gemini edge function scaffold. The frontend
(`src/services/*.ts`, `src/features/**/hooks`) is wired against this schema and, per the
project's own commit history, was recently **repositioned** from a generic multi-provider
marketplace template ("5018d6c feat: reposition frontend as COIN-IDEAL") to the real
business described in the cahier des charges: a single company (COIN-IDEAL, Ruelle
Sajous, Gonaïves, Haïti, owner GUY Petit-Homme) offering impression, copie and vente d'eau
— not a marketplace of many independent providers.

**This is the central architectural tension to manage.** The schema is shaped like a
services marketplace (`provider_profiles`, N providers → N `services`, `service_requests`,
`bookings`, `reviews`, `message_threads`) because that's the template it was built from.
The product is a single multi-service business. Per the mission brief, the fix is **not**
to rip out the marketplace shape (it is explicitly wanted for the future — cahier des
charges §17 "ajout d'autres services multiservice", the brief's own diagram) — it's to
(a) add the tables the cahier des charges actually asks for that don't exist yet
(orders, order_items, payments, delivery config, settings), and (b) document clearly that
COIN-IDEAL currently operates as **one `provider_profiles` row** wearing a marketplace
schema, so nobody "fixes" this by accident later.

## 2. Existing schema — cartography

17 tables, all under `public`, all UUID PKs (`uuid_generate_v4()`), all RLS-enabled.

| Table | Purpose | Key relations |
|---|---|---|
| `profiles` | 1:1 with `auth.users`, role flag | PK = `auth.users.id` |
| `provider_profiles` | Business/professional profile | `user_id` → `profiles` (UNIQUE, so 1 provider profile per user) |
| `categories` | Service categories (Impression/Copie/Vente d'eau) | — |
| `services` | Catalogue items, price lives here | `provider_id` → `provider_profiles`, `category_id` → `categories` |
| `service_images` | Gallery per service | `service_id` → `services` |
| `service_availability` | Weekly opening slots per service | `service_id` → `services` |
| `addresses` | User addresses | `user_id` → `profiles` |
| `service_requests` | Generic "ask a provider for a service" request | `client_id`/`provider_id`/`service_id` |
| `bookings` | Confirmed, scheduled instance of a request | `request_id` → `service_requests` |
| `favorites` | User ↔ service bookmarks | unique (`user_id`,`service_id`) |
| `reviews` | Ratings, drives `provider_profiles.rating`/`services.rating` via trigger | `provider_id`, `service_id?`, `booking_id?` |
| `message_threads` / `messages` | 1:1 direct messaging | `participant_1 < participant_2` (dedup constraint) |
| `notifications` | In-app notification feed | `user_id` |
| `reports` | Abuse/moderation reports | polymorphic `target_type`/`target_id` (no FK — see gaps) |
| `admin_logs` | Admin action audit trail | `admin_id` |

Plus: `handle_new_user()` trigger auto-creates a `profiles` row on `auth.users` insert;
`update_updated_at()` on 5 tables; `update_provider_rating()` / `update_service_rating()`
recompute aggregates on `reviews` change; `is_admin(uid)` helper used throughout RLS.

Storage: 4 buckets (`avatars`, `service-images` public; `provider-documents`,
`order-documents` private, signed-URL only) — see `STORAGE_ARCHITECTURE.md`.

Data: `00025_seed_founding_categories.sql` (migration, not seed — safe for prod) creates
the 3 real categories. `supabase/seed.sql` (local-only, per Supabase CLI convention) creates
a disposable dev provider account and 3 test services with prices explicitly marked
`[PRIX TEST]`.

## 3. Gaps versus the cahier des charges

These are the concrete deltas between what's built and what section 11 / the workflow
sections of the cahier des charges ask for. None of them are guesses — each cites the
source paragraph.

### 3.1 No dedicated `orders` model (critical)

Cahier des charges §11 asks for `orders`, `order_items`, `payments`, `files/order_files`.
None exist. Instead, `src/features/document-orders/hooks/use-submit-document-order.ts`
serializes the entire print/copy configuration (pages, copies, color, sided, finishing
options, payment method, **and the client-computed total**) as a JSON string into
`service_requests.message` — a `TEXT` column designed for free-form chat, not structured
order data. The code's own comment says this plainly: *"en attendant un modèle `orders`
dédié (cahier des charges §11)"*. Consequences:

- No `CHECK` constraints, no FK integrity, no queryability (`WHERE color = 'couleur'` is
  impossible without parsing JSON text) on the one workflow that is the product's entire
  reason to exist.
- **No payments table at all.** The cahier des charges (§5) explicitly requires the system
  to persist "le montant, la méthode, la référence, la date et le statut du paiement" —
  none of this is stored anywhere today; `paymentMethod` is just another string field
  inside the JSON blob, with no `status`, no `reference`, no `paid_at`.
- **The order status vocabulary doesn't match the spec.** Cahier des charges §5: `EN
  ATTENTE → CONFIRMÉE → EN PRÉPARATION → PRÊTE → RETIRÉE`, or `… → EN LIVRAISON → LIVRÉE`,
  plus `ANNULÉE`. `service_requests.status` is `pending/accepted/rejected/completed/
  cancelled` — generic marketplace states with no concept of "en préparation" or "prête",
  and no distinction between pickup and delivery completion.
- **The price is never recalculated server-side.** `estimateOrderPrice()` runs entirely in
  the browser (`src/features/document-orders/utils/estimate.ts`) and its output is trusted
  and stored as-is. Nothing stops a modified client from POSTing any `estimatedTotal` it
  likes — see Security Risks below.

### 3.2 Pricing rules are hardcoded in the frontend, not admin-configurable

Cahier des charges §4.3: *"Les tarifs doivent pouvoir être modifiés sans changement de
code."* `services.price` already satisfies this for the base per-page price. But:
`FINISHING_OPTIONS` (reliure 150 HTG, plastification 100 HTG, agrafage 25 HTG),
`FLAT_DELIVERY_FEE` (250 HTG) and `COLOR_SURCHARGE_RATIO` (1.6×) all live as TypeScript
constants in `src/features/document-orders/types.ts` — changing any of them requires a
frontend deploy. These are real, currently-used business values (not invented here), just
in the wrong layer.

### 3.3 Role system is narrower than the cahier des charges' role table

Cahier des charges §10 defines 5 roles: **Administrateur, Gérant, Employé, Livreur,
Client**, each with different operational permissions (a Livreur only touches assigned
deliveries and delivery status; an Employé processes orders; a Gérant sees payments/
reports). The schema has 3: `client`, `provider`, `admin` (`profiles.role` CHECK
constraint, `00003_create_profiles.sql`). Today "provider" stands in for "COIN-IDEAL
staff" as a whole, with no distinction between the roles that would see different data
(a Livreur should not see payment reconciliation; an Employé should not manage tariffs).
**This needs a product decision before schema changes — see "Decisions Requiring
Approval" in the final report.** The MVP acceptance criteria (§18) don't explicitly
require separate Employé/Livreur logins, so expanding the role system may be premature for
the MVP even though the full cahier des charges lists it.

### 3.4 No delivery/zone model, no file retention policy, no settings table

- §5: delivery fees "peuvent être définis par zone, distance ou montant fixe" — currently
  only a flat, hardcoded fee exists, and there's no `deliveries` or `delivery_zones` table
  (cahier des charges §11 asks for both).
- §4.2: uploaded documents should be "supprim[és] automatiquement après une durée
  configurable, par exemple 30 jours après finalisation" — no retention field, no cleanup
  job exists. The bucket is correctly private (`order-documents`), but nothing ever
  deletes old files.
- §11 asks for `settings` (business-wide configuration) and `audit_logs` — `admin_logs`
  already covers the audit-log need reasonably well (same shape, different name; **do not
  create a second audit table** — see duplication note below). No `settings` table exists,
  which is why the pricing constants above ended up hardcoded in the frontend instead.
- §11 also asks for `ai_conversations`/`ai_messages` "si l'historique de l'assistant est
  activé" — currently N/A: the Gemini edge function scaffold is intentionally stateless
  (see its own file-footer comment) and no chat UI is wired up yet. No table needed until
  that changes.

### 3.5 Duplication check — none found requiring de-duplication

Per the mission's request to check for duplicated concepts (users/profiles,
providers/provider_profiles, etc.): this schema does **not** have the marketplace
duplications the brief warns about. `profiles` (auth-linked identity) vs
`provider_profiles` (business profile, 1:1 optional extension) is the standard, correct
Supabase pattern — not a duplication. `service_requests` → `bookings` is a genuine two-step
funnel (request, then a confirmed/scheduled instance), not two tables modeling the same
thing. The one real duplication-in-spirit is described above: `service_requests.message`
is being asked to do the job of `orders`/`order_items`/`payments`/`files`, which is a
**missing table**, not a duplicate one.

## 4. Target architecture (additive)

```
COIN-IDEAL (single business, Ruelle Sajous, Gonaïves)
  │
  ├─ Identity: auth.users → profiles (role: client | provider | admin*)
  │
  ├─ Catalogue: categories → services → service_images / service_availability
  │             (services.provider_id today points at COIN-IDEAL's one provider_profiles row)
  │
  ├─ Marketplace scaffolding (kept, currently single-tenant in practice):
  │     provider_profiles, service_requests, bookings, reviews, message_threads/messages,
  │     favorites — ready to support multiple providers if COIN-IDEAL becomes a
  │     multi-agency/multi-provider platform later (cahier des charges §17).
  │
  └─ NEW — core transactional domain (this phase's proposed additions):
        orders → order_items (+ order_item_finishings) → payments
               → order_status_history
        finishing_options, delivery_zones, settings   (admin-configurable pricing/config)
```

`orders` is scoped to the impression/copie (and, later, any other COIN-IDEAL service)
transactional flow the cahier des charges describes end-to-end, using its exact status
vocabulary. It does **not** replace `service_requests`/`bookings` — those stay as the
generic "ask this provider about this service" marketplace primitive, useful once/if
COIN-IDEAL becomes multi-provider. See `DATABASE_IMPLEMENTATION_PLAN.md` for the phased
rollout and `DATABASE_SCHEMA.md` for the full ERD and column-level design of every new
table.

## 5. Security posture — headline findings

Full detail in `RLS_MATRIX.md` and the final report's "Security Risks" section. The two
that matter most:

1. **Privilege escalation via `profiles_update_own`.** The policy is
   `USING (auth.uid() = id) WITH CHECK (auth.uid() = id)` — it authorizes the *row*, not
   the *columns*. Any authenticated user can currently run
   `supabase.from('profiles').update({ role: 'admin' }).eq('id', <own id>)` directly from
   the browser console and become an admin. No trigger or column-level GRANT stops this
   today.
2. **`adminService.suspendUser()` doesn't actually work against another user.** It calls
   `profiles.update({ role: 'client' }).eq('id', userId)` as the *admin's own* authenticated
   session — but no RLS policy on `profiles` allows updating a row that isn't your own,
   admin or not. The call silently affects 0 rows. The admin panel's user-role management
   is non-functional today, independent of finding 1.

Both are fixed together in the proposed `00027_security_hardening.sql` migration
(Phase 1 of the implementation plan): a role-change guard trigger (blocks non-admins from
changing `role`, regardless of which policy let the `UPDATE` through) plus a genuine
`profiles_admin_all` policy so admin actions work as intended.
