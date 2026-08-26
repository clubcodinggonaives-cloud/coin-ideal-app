# Change Request

Use this template before implementing any non-trivial change. Fill in every
section — "N/A" is a valid answer, silence is not. Consult
`docs/architecture/CHANGE_MAP.md` and `QUICK_CHANGE_REFERENCE.md` first;
this template is where you record what you found there, applied to your
specific change.

## Objective

What is being changed, in one or two sentences.

## Business Requirement

Why — cite the cahier des charges section, an operator instruction, or a
bug report. Never implement a change with no traceable reason.

## Existing Architecture

What already exists that's relevant — the current table/RLS/component/
service, quoted or cited with a file path. Confirm this by reading the
actual code/migration, not from memory of a past session (which may be
stale — see `docs/architecture/ARCHITECTURE_DOCUMENTATION_REPORT.md`'s
source-conflict findings for why this matters).

## Files To Inspect

List every file you read before deciding the approach (services, hooks,
pages, migrations, RLS). Use `docs/architecture/FILE_RESPONSIBILITY_MAP.md`
and `CHANGE_MAP.md` to find them quickly.

## Files To Modify

Exact paths.

## Files To Add

Exact paths, following the naming conventions in
`docs/architecture/CODING_CONVENTIONS.md`.

## Database Changes

New table? New column? New/modified constraint? New RPC? If none: state
"None" explicitly. If any: draft the migration content here before writing
the file, and confirm it's additive (never edits an already-applied
migration).

## RLS Changes

New policy? Modified policy? If touching a role check, confirm it uses
`is_admin(uid)`/`is_staff(uid)`, never an inline subquery (see
`docs/architecture/DECISIONS.md`). If none: state "None" explicitly.

## Storage Changes

New bucket? New policy? Changed size/mime-type limits? If none: state
"None" explicitly.

## Security Impact

Classify using `docs/architecture/CHANGE_IMPACT_MATRIX.md` (LOW/MEDIUM/
HIGH/CRITICAL). For HIGH/CRITICAL: explicitly answer "how would a
malicious authenticated user, or an anonymous one, try to abuse this?" and
confirm the change prevents it.

## UI/UX Impact

What changes visually or in interaction. Which pages/components.

## Responsive Impact

Does this affect layout at any breakpoint? If yes: which pages, and
confirm a real-browser check (not source inspection alone) is planned at
360/390/414/768/820/1024/1280/1440.

## Tests Required

Per `docs/architecture/TESTING_ARCHITECTURE.md`'s feature-specific
sequencing. Name the actual accounts/roles to test with. State plainly if
something cannot be tested (e.g. a live 1-hour wait) and how it was
substituted (e.g. a shortened threshold) — never claim a test passed
without actually running it.

## Deployment Requirements

Migration push? Edge Function redeploy? Secret update? Order of operations
if more than one.

## Rollback Plan

For a migration: the forward-fixing migration that would reverse this
change's effect, in outline. For a frontend change: revert the commit. For
a secret/config change: what the previous value was and how to restore it
(without ever writing the actual secret value into this document).

## Risk Level

LOW / MEDIUM / HIGH / CRITICAL (from Security Impact above — restate here
for visibility).

## Implementation Checklist

- [ ] Read existing architecture (this document's "Files To Inspect")
- [ ] Migration written (if any), dry-run reviewed, human confirmation
      obtained before real push
- [ ] RLS role matrix tested (if any RLS/RPC touched)
- [ ] `npx tsc -b` clean
- [ ] `npx oxlint` clean (no new warnings/errors vs. `git diff`)
- [ ] `npm run build` clean
- [ ] Real browser E2E for the changed flow, with a real account
- [ ] Responsive check (if UI changed)
- [ ] Regression check: confirm login, and any directly-adjacent existing
      flow, still works
- [ ] Documentation updated (`docs/architecture/*` if a new pattern/file
      was introduced; a phase-style report if HIGH/CRITICAL)
- [ ] Commit(s) split by domain, not one giant commit
- [ ] Pushed, and — if a migration was involved — verified against the
      live linked project post-push
