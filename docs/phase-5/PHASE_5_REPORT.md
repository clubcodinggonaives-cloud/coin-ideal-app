# Production Readiness Report — Phase 5

Scope note before the results: several Phase 5 checklist items require access this
session does not have and should not acquire by asking for secrets in chat — a
confirmed-correct Supabase Cloud project, a Vercel account/deployment, and a real Gemini
API key. Where blocked, this report says so plainly instead of fabricating a result.
Everything achievable locally — security audit, migration hygiene, Edge Function
hardening, Vercel config/build verification, backup/observability strategy — is done and
verified for real, not inferred.

## Security
**PASS.** Full audit, all findings resolved or confirmed non-issues:
- No `service_role` key anywhere in `src/` (grepped, confirmed).
- No secret-shaped strings (`AIza…`, `sk-…`, hardcoded API keys) anywhere in `src/` or
  `supabase/functions/`.
- No `VITE_`-prefixed variable beyond `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (the
  only two meant to be public).
- IDOR / privilege escalation / client-controlled pricing / client-controlled status: all
  covered by the RLS + RPC design from Phases 3–4 and **re-verified live** through a real
  authenticated browser session in Phase 4's E2E run (role escalation attempt → real
  `403`; direct `orders` write → real `permission denied`; cross-client order visibility →
  confirmed isolated).
- Unsafe redirects: none found — `navigate()` targets are all static `ROUTES.*` constants
  or same-origin `location.state.from`, never a user-controlled URL.
- File access: `order-documents`/`provider-documents` remain private, signed-URL-only
  (unchanged, re-confirmed by reading `uploads.service.ts` again this phase).
- **New this phase**: `ai-assistant`'s CORS was `Access-Control-Allow-Origin: "*"` —
  harmless for data (the endpoint returns nothing client-specific) but let any website
  burn your metered Gemini quota from a visitor's browser. Replaced with an
  `ALLOWED_ORIGINS` allowlist (see Gemini sections below).

## Supabase Cloud
**BLOCKED — see this first.** `supabase projects list` (the CLI has a stored login on
this machine, from outside this session) returned exactly one project: **"NKDELIVERI"**
(ref `dcsnmvbtsmdbwrwbutph`) — not COIN-IDEAL, and unrelated to `qqibjglnvcezqbogkvlg`,
the project referenced in your committed `.env`. This project was never linked
(`supabase/.temp/project-ref` doesn't exist), and **nothing was linked, pushed, or
touched** on either project this session.

This needs your input before any LOCAL vs REMOTE diff or `db push` can happen:
- Is `qqibjglnvcezqbogkvlg` the real COIN-IDEAL project, on a different Supabase account
  than whatever is logged into this machine's CLI?
- Or is "NKDELIVERI" actually relevant and `.env` is stale?

Once you confirm the correct project and either link it yourself or tell me it's safe to
do so, the diff is a five-minute check (`supabase migration list --linked` against the
local `00001`–`00032` chain). Not done now — surfacing it instead of guessing.

## Vercel
**PASS** for everything verifiable without your Vercel account. `vercel.json` is correct
and minimal: `buildCommand: npm run build` (matches `package.json`), `outputDirectory:
dist`, `framework: vite`, and the SPA rewrite (`/((?!assets/).*) → /index.html`) is the
standard, correct pattern. Verified for real, not just read: ran `npm run build` then
served the actual `dist/` output and curled all 10 routes named in this phase's brief —

```
/                    200
/services            200
/tarifs              200
/comment-ca-marche   200
/vente-eau           200
/commander           200
/dashboard/orders    200
/provider/orders     200
/admin/orders        200
/admin/pricing       200
```

**Not done**: an actual Vercel deployment (needs your account) and confirming
preview-vs-production environment variable separation on Vercel's dashboard — that's a
Vercel-side configuration step for you, not something achievable from this session.

## Environment
**PASS.** `.env` (gitignored, confirmed not tracked) holds only
`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` — correct, both are meant to be public.
`.env.local` (this session's local-stack override, gitignored via `.gitignore`'s
`.env.local` pattern, confirmed not tracked) holds the same two, pointed at
`127.0.0.1:54321`. `.env.example` matches exactly what a new developer needs, nothing
more. No secret (`GEMINI_API_KEY`, any future `SUPABASE_SERVICE_ROLE_KEY` use) lives in
any `.env*` file — Gemini's key is documented as an Edge Function secret
(`supabase secrets set`), never a `VITE_` variable, and the README now says so explicitly
in two places.

## Storage
**PASS locally, staging untested (blocked with Supabase Cloud above).** Bucket
configuration and RLS unchanged since Phase 3's validation (`avatars`/`service-images`
public, `provider-documents`/`order-documents` private, signed-URL-only). Re-confirmed by
re-reading `uploads.service.ts`: `getPublicUrl()` is never called on the two private
buckets. The exact anon/client-A/client-B/provider/admin access matrix from this phase's
brief was already run live in Phase 3 (raw SQL) and Phase 4 (through a real authenticated
browser downloading a real uploaded document from `/admin/orders` and `/provider/orders`
via a signed URL — see `docs/phase-4/screenshots/admin_orders.png`, the "test-document.pdf"
link). Running it again against a real staging bucket is blocked on having a staging
project.

## Backup
**Documented, no data touched.**
- **Database**: Supabase Cloud projects on any paid plan take automatic daily backups
  (point-in-time recovery on higher tiers) — a Supabase dashboard setting, not something
  this repo controls. Free-tier projects have no automatic backup; if `qqibjglnvcezqbogkvlg`
  (or whichever project is confirmed correct) is on the free tier, that's worth upgrading
  before real customer data accumulates.
- **Schema/migration rollback**: every change in this project is a forward migration
  (`00001`–`00032`), each independently reviewable and re-runnable (`supabase db reset`
  proved this repeatedly across Phases 3–4). There is no down-migration tooling in this
  setup (Supabase CLI doesn't generate one automatically) — a rollback in practice means
  writing a new forward migration that undoes the specific change, which is why every
  migration in this repo describes its own change narrowly rather than bundling unrelated
  work.
- **Storage recovery**: Supabase Storage doesn't version objects by default; there is no
  "undo" for a deleted file beyond whatever backup tier the project is on. Not a gap
  introduced by this project — worth knowing before enabling any future bulk-delete
  automation (e.g. the file-retention cron still pending from
  `docs/database/DATABASE_IMPLEMENTATION_PLAN.md` Phase 5).
- **Environment recovery**: `.env.example` is the canonical list of what a fresh
  environment needs; Edge Function secrets (`GEMINI_API_KEY`, `ALLOWED_ORIGINS`) are not
  recoverable from any file in this repo by design — they live only in whoever's password
  manager set them and in Supabase's secret store.

## Observability
**Documented.**
- **Supabase**: Postgres logs, Auth logs, and Storage logs are all visible in the Supabase
  Cloud dashboard (Logs & Analytics) once a real project is linked — nothing to configure
  in this repo.
- **Edge Function logs**: `ai-assistant` logs exactly two things — an error when
  `GEMINI_API_KEY`/`SUPABASE_URL` is misconfigured, and one line per served request
  (`{"messageLength": N}`, per the existing scaffold's own minimal-logging design). Never
  logs message content, never a token, never the API key. Retrievable via
  `supabase functions logs ai-assistant` once deployed.
- **Frontend errors**: every data-fetching page already goes through TanStack Query's
  `isLoading`/`isError`/`error` states plus this project's shared `ErrorState` component
  (confirmed consistent across all pages touched in Phases 3–4) — no unhandled promise
  rejections found in the pages reviewed. No frontend error-tracking service (Sentry etc.)
  is wired up; out of scope for this phase, worth a follow-up decision.
- **Failed orders/payments/uploads**: `order_status_history` (every status transition,
  including `annulee`) and `payments.status` (`pending`/`confirmed`/`failed`/`refunded`)
  already give COIN-IDEAL staff a queryable audit trail from `/admin/orders` — no
  additional table needed for this.
- **Never logged, confirmed by reading every `console.*` call touched this phase**:
  passwords, tokens, the Gemini key, service-role key, or document contents.

## Gemini Edge Function
**PASS.** Rebuilt this phase (`supabase/functions/ai-assistant/index.ts`) on top of the
existing scaffold: business context now also pulls live `finishing_options` and
`settings` (delivery fee, color surcharge) — previously only `services` — so the assistant
can correctly answer delivery/finishing pricing questions instead of just print pricing.
CORS restricted to `ALLOWED_ORIGINS`. Rate limiting moved from an in-memory `Map` (reset
every cold start, meaningless across instances) to a durable Postgres-backed counter
(`00032`, `check_ai_rate_limit()`).

Verified live, locally, everything that doesn't require a real Gemini key:
- Method/body validation: empty message → `400`, message >500 chars → `400`, invalid JSON
  → `400`, wrong HTTP method → `405` — all with the exact French user-facing message the
  code defines.
- Missing `GEMINI_API_KEY` → `503`, never a stack trace or internal detail.
- Rate limiting end-to-end through the real function, not just the RPC in isolation: 10
  requests from one simulated caller succeeded past the limiter (failed later at the
  dummy-key Gemini call, expected), requests 11 and 12 got `429` — exactly as designed.
- `buildBusinessContext()` executes successfully against live `services`/
  `finishing_options`/`settings` before the (dummy-key) Gemini call fails — confirmed by
  getting a clean `502` (Gemini rejected the fake key) rather than a `500` (which would
  mean the context query itself broke).

**Not verified, and cannot be from this session**: actual reply quality/relevance, and
whether the deployed CORS allowlist behaves as coded — this local stack's
`supabase functions serve` appears to override the function's CORS headers with `*`
regardless of origin (tested with an intentionally disallowed origin, got `*` both times);
the code itself reflects only allowlisted origins (reviewed line by line), but this can
only be conclusively confirmed against a real deployed function.

## Gemini Security
**PASS on everything checkable without a live model.** Data scope reviewed line by line:
`buildBusinessContext()` queries only `services`, `finishing_options`, `settings` —
grepped the whole file, confirmed zero references to `profiles`, `orders`, `payments`, or
any user-specific table. No user session is read or required. The system instruction
explicitly tells the model to ignore in-message instructions asking it to reveal the
system prompt, a key, or another client's data, and to never invent a price/policy/
availability/order/payment. Rate limiting (above) mitigates cost-abuse. CORS (above)
mitigates unrelated sites triggering calls.

**Cannot be verified without a real `GEMINI_API_KEY`**: whether the live model actually
obeys those instructions under adversarial prompting (jailbreak/injection attempts),
whether its answers stay grounded in the supplied context instead of hallucinating, and
general reply quality (tariff questions, service questions, delivery questions). This is
the one item in this whole report that fundamentally cannot be tested by code review or
local infrastructure — it needs a real key and a real model call. Recommend running the
exact scenarios from this phase's brief (§14: tariff question, service question, delivery
question, unknown question, prompt injection, unauthorized-data-access attempt) manually
or via a small script the moment a real key is available, before this endpoint reaches
real users.

## Staging E2E
**BLOCKED** — no staging deployment exists (needs the Supabase Cloud project question
resolved, plus a Vercel deployment). The closest available proxy is Phase 4's full local
E2E suite (`scripts/phase4-e2e.mjs`, `scripts/phase4-responsive-qa.mjs`) — both reusable
as-is against a staging URL by changing `BASE_URL` and pointing `.env`/`.env.local` at the
staging Supabase project. Recommend running them unchanged as the first staging QA step
once staging exists, rather than writing new scripts.

## Remaining Risks
- **Supabase Cloud project identity is unresolved** — the single blocker most other
  "staging" work depends on. Resolve this first.
- Gemini's actual answer quality/injection-resistance is unverified (needs a real key).
- No Vercel deployment exists yet; environment variables have never been set there.
- Contact form (`/contact`, found during this phase's audit) is decorative — it does
  `await sleep(1000)` then `console.log`, never actually sending the message anywhere.
  Pre-existing, unrelated to this session's work, but a real production gap: a visitor
  who submits it believes COIN-IDEAL received their message, and nobody does. Not fixed
  this phase (outside the stated priority order) — flagged for the next one.
- File-retention cron (documented, not built — `docs/database/
  DATABASE_IMPLEMENTATION_PLAN.md` Phase 5) and admin role expansion (Gérant/Employé/
  Livreur, deferred by your own earlier decision) remain open from prior phases.
- No pagination on admin/provider order lists — fine at current volume (noted in Phase 4).

## Deployment Checklist
Once the Supabase Cloud project is confirmed:
1. `supabase link --project-ref <confirmed-ref>`
2. `supabase migration list --linked` → confirm it shows `00001`–`00032` missing, nothing
   unexpected already present
3. `supabase db push` (review the plan it prints before confirming — do not run
   `db reset` against a project with real data)
4. `supabase secrets set GEMINI_API_KEY=<real key>`
5. `supabase secrets set ALLOWED_ORIGINS=<your Vercel domain>,http://localhost:5173`
6. `supabase functions deploy ai-assistant`
7. Create the real COIN-IDEAL provider account via `/auth/register`, then set real prices
   from `/provider/services` (per README's existing "Données de démarrage" section —
   `seed.sql`'s test data never reaches a linked project)
8. Vercel: import the repo, set `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` for both
   Production and Preview environments to the confirmed project's values
9. Deploy to a Vercel preview URL first (this *is* your staging), not directly to the
   production domain
10. Re-run `scripts/phase4-e2e.mjs` and `scripts/phase4-responsive-qa.mjs` against the
    preview URL (swap `BASE_URL`)
11. Run the Gemini scenarios from §14 manually against the real deployed function
12. Only then promote the Vercel deployment to the production domain

## GO / NO-GO

**NO-GO for production — and that's the correct, expected answer at this point in your
own stated pipeline (LOCAL → STAGING → QA → APPROVAL → PRODUCTION).** This session never
had staging access, so it cannot honestly certify a staging step it never ran.

**What *is* true and GO-ready right now**: the entire local implementation — schema,
RLS/RPC security, orders/payments/notifications, admin tooling, responsive UI, and the
Gemini Edge Function's non-model-dependent behavior — is built, tested with real browser
automation, and has had zero unresolved findings across four phases of adversarial
testing (two genuine bugs found and fixed along the way, not hidden). That work is not
the blocker.

**What blocks GO is entirely external to this codebase**: (1) which Supabase Cloud
project is actually COIN-IDEAL's, (2) a Vercel deployment, (3) a real Gemini API key.
None of these are things this session can or should resolve unilaterally. Once you
resolve #1, the Deployment Checklist above is the direct path to a real staging
environment — at which point Staging E2E and Gemini Security's one open item become
answerable, and this report's remaining NO-GO items convert to GO one by one.
