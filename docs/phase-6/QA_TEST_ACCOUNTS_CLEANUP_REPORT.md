# QA Test Accounts Cleanup Report

## Cleanup Summary

Pre-deletion verification (Steps 1–5) was completed first and confirmed all
six accounts safe to remove (see below). `SUPABASE_SERVICE_ROLE_KEY` was
never available in this local environment, so the Auth deletion could not
be performed programmatically here — **the user performed the six Auth
user deletions manually via the Supabase Dashboard instead.** This report
independently re-verified that outcome against the live database (not
taken on faith): all six accounts, their dependent `provider_profiles` row,
and the one QA-to-QA review are confirmed gone via direct queries, and the
four remaining legitimate accounts (1 admin, 3 clients) are confirmed
intact and unaffected.

**Storage objects were not part of the manual dashboard deletion** — Auth
user deletion and Storage object deletion are different systems with no
cascade between them (see Storage Objects section). The nine previously
identified QA Storage objects still exist, and are now **permanently
orphaned without the service-role key**: their owner-only RLS policies can
no longer be satisfied by anyone, since the owning accounts no longer
exist to authenticate as.

## Target Accounts

| # | Email | User ID | Role | Provider Profile |
|---|---|---|---|---|
| 1 | provider-browser-9r8x7c@coin-ideal-qa.test | `7efe847f-3dca-4163-b46a-384808805a26` | provider | none |
| 2 | provider-dbg3-wzmvtc@coin-ideal-qa.test | `6fa430e4-5260-4cbd-8c9e-803c040842f9` | provider | none |
| 3 | provider-browser-sf7qq1@coin-ideal-qa.test | `cafe3bd3-0da1-441c-983a-790f052cce39` | provider | none |
| 4 | provider-fntest-ygqsbs@coin-ideal-qa.test | `bd130ba7-10de-4e7b-8cbf-54b5def37ead` | provider | none |
| 5 | qa-provider@coin-ideal-qa.test | `a1000000-0000-0000-0000-000000000045` | client | `5d80e696-1ca8-4916-9bd8-ab876b181d3b` ("[QA] Compte prestataire de verification", is_verified=true) |
| 6 | qa-client@coin-ideal-qa.test | `f0000000-0000-0000-0000-000000000045` | client | none |

## Pre-Deletion Verification

**Project identity** — confirmed via three independent sources, not assumed:
`.env`'s `VITE_SUPABASE_URL` (`qqibjglnvcezqbogkvlg.supabase.co`), the
linked CLI's `supabase/.temp/project-ref` file (`qqibjglnvcezqbogkvlg`), and
`supabase projects list` (returns exactly one accessible project:
`qqibjglnvcezqbogkvlg` / `coin-ideal-app`, `ACTIVE_HEALTHY`, `linked: true`
— no `NKDELIVERI` or any other project is reachable from this environment
at all). Target project confirmed correct.

**Account identity** — queried `profiles` (admin session, anon key — RLS's
own `profiles_admin_all`-style policy permits this read) for each of the six
exact email addresses. Every email matched **exactly one** row — no
ambiguity, no multi-match. Because `profiles.id` has `REFERENCES
auth.users(id) ON DELETE CASCADE` (`00003_create_profiles.sql`), the
existence of a `profiles` row is itself proof the corresponding `auth.users`
row exists — confirmed structurally, not assumed. Roles matched the
prompt's own expectations exactly, including the two role/username
discrepancies the prompt itself flagged (`qa-provider` has role `client` but
owns a provider_profile fixture; `qa-client` has role `client`).

## Related Records

Checked `service_requests`, `bookings`, `reviews`, `favorites`, `messages`,
`notifications`, `contact_messages`, `orders`, `addresses`, and (for the one
account with a provider_profile) `services` — for all six accounts, in both
client and provider FK directions where applicable.

**Zero** related rows for 5 of the 6 accounts. The exception:
**`qa-client` has 1 review** (`b9ed289d-0905-4d7b-9d52-d7c37d070bd4`,
comment: *"Phase5F.1 remediation verification review"*, rating 5) —
inspected in full: `reviewer_id` = qa-client (target #6), `provider_id` =
qa-provider's own provider_profile (target #5). Both sides of this review
belong to accounts on the deletion list; it references no real
service/business/production data whatsoever. Confirmed exclusively QA-owned
per Section 6's "clearly owned exclusively by that test account" test — not
a STOP condition.

**Cascade path confirmed by direct migration inspection** (not assumed):
`auth.users` →(`profiles.id ON DELETE CASCADE`, 00003)→ `profiles`
→(`provider_profiles.user_id ON DELETE CASCADE`, 00006)→ `provider_profiles`
→(`reviews.reviewer_id` and `reviews.provider_id`, both `ON DELETE CASCADE`,
00014)→ `reviews`. Deleting the six `auth.users` rows via the Admin API will
correctly and automatically remove all of the above with no separate manual
deletion step needed.

## Storage Objects

Checked `avatars`, `provider-documents`, `order-documents`, and
`payment-proofs` for all six user IDs. Non-empty results:

| Bucket / path | Object(s) |
|---|---|
| `provider-documents/7efe847f-3dca-4163-b46a-384808805a26/` | `1787734909371-logo.png` |
| `provider-documents/6fa430e4-5260-4cbd-8c9e-803c040842f9/` | `1787734891041-logo.png` |
| `order-documents/f0000000-0000-0000-0000-000000000045/` | 5 files (`1787764716061-logo.png`, `1787764768503-logo.png`, `1787764819150-logo.png`, `1787764875081-logo.png`, `1787764951911-logo.png`) |
| `payment-proofs/f0000000-0000-0000-0000-000000000045/{4 order-id subfolders}/` | 1 file each (4 total) |

All filenames are `logo.png` (the project's own public logo, used as dummy
upload content across this session's test scripts) — consistent with QA
test artifacts, not real client files. 9 objects total identified for
removal.

**Storage deletion cannot be performed by the current admin session**: the
governing RLS policies (`provider_documents_owner_rw`,
`order_documents_owner_rw`, `payment_proofs_owner_rw`) are correctly
owner-scoped for all write/delete operations — an admin session only has
`SELECT` on other users' files by design (`provider_documents_admin_read`,
etc.), not `DELETE`. This is expected, correct RLS behavior, not a bug —
deleting another user's Storage object requires the service-role key,
same as the Admin Auth API for `auth.users`.

## Deletion Results

**Auth users: deleted manually by the user via the Supabase Dashboard**
(programmatic deletion here was blocked by the missing
`SUPABASE_SERVICE_ROLE_KEY` — checked, not set as a shell/process
environment variable and not present in any local file this environment
has access to: `.env`, `.env.local`, `.env.example`, `.env.phase5h-qa`, the
scratchpad directory, or `C:\tmp` — variable *names* only were checked,
never a value, and the secret was never requested through chat).

**Storage objects: not deleted.** Manual Auth-user deletion does not touch
Storage. All 9 previously identified objects remain (see below).

## Post-Deletion Verification

Re-queried the live database directly (admin session, anon key) after the
manual deletion — not assumed from the user's report:

| Check | Result |
|---|---|
| 6 target emails in `profiles` | **0 rows** for all 6 (confirmed individually) |
| 6 target UUIDs in `profiles` | **0 rows** for all 6 (confirmed individually) |
| `provider_profiles` fixture (`5d80e696-...`) | **gone** |
| QA-to-QA review (`b9ed289d-...`) | **gone** |
| `provider-documents/7efe847f-.../1787734909371-logo.png` | **still present** |
| `provider-documents/6fa430e4-.../1787734891041-logo.png` | **still present** |
| `order-documents/f0000000-.../` (5 files) | **all 5 still present** |
| `payment-proofs/f0000000-.../` (4 files) | **all 4 still present** |

All six Auth users and their cascaded `profiles`/`provider_profiles`/
`reviews` rows are confirmed gone. All nine Storage objects are confirmed
still present, now permanently inaccessible to any client-side session
(owner-only RLS, no possible owner left to authenticate as) — removable
only via the service-role key or the Dashboard's Storage browser.

## Unaffected Accounts

Queried `profiles` after the deletion: **exactly 4 rows remain**.

| Email | Role |
|---|---|
| clubcodinggonaives@gmail.com | admin |
| desulmajohnsley@gmail.com | client |
| guypetithomme032@gmail.com | client |
| kenssmith07@gmail.com | client |

The real admin account and 3 real client accounts are confirmed intact and
untouched. **No legitimate provider account currently exists in the
system** — this predates this cleanup (none of the 6 QA targets or their
fixtures constituted a real provider; earlier Phase 5H screenshots already
showed this same set of non-QA accounts) and is not a side effect of this
operation — noted honestly rather than claiming a check that doesn't
currently hold.

## Errors / Warnings

- `SUPABASE_SERVICE_ROLE_KEY` was never available in this environment, so
  the deletion had to be performed manually by the user rather than
  verified end-to-end by this session's own tooling. The result was,
  however, independently re-verified against the live database afterward.
- The 9 QA Storage objects are now orphaned and need either the
  service-role key or a manual pass in the Supabase Dashboard's Storage
  browser (`provider-documents`, `order-documents`, `payment-proofs`) to
  remove — see exact paths in the Storage Objects section above.
- No legitimate provider account exists in the current dataset (see
  Unaffected Accounts) — a pre-existing business-data gap, not caused by
  this cleanup.

## Final Verdict

**CLEANUP — PARTIAL**

All six targeted accounts (and their exclusively-owned cascaded records)
are confirmed removed, and all legitimate accounts are confirmed intact.
The nine QA-owned Storage objects remain and require the service-role key
or a manual Dashboard pass to finish.
