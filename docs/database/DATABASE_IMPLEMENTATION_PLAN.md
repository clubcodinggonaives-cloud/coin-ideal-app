# COIN-IDEAL — Database Implementation Plan

Nothing below has been pushed to a remote project. Phases 1–2 ship as ready-to-review SQL
in this same change (`supabase/migrations/00027`–`00029`) because they're additive,
non-destructive, and directly justified by cited cahier-des-charges paragraphs or a
concrete bug found in this analysis. Phases 3–10 are designed here but intentionally
**not** written as SQL yet — each has an open question (see "Decisions Requiring
Approval" in the final report) that should get a product-owner answer first, per the
mission's instruction not to silently replace missing requirements with assumptions.

## Phase 1 — Security hardening (ready: `00027_security_hardening.sql`)

Fixes the two RLS gaps found during analysis (`DATABASE_ARCHITECTURE.md` §5):
role-escalation via `profiles_update_own`, and the admin panel's `suspendUser`/role
management being silently non-functional. Non-destructive: adds a trigger and one new
policy, changes nothing existing. Independent of every other phase — safe to apply first
and alone.

## Phase 2 — Orders / Payments / Pricing foundation (ready: `00028`, `00029`)

Implements `orders`, `order_items`, `order_item_finishings`, `finishing_options`,
`order_status_history`, `payments`, `delivery_zones`, `settings`, plus RLS, indexes, and
a `create_order()` RPC that recomputes the total server-side from live tariff data
(see §3.1/§3.2 of `DATABASE_ARCHITECTURE.md`). `00029` seeds `finishing_options`,
`delivery_zones` and `settings` with the **real values already live in the app**
(binding 150 HTG, plastification 100 HTG, agrafage 25 HTG, livraison forfaitaire 250 HTG,
majoration couleur ×1.6) moved out of `src/features/document-orders/types.ts` — not new,
invented numbers.

**Not included in this phase, by design:** migrating existing `service_requests` rows
whose `message` column holds JSON document-order payloads into the new `orders` table.
That's a data migration against rows that may or may not exist in a real environment yet;
see "Decisions Requiring Approval" — it should run once someone confirms whether any real
orders have been placed through the current JSON-in-message path.

## Phase 3 — Frontend cut-over to `orders`

Once Phase 2 is live: rewrite `useSubmitDocumentOrder` to call the new `create_order` RPC
(passing pages/copies/color/sided/finishing IDs/reception method — never a client-computed
total), update `document-orders` hooks/components to read from `orders`/`order_items`
instead of parsing `service_requests.message`, and retire
`parse-order-message.ts`/`estimate.ts`'s role as the source of truth (client-side estimate
becomes a *preview* only, confirmed by the RPC's return value). Regenerate
`src/types/database.ts`. See `FRONTEND_DATABASE_MAPPING.md` for the full before/after per
feature.

## Phase 4 — Delivery workflow

Wire `orders.delivery_zone_id` into `DeliveryOptions`/the order form once real zone data
exists (today only one flat fee is known — see Decisions Requiring Approval). Add a
`deliveries` table only if COIN-IDEAL ends up tracking delivery-run-level data (assigned
courier, route, timestamps) beyond what `orders.status`/`order_status_history` already
capture — cahier des charges §11 lists `deliveries` but the MVP acceptance criteria (§18)
only requires "le client peut choisir retrait ou livraison" and "les frais de livraison
sont correctement ajoutés", both of which `orders` + `delivery_zones` already satisfy.
Don't build `deliveries` speculatively — revisit once a Livreur role actually exists
(Phase 8).

## Phase 5 — File retention

Cahier des charges §4.2: delete order documents automatically after a configurable period
(example given: 30 days after finalisation). `00029` seeds
`settings.order_document_retention_days = 30` as the config value, but **no enforcement
exists yet** — needs a scheduled Edge Function (`pg_cron` or a Vercel/Supabase cron
trigger) that lists `orders` completed more than N days ago and calls
`storage.objects` delete on their `order_items.file_path`s. Depends on Phase 2/3 being
live first (need real `order_items.file_path` data to act on).

## Phase 6 — Notifications wiring

`notifications` table and its RLS already exist and are unused by the new order flow.
Add triggers (mirroring the existing `update_provider_rating`/`update_service_rating`
pattern) that insert a `notifications` row on `orders` status transitions, matching
cahier des charges §15's required events (reçue, paiement enregistré, confirmée, en
préparation, prête, en livraison, livrée, annulée). Pure addition, no new tables.

## Phase 7 — Reviews/ratings extension to orders

Currently `reviews.booking_id` ties a review to a `bookings` row. Once real transaction
volume runs through `orders` instead, decide whether reviews should also optionally
reference `orders.id` (e.g. "rate your last print order") — cahier des charges doesn't
require this for MVP; flagged for later, not built now.

## Phase 8 — Role system expansion (Gérant / Employé / Livreur)

Cahier des charges §10 wants 5 roles; schema has 3. **Explicitly deferred** — see
Decisions Requiring Approval. If approved: extend the `profiles.role` CHECK constraint
(cannot use a Postgres `ALTER TYPE ADD VALUE` since roles are CHECK-constrained, not an
enum type — per `00002_create_enums.sql`'s own documented reasoning, this project
deliberately avoids enum types "to keep migrations flexible and avoid ALTER TYPE issues";
follow that convention, just widen the CHECK list), then rebuild the RLS policies that
currently do `role IN ('provider','admin')` (e.g. `order_documents_staff_read`) to the
real per-role permission matrix from cahier des charges §10.

## Phase 9 — Marketplace future (multi-provider)

No schema work needed today — `provider_profiles`/`services`/`service_requests` already
support N providers; COIN-IDEAL just happens to be the only row today. When/if this
activates: nothing to migrate, just insert more `provider_profiles` rows. Worth
re-confirming RLS at that point (e.g. `service_images_write_own` already scopes correctly
per-provider), but no design changes anticipated.

## Phase 10 — AI assistant persistence (`ai_conversations`/`ai_messages`)

Cahier des charges §11: only needed "si l'historique de l'assistant est activé" — the
Gemini edge function is currently stateless by design (see its own file-footer note) and
no chat UI exists yet. Do not create these tables until a chat UI is actually being built
and a decision is made on how much history to retain per cahier des charges §14
("politique de conservation... des documents" — extend that policy to conversation
history at that time).

## Sequencing summary

| Phase | Ships now? | Blocks on |
|---|---|---|
| 1. Security hardening | ✅ `00027` | — |
| 2. Orders/payments/pricing foundation | ✅ `00028`, `00029` | — |
| 3. Frontend cut-over | Design only | Phase 2 applied + reviewed |
| 4. Delivery zones wiring | Design only | Phase 2, real zone data (TODO) |
| 5. File retention cron | Design only | Phase 2/3 live in production |
| 6. Notification triggers | Design only | Phase 2 applied |
| 7. Reviews-on-orders | Deferred | Real order volume |
| 8. Role expansion | Deferred — needs approval | Product decision |
| 9. Multi-provider marketplace | Not needed yet | Business decision to expand |
| 10. AI conversation history | Not needed yet | Chat UI being built |
