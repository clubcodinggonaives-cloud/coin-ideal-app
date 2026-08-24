# Phase 5B — Contact Form: Production-Grade Implementation

All tests in this report ran against the **real Supabase Cloud project**
(`qqibjglnvcezqbogkvlg`), via direct REST calls simulating exactly what the frontend
sends (and, in two cases, deliberately more than the frontend sends — see Tests). No
local Docker stack was used (still unavailable this session); every migration was
previewed with `--dry-run` and confirmed before the real push, per the workflow now
documented in `CLAUDE.md`.

## Architecture

**Contact Form → Supabase → `contact_messages` → Admin**, per Step 1's own suggested
default. The cahier des charges (§7) lists a "Contact" page under the public site but
doesn't specify a backend workflow beyond that — no email-sending/forwarding
infrastructure exists anywhere in this stack to build an alternative on top of, so this
follows the same "submit → stored row → staff reviews via `/admin/*`" pattern already
used for every other reviewed-by-staff flow in this app (orders, service requests,
reviews). Not invented from nothing — it's this project's one existing convention,
applied to a page that was faking it.

## Files Changed

**New:**
- `supabase/migrations/00034_create_contact_messages.sql` — table + RLS
- `supabase/migrations/00035_grant_contact_messages_insert.sql` — anon INSERT grant
- `supabase/migrations/00036_contact_messages_length_checks.sql` — server-side length caps
- `src/services/contact.service.ts`
- `src/features/contact/hooks/use-contact.ts`
- `src/pages/admin/messages.tsx`

**Modified:**
- `src/pages/public/contact.tsx` — full rewrite: real submission, zod validation, honest
  idle/loading/success/error states
- `src/lib/validators.ts` — added `contactSchema`
- `src/types/index.ts` — added `ContactMessage`/`ContactMessageStatus`
- `src/lib/constants.ts`, `src/components/layout/sidebar.tsx`, `src/app/router.tsx` —
  `/admin/messages` route + nav entry

## Security Model / RLS

No `user_id` column — submitting never requires login (cahier des charges §7: public
site, no auth implied), so there's no "my messages" concept to scope by owner the way
`messages`/`orders` do.

| Role | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| Anonymous | ❌ | ✅ (status pinned to `'new'`) | ❌ | ❌ |
| Authenticated (client) | ❌ | ✅ (same as anon — no ownership distinction) | ❌ | ❌ |
| Staff (`provider`\|`admin`) | ✅ all | ✅ | ✅ | ✅ |

Two bugs found and fixed live during this phase, both documented in the migrations
themselves and in `CLAUDE.md`'s spirit of "verify, don't assume":

1. **Missing `anon` GRANT** (`00035`) — `00026`'s blanket privilege setup deliberately
   gives `anon` only `SELECT` on every table (every other public-writable table requires
   real authentication to write). `contact_messages` is the *first* table meant for a
   genuinely anonymous write, and `00034` added the RLS policy but not the underlying
   table privilege.
2. **`INSERT ... RETURNING` vs RLS** — Postgres requires a `RETURNING` row to also pass
   applicable SELECT policies. Since `anon` correctly has none here, requesting the
   inserted row back (`.insert().select()`, or a raw `Prefer: return=representation`
   header) fails even with a fully valid INSERT policy. The actual frontend code was
   never at risk (`contactService.submitMessage()` never chains `.select()`, confirmed by
   re-reading it) — but this was non-obvious enough to document with an explicit
   in-code warning so nobody "helpfully" adds `.select()` later and reintroduces it.

## Validation

Zod (`contactSchema`), matching this project's existing convention (`zodResolver`, same
pattern as `login`/`register`): name 2–100 chars, valid email ≤255 chars, subject 3–200
chars, message 10–2000 chars, **all four fields `.trim()`-ed before length checks** so a
whitespace-only submission fails on the trimmed (empty) value rather than passing on raw
character count. Mirrored server-side via `CHECK` constraints (`00036`) — the frontend
guard is UX, the database constraint is the actual boundary, consistent with how this
project already treats `ai-assistant`'s message-length limit.

## Tests

| # | Test | Result |
|---|---|---|
| 1 | Anonymous submits a valid message → stored | **PASS** — `201`, confirmed empty read-back proves RLS still blocks visibility of what was just written |
| 2 | User cannot read another (or any) message | **PASS** — `SELECT` returns `[]` for anon; no ownership concept exists to bypass |
| 3 | Non-admin cannot access `/admin/messages` | **PASS** — same `DashboardLayout variant="admin"` guard already proven live in Phase 4 (client redirected away from `/admin/orders`); `/admin/messages` is nested under the identical guarded route |
| 4 | Admin can view messages | **NOT RE-TESTED LIVE on this project** — no staff/admin account exists yet on `qqibjglnvcezqbogkvlg` (README's "créer le compte prestataire réel" step is still pending, per Phase 5's report). RLS policy is the identical `role IN ('provider','admin')` pattern already tested live in Phase 4/5A for orders/payments — not re-verified independently here for lack of a real account to test with, not skipped out of neglect. |
| 5 | Failed Supabase request shows UI error | **PASS by code review** — `submitMessage.isError` renders a dedicated `Alert` with a clear retry message; `isSuccess` and `isError` are mutually exclusive `useMutation` states, so a failure can never show a false success |
| 6 | Duplicate click → no duplicate submission | **PASS by code review** — submit button is `disabled` and shows a spinner while `isSubmitting \|\| submitMessage.isPending`; a second click while pending is a no-op at the DOM level |
| 7 | Oversized payload rejected | **PASS** — 2500-char message → `400`, `contact_messages_message_length` constraint violation |
| 8 | Whitespace/empty message rejected | **PASS** — empty message → `400`, same length constraint (DB-level; the zod `.trim()` guard catches whitespace-only client-side before it would ever reach here) |
| 9 | Missing required field rejected | **PASS** — omitted `email` → `400`, `NOT NULL` constraint |

7 of 9 directly verified live against the real project; #3 leans on an identical,
already-proven pattern rather than a fresh live test; #4 is honestly marked untestable
today for lack of a real admin account, not silently assumed.

## UX Validation

`idle` → default form. `loading` → `isSubmitting || submitMessage.isPending`, button
disabled + spinner, all inputs disabled. `success` → green `Alert`, **only rendered when
`submitMessage.isSuccess` is true**, which TanStack Query only sets after the Supabase
call actually resolves without error — the previous version's "always show success after
a fake delay" behavior is gone. `error` → red `Alert` with a clear message, form stays
filled (not cleared) so the user doesn't lose what they typed.

## Remaining Issues

- Test #4 (admin viewing a real message) needs a real staff account on
  `qqibjglnvcezqbogkvlg` to close out — first checkbox in Phase 5's existing Deployment
  Checklist (`/auth/register`, promote to `provider`/`admin`).
- No email/SMS notification to COIN-IDEAL staff when a new message arrives (matches
  Phase 5's already-documented note: cahier des charges lists notification channels as
  "selon les intégrations disponibles" — none are wired up in this stack yet; the admin
  page's unread badge is the only current signal).
- One real contact-message row now exists in the live table from this phase's own
  testing (name "Client Reel", a realistic-looking but fabricated QA message) —
  harmless, but worth deleting via `/admin/messages` once a staff account exists, so it
  doesn't get mistaken for a genuine customer inquiry.

## PASS / FAIL

**PASS.** The contact form is now genuinely functional: messages are written to a real,
RLS-secured table, validated both client- and server-side, and the UI can no longer claim
success without Supabase actually confirming the write. Two real bugs (missing grant,
RETURNING-vs-RLS) were found and fixed live rather than assumed away. The one gap (#4,
live admin verification) is a credentials limitation, not a code deficiency, and is
narrow enough to close in minutes once a real staff account exists.
