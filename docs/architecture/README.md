# COIN-IDEAL Architecture Documentation

Permanent, continuously-maintained architecture reference. Unlike
`docs/phase-*/` (dated, per-session reports — read for historical "why")
and `docs/database/` (an early, now partly-stale schema analysis — read for
original design rationale, not current schema state), this directory is
meant to stay accurate as the codebase evolves. Update it alongside a
change, not as an afterthought.

Every statement in every document here is marked **EXISTING** (confirmed
in code/migrations/config) or **RECOMMENDED** (not yet built/enforced).
See `ARCHITECTURE_DOCUMENTATION_REPORT.md` for how this set was produced
and validated.

| Document | Purpose |
|---|---|
| [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md) | Overall architecture, tech stack, user roles |
| [DIRECTORY_MAP.md](./DIRECTORY_MAP.md) | What every folder is for |
| [FILE_RESPONSIBILITY_MAP.md](./FILE_RESPONSIBILITY_MAP.md) | Per-file detail for architecturally significant files |
| [CHANGE_MAP.md](./CHANGE_MAP.md) | **Start here for any change** — where to go for every common request |
| [FEATURE_MAP.md](./FEATURE_MAP.md) | End-to-end data flow per major feature |
| [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) | Every table, its RLS, its RPCs, current as of migration 00064 |
| [SUPABASE_ARCHITECTURE.md](./SUPABASE_ARCHITECTURE.md) | Client/Auth/RLS/RPC/Storage/Edge Functions, when to use which |
| [AUTH_ARCHITECTURE.md](./AUTH_ARCHITECTURE.md) | Registration/login/OAuth/session/role flows |
| [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md) | RLS conventions, secrets, payment/document protection, PIN/idle-timeout |
| [DEBUGGING_PLAYBOOK.md](./DEBUGGING_PLAYBOOK.md) | Symptom → cause → fix, with real past incidents cited |
| [QUICK_CHANGE_REFERENCE.md](./QUICK_CHANGE_REFERENCE.md) | Narrative "read this, modify this, test this" for common requests |
| [CHANGE_IMPACT_MATRIX.md](./CHANGE_IMPACT_MATRIX.md) | LOW/MEDIUM/HIGH/CRITICAL risk classification |
| [CODING_CONVENTIONS.md](./CODING_CONVENTIONS.md) | Naming, patterns, Tailwind/React Query/Supabase conventions actually used |
| [TESTING_ARCHITECTURE.md](./TESTING_ARCHITECTURE.md) | What testing exists (no automated suite), what's tested per feature and how |
| [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md) | Vercel + Supabase Cloud pipeline, safe vs. risky operations |
| [DECISIONS.md](./DECISIONS.md) | Why things are built the way they are, cited to source |
| [CHANGE_REQUEST_TEMPLATE.md](./CHANGE_REQUEST_TEMPLATE.md) | Fill this out before implementing a non-trivial change |
| [ARCHITECTURE_RULES.md](./ARCHITECTURE_RULES.md) | Strict, mostly-enforced project rules |
| [ARCHITECTURE_DOCUMENTATION_REPORT.md](./ARCHITECTURE_DOCUMENTATION_REPORT.md) | Audit of how this documentation set was produced, its gaps and ambiguities |

## How to use this set

**Making a change?** `CHANGE_MAP.md` → `QUICK_CHANGE_REFERENCE.md` for the
narrative version → `CHANGE_REQUEST_TEMPLATE.md` to plan it →
`CHANGE_IMPACT_MATRIX.md` to calibrate how careful to be.

**Debugging something?** `DEBUGGING_PLAYBOOK.md` first — many symptoms in
this codebase have already happened once and are documented with their
real cause and fix location.

**Understanding why something is built a certain way?** `DECISIONS.md`.

**New to this codebase?** `PROJECT_ARCHITECTURE.md` → `DIRECTORY_MAP.md` →
`DATABASE_ARCHITECTURE.md` → `FEATURE_MAP.md` for the feature you'll be
touching.
