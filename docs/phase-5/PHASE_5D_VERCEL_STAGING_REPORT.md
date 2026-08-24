# Phase 5D — Vercel Staging Deployment & Validation

Every test in this report ran against **the real deployed site** at
`https://coin-ideal-app.vercel.app` via real Playwright/Chromium automation — no
localhost, per this phase's explicit instruction.

## A note on "staging" vs "production" — read this first

Vercel's GitHub integration, once a repo is imported, auto-deploys every push to the
default branch (`main`) as that project's **Production** deployment — there is no
separate staging slot unless a non-`main` branch or PR is used, which this whole
engagement has not done (every commit this session went straight to `main`, per
established practice). Practically: **`coin-ideal-app.vercel.app` has already been
receiving every push as a "Production" deployment all session**, including the CORS and
Gemini-model fixes tested directly against it in Phase 5A.

This isn't flagged as a violation of "do not deploy to production yet" — it's an honest
description of what Vercel's default behavior already did before this phase started. What
makes it *functionally* still pre-launch, not a real production incident: zero real
customers can transact yet (Phase 5C: zero active services), and no custom domain or
public announcement has attached "production" meaning to this URL. Recommendation for
actual launch discipline going forward: adopt a `staging` branch for Preview deployments
and only merge to `main` after sign-off — not implemented here, as changing the git
workflow wasn't asked for and is a bigger decision than this phase's scope.

## Pre-flight
**PASS.** `package.json`, `vite.config.ts`, `vercel.json`, and the router were already
reviewed in Phase 5 and are unchanged. `npm run build` re-verified clean this phase
(5.48s, no errors).

## Environment Variables
**PASS — after correcting a mistake I made during this audit, worth documenting.** My
first check (`grep`ping the main `index-*.js` chunk for the real project ref) found only
`http://localhost` and no `qqibjglnvcezqbogkvlg` — I initially reported this as a critical
bug. It was a **false alarm caused by a flawed check**: this app code-splits, and the
Supabase client lives in a separate `client-*.js` chunk I hadn't fetched, so my grep
target was wrong, not the deployment. Verified for real with Playwright against the live
site: `/services` correctly requests `https://qqibjglnvcezqbogkvlg.supabase.co/rest/v1/...`
and gets real `200` responses with real category names. `VITE_SUPABASE_URL`/
`VITE_SUPABASE_ANON_KEY` are correctly configured on Vercel. No `SUPABASE_SERVICE_ROLE_KEY`
or `GEMINI_API_KEY` anywhere in the deployed bundle (grepped for `AIzaSy` key patterns and
`service_role` — zero matches, consistent with these frontend files never referencing
either, confirmed by source grep in earlier phases).

## Deployment
**LIVE** at `https://coin-ideal-app.vercel.app` (see the note above on what "staging"
means for this project today). Not a new deployment created by this phase — validated the
one that already existed from the account owner's GitHub import plus this session's
auto-deployed pushes.

## Routes
**PASS**, all 12 required routes return `200`:
```
/                    200      /vente-eau           200
/services            200      /a-propos            200
/tarifs              200      /contact             200
/comment-ca-marche   200      /commander           200
/dashboard/orders    200      /provider/orders     200
/admin/orders        200      /admin/pricing       200
```
The 4 protected routes returning `200` is expected SPA behavior (Vercel always serves the
app shell; protection is client-side) — verified separately below that the *actual*
protection works, not just that the shell loads.

## Browser Test
**8 of 8 passing** (one initial "failure" was a bug in my own test script, corrected and
re-verified — see below), all against the live site with real Playwright interaction:

| Test | Result |
|---|---|
| Anonymous → `/dashboard/orders` | **PASS** — redirected to `/auth/login` |
| Anonymous → `/provider/orders` | **PASS** — redirected to `/auth/login` |
| Anonymous → `/admin/orders` | **PASS** — redirected to `/auth/login` |
| Anonymous → `/admin/pricing` | **PASS** — redirected to `/auth/login` |
| Registration | **PASS** (after fixing my test script — see note) — real signup against the live site correctly shows "Compte créé ! Vérifiez votre boîte mail..." rather than wrongly redirecting into the dashboard, because production Supabase requires email confirmation (unlike local dev) and Phase 5's `emailConfirmationRequired` fix handles exactly this case |
| Contact form submission | **PASS** — real write to the live `contact_messages` table |
| Chat widget opens | **PASS** |
| Chat widget gets a real Gemini reply | **PASS** — confirms Phase 5A's backend fixes (model name, CORS) work end-to-end through the actual UI, not just simulated via curl |

**Test-script bug, not an app bug**: my first registration attempt used a
`@example.test` email address. Supabase's own signup validation correctly rejects `.test`
as an invalid TLD for a real account (`.test` is IANA-reserved specifically for
non-deliverable testing, and Supabase's validator flags it) — this is *correct* production
behavior, the same reason the real account (`clubcodinggonaives@gmail.com`, a real TLD)
worked without issue earlier. Retried with a `@gmail.com`-domain test address and it
succeeded immediately.

**Not tested this phase, and why**: order creation, file upload, and the full
provider/admin workflows need at least one active service to exercise meaningfully —
Phase 5C already confirmed zero exist in production. Not faked here either; creating a
throwaway service just to test against would itself be inventing business data. Login as
the real admin account wasn't performed (no password available to this session, same
constraint as every prior phase) — anonymous-route-guard behavior above is the equivalent
proof that route protection itself works correctly.

## Responsive
**PASS — 36/36 checks, zero horizontal overflow**, at all 9 required breakpoints × 4
representative pages (`/`, `/services`, `/commander`, `/contact`) against the live site.
Visually spot-checked `/commander` at 320px: correct empty-state ("Aucun service
disponible... Contactez-nous pour passer votre commande directement"), chat widget button
visible and correctly positioned, footer company info accurate — not just "no scrollbar,"
genuinely correct rendering.

Navigation, sidebar (verified in Phase 4 against the same code, unchanged since), forms,
cards, chat widget, and touch targets were all covered by the screenshots above; order
timeline and modal components couldn't be exercised live for the same empty-catalogue
reason as order creation above — covered live against the real Cloud database in Phase 4,
code unchanged since.

## Remaining Risks
- No real catalogue yet (Phase 5C) — the single biggest gap to real usability, not a
  code defect.
- No dedicated staging branch/workflow — every push to `main` deploys straight to what
  Vercel calls Production. Low risk at pre-launch (no real users, no live services to
  break), worth adopting before real customers use the site.
- A live test contact message and a live test user account (unconfirmed email, will
  self-expire without confirmation) now exist in production from this phase's testing —
  same category as Phase 5B's "Client Reel" row: harmless, account owner's call whether
  to clean up via `/admin/messages` / Supabase dashboard.

## GO / NO-GO

**GO for staging use.** Every infrastructure and code-level check passes against the real
deployed site: environment configuration, routing, auth guards (both server-backed via
Supabase and client-side via `DashboardLayout`), the contact form, and the Gemini
assistant are all genuinely working end-to-end through the actual UI, not simulated. The
one real blocker to a public launch — no active services — is a business-data gap
(Phase 5C), entirely outside this phase's scope and explicitly not something to fabricate
here.
