# COIN-IDEAL Coding Conventions

All **EXISTING** unless marked **RECOMMENDED** — extracted from the actual
codebase, not aspirational.

## Naming

- Files: `kebab-case.tsx`/`.ts` throughout (`document-orders`,
  `use-idle-timeout.ts`, `staff-order-card.tsx`) — no exceptions found.
- Components: `PascalCase`, exported via a named `export { ComponentName }`
  at the end of the file (not `export default` for shared/feature
  components — **but** page components under `src/pages/**` **do** use
  `export default` — e.g. `export default AdminUsersPage` — since the
  router imports them via dynamic `import()`, which needs a default
  export). This is a real, consistent split: `pages/` = default export,
  everything else = named export.
- Hooks: `use-<thing>.ts` file name, `useThing()` function name (React
  convention), one primary hook per file for small features, multiple
  related hooks per file for larger ones (e.g. `use-admin.ts` exports many
  `useAdminX` hooks).
- Services: `<domain>.service.ts`, class named `<Domain>Service`, exported
  as a lowercase singleton instance: `export const ordersService = new
  OrdersService()`. Every call site imports the singleton, never the
  class.
- Types: `PascalCase` interfaces in `src/types/index.ts`, no `I`-prefix
  convention.
- Routes: path strings centralized in `ROUTES` (`src/lib/constants.ts`) —
  never a hardcoded `"/dashboard/orders"` string literal in a component;
  always `ROUTES.DASHBOARD_ORDERS`.
- SQL migrations: `000XX_snake_case_description.sql`, strictly sequential,
  zero-padded to 5 digits.
- SQL identifiers: `snake_case` throughout (tables, columns, functions,
  policies, triggers). Policy names follow `<table>_<action>_<scope>`
  (`orders_select_client`, `services_admin_all`) with no exceptions found
  across 64 migrations.

## Components

- Function declarations (`function ComponentName() {}`), not arrow-function
  consts, for every component in this codebase — consistent, no mixing.
- Props typed via an inline `interface <ComponentName>Props { ... }` placed
  immediately above the component, or destructured-inline typing for
  trivial cases.
- `class-variance-authority` (`cva`) for components with visual variants
  (`Button`, `Badge`) — the established pattern for anything with a
  `variant`/`size` prop; **RECOMMENDED**: use `cva` for any new component
  with more than 2 visual variants rather than manual `className` string
  branching.
- `@/utils/cn` (clsx + tailwind-merge) for conditional/merged class names —
  used in nearly every component with a `className` prop.

## Hooks

- One `use-*.ts` file per feature area under `src/features/<feature>/hooks/`.
- `useQuery`/`useMutation` (TanStack Query v5 object-argument API
  exclusively — confirmed zero legacy `useQuery(key, fn)` tuple-style calls
  anywhere in the codebase).
- Query keys: array form, most specific last —
  `["addresses", userId]`, `["admin", "contact-messages"]`. Mutations
  invalidate the matching query key in `onSuccess`.
- A hook never calls `supabase.from()`/`.rpc()` directly — it calls a
  `src/services/*.service.ts` method. (One partial exception found:
  `admin/reviews.tsx` and `admin/categories.tsx` define local hooks with
  inline Supabase calls rather than going through a shared service — an
  inconsistency, not a convention to copy; **RECOMMENDED**: extract these
  into proper services when next touched.)

## Services

- One class per domain, singleton export, all Supabase access (`.from()`,
  `.rpc()`, `.storage`) lives here.
- Methods return typed data or `throw error` — no result-wrapping
  (`{data, error}` tuples aren't propagated up past the service layer).
- Comments inside services frequently explain **why**, not what — e.g.
  `orders.service.ts`'s header comment on why writes never go direct. This
  is a strong, consistent house style: comment the non-obvious reason, not
  the mechanical action. **RECOMMENDED to keep**: this project's own
  `CLAUDE.md`-adjacent instructions and every file's comment style agree —
  comments should capture a hidden constraint or the story behind a fix,
  never restate what the code already says.

## Error handling

- `src/lib/errors.ts` for shared error utilities;
  `src/features/auth/utils/translate-auth-error.ts` for the established
  pattern of mapping known Supabase/GoTrue English error strings to French
  UI messages, with an exact-match table plus one prefix-match special case
  (rate-limit messages with a dynamic count) — **RECOMMENDED pattern** for
  any new user-facing error translation: exact-match table first, prefix/
  regex fallback only for genuinely dynamic messages, generic fallback last.
- `AppErrorBoundary`/`RouteErrorBoundary` (`src/components/error-boundary.tsx`)
  as the last-resort UI safety net — always logs the full error to
  `console.error` (never suppressed), never leaks a raw stack trace to the
  rendered UI outside of a `import.meta.env.DEV`-gated `<details>` block.

## Validation

- Every form schema lives in `src/lib/validators.ts` (Zod), one schema per
  form, `z.infer<typeof schema>` for the matching TypeScript type — no
  schema defined inline in a component.
- `react-hook-form` + `zodResolver` is the only form pattern used —
  confirmed no uncontrolled/manual form-state handling anywhere.
- Cross-field validation via `.refine()`/chained `.refine()` on the object
  schema (see `registerSchema`'s password-confirmation and
  provider-services-description-length refinements for the pattern of
  chaining multiple `.refine()` calls, each with its own `path`).

## Tailwind / responsive

- Utility classes directly in JSX — no `@apply`, no CSS Modules, no
  styled-components anywhere in the codebase.
- Theme tokens via Tailwind v4's CSS-based `@theme` block in `src/index.css`
  (`--color-primary-*`, `--color-accent-*`, `--radius-*`) — no
  `tailwind.config.js` exists (v4 doesn't require one for basic theming).
- Mobile-first: unprefixed classes are the mobile/base style,
  `sm:`/`md:`/`lg:` add larger-breakpoint overrides — standard Tailwind
  convention, consistently followed once a page has been through a
  responsive pass (some older pages, found and fixed during the Phase 5H/6
  audits, had **zero** responsive classes at all — `admin/pricing.tsx`
  before its fix — so "the file exists and uses Tailwind" is not proof it's
  responsive; see `docs/architecture/TESTING_ARCHITECTURE.md`).
- Established responsive-table pattern for data-heavy admin pages:
  `src/components/ui/responsive-table.tsx`'s `ResponsiveTableScroll` +
  `TableScrollHint` + `STICKY_COL_CLASS` — use this rather than a bespoke
  overflow solution for any new hand-rolled `<table>`.
- Card/row containers that hold multiple inline elements should default to
  `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`
  (stack on mobile, row on `sm:`+) rather than a bare `flex items-center
  justify-between` with no mobile fallback — the latter was the recurring
  bug pattern found across `admin/pricing.tsx` and `dashboard/orders.tsx`'s
  page header.

## Comments

- Default to **no comment** when the code is self-explanatory from naming.
- Write a comment only for a hidden constraint, a workaround, or the
  "why" behind a non-obvious decision — never a comment that just restates
  the following line in English/French prose. This is the single most
  consistent stylistic trait across the entire codebase's migrations and
  TypeScript files alike.
- Migration header comments in particular consistently explain: what bug/
  gap prompted this migration, and (for a forward-fix) which earlier
  migration it corrects and why the original approach failed. Follow this
  pattern for any new migration — it is what makes
  `docs/architecture/DECISIONS.md` and this playbook possible to write
  accurately from the migrations alone.

## Logging

- `console.error` for genuine errors that should be visible in
  production dev tools (error boundaries, RPC failures worth surfacing).
- No structured/remote logging service integrated — errors are
  browser-console-only today. **RECOMMENDED** (not existing): a real
  error-tracking service (Sentry or similar) if production error
  visibility becomes a problem; not built because no such gap has been
  reported yet.

## Database migration conventions (repeated from `ARCHITECTURE_RULES.md` for completeness)

- Strictly sequential numbering, never reused, never renumbered.
- Never edit an applied migration — forward-fix only.
- A migration that creates temporary QA fixtures always ships with a
  matching, immediately-following cleanup migration (see the `00039`/
  `00040`, `00046`/`00047`, `00049`/`00050`, `00052`/`00053`, `00064`
  pairs) — because `orders`/`payments` have no client-writable path, this
  is often the *only* way to create/remove test data for those tables.
