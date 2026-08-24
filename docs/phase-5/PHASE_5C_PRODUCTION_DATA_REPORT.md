# Phase 5C — Production Business Data Validation

Read-only audit against the real Supabase Cloud project (`qqibjglnvcezqbogkvlg`). Every
value below was queried live via REST with the anon key (the same access level the public
site itself has) on 2026-08-24 — nothing here is inferred from migrations or seed files.
**No schema was modified, no data was written, nothing was deployed.**

One access caveat worth stating up front: the anon key only sees rows that pass public
RLS (`is_active = true` for categories/services, no filter for finishing_options queried
here since all 3 are active). If an inactive draft row exists anywhere, this audit
wouldn't see it — there's no strong reason to suspect one does (nobody has used
`/provider/services` yet), but it's an honest limit of what anon-level querying can prove.

## Verified Values

### Categories — ✅ all 3 present, matching the cahier des charges exactly
| Name | Slug | Description | Active |
|---|---|---|---|
| Impression | `impression` | "Impression noir & blanc ou couleur, formats A4/A3, simple face ou recto-verso." | ✅ |
| Copie | `copie` | "Copie noir & blanc ou couleur de vos documents, à l'unité ou en grande quantité." | ✅ |
| Vente d'eau | `vente-eau` | "Produits d'eau disponibles à COIN-IDEAL — vitrine publicitaire, sans commande en ligne." | ✅ |

`image_url` is `null` on all three — no category images have been uploaded. Not a bug (the
column is nullable, the UI handles a missing image), just unconfigured.

### Services — ⚠️ TODO / REQUIRED BUSINESS INPUT
**Zero active services exist in production.** The `services` table returns `[]`. This
matches what the live Gemini assistant already told a real user this session ("Les tarifs
de base... ne sont pas encore publiés") — not a bug, a genuine gap. Per README's
"Données de démarrage" section, this is the expected state until real prices are entered
via `/provider/services`. **Nothing to display on `/services`, `/tarifs`, or `/commander`
until this is done** — those pages will correctly show their empty states, not broken
ones, but the site has no purchasable catalogue yet.

### Finishing options — ✅ all 3 present, real values (not placeholders)
| Label | ID | Cost | Active |
|---|---|---|---|
| Reliure | `binding` | 150.00 HTG | ✅ |
| Plastification | `lamination` | 100.00 HTG | ✅ |
| Agrafage | `stapling` | 25.00 HTG | ✅ |

These are the real values that were already live in the product before Phase 3 moved them
from a frontend constant into this table — not invented then, not invented now.

### Delivery — ⚠️ partially configured
- `delivery_zones` table: **empty**. No zone-specific pricing exists — every delivery
  order falls back to the flat fee below.
- `settings.flat_delivery_fee` = **250 HTG** — configured, real (same provenance as
  finishing options above).
- Pickup: not a database value — `orders.reception_method = 'pickup'` is always free by
  construction (`create_order()` never adds a delivery fee unless
  `reception_method = 'delivery'`), matching cahier des charges §5 ("Le retrait est
  gratuit"). Nothing to verify here beyond the code path, which is correct.

### Company — ⚠️ significant gaps, marked, not filled

| Field | Value found | Source | Status |
|---|---|---|---|
| Name | "COIN-IDEAL Multi-Service" | `provider_profiles.business_name` | ✅ Verified |
| Address | "Ruelle Sajous, Gonaïves, Haïti" | `provider_profiles.location` | ✅ Verified |
| City | "Gonaïves" | (part of `location` above) | ✅ Verified |
| Country | "Haïti" | (part of `location` above) | ✅ Verified |
| Owner | "Guy Petit-Homme" | `profiles.first_name`/`last_name` on the real admin account | ✅ Verified |
| Phone | — | `profiles.phone` = `null` for the real account; no company-level phone field exists anywhere | ❌ **TODO / REQUIRED BUSINESS INPUT** |
| Email | "contact@coin-ideal.com" (frontend only) | Hardcoded in `src/lib/constants.ts`, **not stored anywhere in the database** | ⚠️ **TODO / REQUIRED BUSINESS INPUT** — see Inconsistencies below |
| Opening hours | — | Not in the database. Not in the frontend either. | ❌ **TODO / REQUIRED BUSINESS INPUT** — also already flagged inside the `ai-assistant` Edge Function's own code comments as missing |
| WhatsApp | — | `COMPANY.whatsapp = ""` in constants.ts, correctly left blank | ❌ **TODO / REQUIRED BUSINESS INPUT** |

## Inconsistencies Found

1. **`COMPANY.email` ("contact@coin-ideal.com") has no database source of truth and no
   confirmed owner.** The real admin account that actually exists uses
   `clubcodinggonaives@gmail.com` — a different address. Nothing proves
   `contact@coin-ideal.com` is a real, monitored inbox; it may have been a placeholder
   carried over from the cahier des charges' template framing rather than a confirmed
   business decision. **Not changed here** — this is a business decision (does GUY want a
   dedicated `contact@coin-ideal.com` inbox set up, or should the public-facing contact
   email simply be the real Gmail address already in use?), not a code fix.
2. **No duplicate/competing pricing constants found.** Cross-checked
   `FALLBACK_FINISHING_OPTIONS`/`FALLBACK_DELIVERY_FEE`/`FALLBACK_COLOR_SURCHARGE_RATIO`
   (`src/features/document-orders/types.ts`) against the live `finishing_options`/
   `settings` values above — they match exactly (150/100/25 HTG, 250 HTG, 1.6×), because
   these frontend constants are documented, intentional network-failure fallbacks sourced
   *from* the database values at the time Phase 3 migrated them, not a second source of
   truth that could drift silently. No stale currency symbols found either — `CURRENCY =
   "HTG"` (`constants.ts`) is the only currency constant in the codebase and
   `formatCurrency()` is the only formatter, used everywhere prices are displayed.
3. **No old/wrong branding found.** Grepped all of `src/` for "Gonaïves", "Ruelle Sajous",
   and "GUY Petit-Homme" — every occurrence is either the verified `COMPANY` constant, a
   direct read from the database (via `provider_profiles`/`services` queries), or
   marketing copy that correctly describes the real address (e.g. home/about page text)
   — none of it is a second, independently-maintained copy of contact data that could go
   stale.
4. **One address-collection simplification worth naming, not a bug**: the delivery
   address flow (`useSubmitDocumentOrder`) always creates the address with
   `city: "Gonaïves"` hardcoded, since the order form only collects a free-text street/
   description field, not a separate city selector. Reasonable for a business that only
   currently serves one city — flagged here so it doesn't get mistaken for a stale value
   later if COIN-IDEAL ever delivers outside Gonaïves.

## Corrections

**None applied.** Every gap found above is a missing real-world value (phone, confirmed
email, opening hours), not a wrong or stale one already in the system — there is nothing
to "fix" by editing code or data, only real information to collect from GUY Petit-Homme
and enter through the existing admin surfaces (`/admin/pricing` for tariffs already
covered, `/provider/profile` for phone once that field is exposed there — currently
`provider_profiles` has no `phone` column either, see Unresolved Decisions).

## Unresolved Business Decisions

1. **What is COIN-IDEAL's real public contact email?** `contact@coin-ideal.com` (frontend
   default) vs `clubcodinggonaives@gmail.com` (the real, working admin account) — pick one
   and it becomes the single source of truth.
2. **What is COIN-IDEAL's real phone/WhatsApp number?** Needed before the Contact page and
   the Gemini assistant can answer "comment puis-je vous appeler" — currently both
   honestly show nothing rather than a guess.
3. **What are COIN-IDEAL's real opening hours?** Not collected anywhere yet — needed for
   the Contact page and would let the Gemini assistant answer a whole category of
   questions (cahier des charges §6.4 lists hours-adjacent questions explicitly) it
   currently has to decline.
4. **Should `provider_profiles` (or a new `settings` entries) gain a `phone`/`business_email`
   column**, so this data lives in the database next to the address instead of as a
   frontend constant? Not decided or built here — a schema question for the next phase
   that touches company info, not something to add speculatively in a read-only audit.
5. **Real service catalogue and prices** — the single biggest open item. Everything else
   in this report is polish; without at least one active service, `/commander` has
   nothing to sell.
