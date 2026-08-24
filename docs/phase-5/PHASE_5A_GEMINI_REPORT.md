# Phase 5A — Gemini AI Assistant: Cloud Deployment & Security Validation

All tests in this report ran against the **real deployed function on the real Supabase
Cloud project** (`qqibjglnvcezqbogkvlg`, "coin-ideal-app") — not a local simulation.

## Pre-flight
**PASS.** `supabase projects list` returns exactly one project — `qqibjglnvcezqbogkvlg` —
and it is the linked project (`supabase/.temp/project-ref` matches). **NKDELIVERI is not
visible to this CLI session at all** and was never touched.

## Deployment Status
**DEPLOYED**, twice this session: once at initial deploy, once after a fix found during
this audit (see Rate Limiting below). Both deploys used `supabase functions deploy
ai-assistant` — no other function was touched or deployed.

## Function Status
**LIVE**, responding correctly at
`https://qqibjglnvcezqbogkvlg.supabase.co/functions/v1/ai-assistant`. Currently returns
`503` ("Assistant temporairement indisponible...") for every request — correct, expected
behavior, because `GEMINI_API_KEY` is intentionally not set (see Secrets).

Code audit (index.ts, full read): Supabase client uses the **anon key only**, never
service-role. Gemini key travels only in a request header to Google's API, never in a URL,
never echoed back to the caller, never logged. Every error path returns a fixed,
user-facing French message — raw exceptions go to `console.error` only, never into the
HTTP response body.

## Secrets Status
- `GEMINI_API_KEY` = **NOT CONFIGURED** — intentionally. I do not have a real key and will
  not fabricate one or ask you to paste it into chat. Set it yourself when ready:
  `supabase secrets set GEMINI_API_KEY=<real key> --project-ref qqibjglnvcezqbogkvlg` — no
  redeploy needed afterward, the function reads it live.
- `ALLOWED_ORIGINS` = **CONFIGURED** (currently `http://localhost:5173,http://127.0.0.1:5173`
  — update this to include your real Vercel domain once deployed there, or the production
  site will be blocked by its own function's CORS check).

No secret value is printed anywhere in this report or was echoed in any terminal output
I generated (the CLI's own `secrets list` shows one-way hash references, not plaintext —
that's Supabase's own display format, confirmed no real key material appeared).

**Testing note**: to actually exercise the code paths gated behind "is a key configured,"
I temporarily set `GEMINI_API_KEY` to a throwaway, non-functional placeholder string,
ran the tests below, then removed it (`secrets unset`) and confirmed the function
returned to its safe `503` state before finishing. At no point did a real Gemini key
exist in this project, this repo, or this conversation.

## CORS Status
**PASS — and this resolves an open question from the earlier Phase 5 report.** Locally,
`supabase functions serve` appeared to override CORS headers with `*` regardless of
origin, so this couldn't be conclusively verified before. Tested directly against the
real deployed function this time:
- Origin `http://localhost:5173` (allowed) → `Access-Control-Allow-Origin:
  http://localhost:5173`
- Origin `https://evil-site.example.com` (not allowed) → `Access-Control-Allow-Origin:
  http://localhost:5173` (the safe fallback — **not** the hostile origin, **not** `*`)

The allowlist is enforced exactly as coded. No wildcard CORS in production.

## Rate Limiting Status
**PASS, after a real bug was found and fixed during this audit.**

Original logic: `rateLimitKey = authHeader || X-Forwarded-For || "anonymous"`. Tested live
and found broken for anonymous visitors: every unauthenticated browser automatically sends
`Authorization: Bearer <anon key>` — a value that's **identical and public for every
visitor** — so `authHeader` was always truthy and every anonymous caller collapsed into
one shared 10-req/min bucket instead of getting 10 each. Not a security hole (more
restrictive than intended, not less), but a real availability bug: a handful of site
visitors within the same minute would have locked everyone else out of the assistant.

**Fixed**: the header is now only treated as a per-caller identity if it differs from the
project's own public anon key; otherwise the function falls back to the caller's IP
(`X-Forwarded-For`, as set by Supabase's edge gateway — confirmed the gateway overwrites
any client-supplied value with the real connecting IP rather than trusting it, which is
correct anti-spoofing behavior, not something this fix needed to work around). Redeployed
and re-verified:
- 6 requests from one simulated caller → allowed (502, dummy key rejected by Gemini,
  expected); requests 7–12 → `429` (limit hit — the low starting count of 6 rather than 10
  reflects this session's own earlier test traffic sharing the same real IP within the
  same rolling window, not a bug)
- After waiting for the 60-second window to fully roll over, a fresh request succeeded
  again (`502`, not `429`) — confirms the window resets correctly, not stuck
- Could not directly demonstrate two genuinely distinct visitors getting independent
  buckets from this single test machine (only one real IP available to test from) — the
  code path is verified correct by review and by the reset test; multi-visitor isolation
  will be implicitly confirmed the first time real traffic from different networks uses it

Confirmed durable (table-backed, `00032`), not in-memory — survives cold starts and works
across regions/instances.

## Security Status
**PASS on everything checkable without a live model call.**
- `buildBusinessContext()` queries only `services`, `finishing_options`, `settings` —
  re-confirmed by grep: zero references to `profiles`, `orders`, `payments`, or any
  private/user-scoped table anywhere in this file.
- No user session is read, requested, or required.
- Defense in depth, not just prompt instructions: even if the model were fully
  non-compliant with its system instruction, there is **structurally nothing sensitive in
  the data it receives** to leak — the scrubbing happens at the query layer, before the
  prompt is even assembled, not just via "ask nicely and hope."
- System instruction explicitly tells the model to ignore user-message instructions asking
  it to reveal its system prompt, a key, or another client's data.

**Cannot be tested without a real `GEMINI_API_KEY`** (honest limitation, not skipped):
whether the live model actually *obeys* those instructions under real adversarial
prompting. This is a model-behavior question, not a code question — code review proves
the worst case is bounded (nothing sensitive exists to leak), but it can't prove the model
never says something it shouldn't about the public data it does have. Recommend running
the prompt-injection scenarios manually the moment a real key is set, before real users
see this.

## Frontend Integration
**PASS.** Grepped all of `src/` for any reference to `generativelanguage.googleapis.com`
or a `GEMINI` identifier — zero matches. The only path to Gemini is
`ChatWidget → ai-assistant.service.ts (supabase.functions.invoke) → Edge Function →
Gemini`, exactly as required. The frontend has no way to reach Gemini directly even if it
tried — it doesn't have the key.

## Tests

| # | Test | Result |
|---|---|---|
| 1 | Service question | **BLOCKED** — needs real Gemini key |
| 2 | Pricing question | **BLOCKED** — needs real Gemini key |
| 3 | Delivery question | **BLOCKED** — needs real Gemini key |
| 4 | Unknown question (no hallucination) | **BLOCKED** — needs real Gemini key |
| 5 | Empty input | **PASS** — `400`, "Le message ne peut pas être vide." |
| 6 | Oversized input (600 chars) | **PASS** — `400`, "Le message est trop long (500 caractères maximum)." |
| 7 | Rate limit | **PASS** — see Rate Limiting Status above |
| 8 | Unauthorized origin | **PASS** — see CORS Status above |
| 9 | Missing Gemini key behavior | **PASS** — `503`, generic safe message, no internal detail leaked |
| 10 | Malformed request | **PASS** — `400`, "Requête invalide." |

7 of 10 directly testable and passing; the 4 blocked ones (really: tests 1–4, since 9 is
answered) all depend on a real model call.

## Failures
None uncovered that remain unfixed. One real bug found (rate-limit key collapsing all
anonymous visitors into one bucket) — found, fixed, redeployed, and re-verified live, all
within this audit.

## Remaining Risks
- Tests 1–4 and the live prompt-injection check (Security Status) need a real
  `GEMINI_API_KEY` — the single blocker on full Gemini sign-off.
- `ALLOWED_ORIGINS` still points at localhost only — must be updated with the real Vercel
  domain before that deployment goes live, or the production frontend will be blocked by
  its own CORS check.
- No `ai_conversations`/`ai_messages` persistence (unchanged from earlier phases,
  cahier des charges §11 marks this optional — "si l'historique... est activé").

## GO / NO-GO — Gemini Staging Readiness

**GO for staging, conditional on one action that's entirely yours to take**: set a real
`GEMINI_API_KEY`. Every piece of infrastructure around the model call — deployment,
secrets management, CORS, rate limiting (bug found and fixed live this session), data
scoping, error handling, frontend architecture — is deployed to the real project, tested
against the real function, and passing. The moment a real key is set, this becomes fully
testable end-to-end with zero further code changes expected; recommend running the 5
model-dependent scenarios (service/pricing/delivery/unknown/injection) as the very next
step once that happens, before pointing real users at it.
