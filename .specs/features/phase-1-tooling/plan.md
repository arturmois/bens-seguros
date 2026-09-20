# Phase 1 — Tooling (Biome + Postgres CI)

Sources:

- `docs/architecture-refactoring-roadmap.md` §12–§13 T1.1 T1.2 T1.3, ADR-1, ADR-3, §11 “Do not mix the Biome format PR with any logic PR”, §14 T1.1 before T3.1, PR 1 / PR 1b — what this phase must change
- `eslint.config.mjs` + `config/eslint-config/index.mjs` — live lint is three rules (`no-explicit-any`, `no-unused-vars` `^_`, `no-console` allow `warn`/`error`)
- `.prettierrc.mjs` + `config/prettier-config/index.mjs` — printWidth 80, semi false, singleQuote, trailingComma es5, prettier-plugin-tailwindcss
- `package.json` `lint` / `format` / `lint-staged`, `.husky/pre-commit`, `.vscode/settings.json` — ESLint + Prettier on save and on commit
- `.github/workflows/ci.yml` — no Postgres service; `db:generate` uses a dummy URL; `pnpm test` has no live database
- `packages/core/vitest.config.ts` + `packages/core/src/modules/client/infrastructure/prisma-client-repository.spec.ts` — unit spec with a mocked Prisma client, not a DB spec
- `packages/db/prisma/rls-policies.sql` — GRANT to `app_user` but no `CREATE ROLE`; FORCE RLS; superusers bypass FORCE RLS
- `docker-compose.yml` — `postgres:18-alpine` as superuser `bens` / `bens_dev` / `bens_seguros`; no `app_user`
- `.env.example` — `DATABASE_URL` is the `bens` superuser; `DATABASE_ADMIN_URL` commented and the same user
- Confirmed lesson L-002 — not applicable (no HTTP error bodies in this phase)
- AD-001, AD-002 — keep roadmap sequencing; keep cruiser at warn, do not introduce `eslint-plugin-boundaries`

## Problem

The repo pays for two lint runtimes and still only automates three generic rules. `pnpm lint` is `turbo lint` → `eslint src/` per package. Prettier plus `prettier-plugin-tailwindcss` owns format. CLAUDE.md’s `process.env` ban is review policy. Every later module-move PR will pick up mixed ESLint/Prettier noise unless the formatter is replaced first. The evidence the roadmap gives: ESLint config is those three rules; `eslint-plugin-import` and `eslint-config-next` are declared and unused; CI has no Postgres service; `pnpm test` cannot catch persistence or RLS regressions. Phase 4 (Prisma out of edges) is unsafe until a DB spec actually runs against schema + RLS.

When this ships, `pnpm lint` is Biome; ESLint and Prettier are gone from the toolchain; CI brings up Postgres 18, applies schema + RLS, and a `*.db.spec.ts` proves a real write plus tenant isolation and rolls the transaction back.

## Out of scope

| Excluded | Why |
| --- | --- |
| T2.1 compose `clients` / deleting tsyringe | Phase 2; first architectural code change after this foundation |
| T3.x module merges | Must not run a format tsunami after folder moves; Biome lands first |
| T4.x Prisma-out-of-edges | Requires this phase’s Postgres harness; not this PR |
| T8.1 Mongo fail-closed, T8.2 docs auth, T8.4 Bull Board | Can start in parallel per §14; not Phase 1 |
| Flipping cruiser rules to `error` | T6.3 |
| Encoding `as` bans, empty catch, barrels, pt-BR diacritics | ADR-1: remain review policy; T1.3 is `process.env` only |
| Enabling Biome `recommended` rule set | Would fail CI on thousands of findings ESLint never enforced |
| Lefthook, Ultracite | ADR-1 rejected |
| Making `pnpm audit` or quality-gates blocking | Roadmap: later |
| Mongo or Redis in CI | Core DB harness is PostgreSQL only |
| Rewriting `packages/db/prisma/seed.ts` off `process.env` | CLI seed, not runtime; T1.3 allowlist |
| Production `CREATE ROLE` passwords in `rls-policies.sql` | Secrets must not land in that file |
| Changing HTTP contracts / `generate:api` | Frozen during the refactor |
| T9.1 full CLAUDE.md / `bens-ddd-module` rewrite off `@injectable` | Only lint/format command + stack lines that would otherwise lie |

## Assumptions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Phase boundary | T1.1 + T1.3 + T1.2 in this feature, three slices, two PRs | User asked for the next phase; roadmap Phase 1 is those three tasks; “Do not mix the Biome format PR with any logic PR” | n |
| Delivery | PR 1 = T1.1 + T1.3 (Biome + `noProcessEnv`). PR 1b = T1.2 (Postgres CI + harness). No format-only files in PR 1b | Matches roadmap PR 1 / PR 1b | n |
| Biome config location | Root `biome.json` produced by `biome migrate prettier` then `biome migrate eslint`, then edited to the pin below. No `config/biome` workspace package | T1.1 names `biome.json`; an extra config package is ceremony; `config/typescript-config` stays | n |
| Linter rule set | `linter.rules.recommended: false` plus the three mapped rules, `useSortedClasses`, and T1.3 `noProcessEnv` | Enabling recommended would fail the format PR on unused imports, `useExhaustiveDependencies`, etc. | n |
| Formatter pin | `lineWidth` 80, `semicolons` `"asNeeded"` or equivalent of Prettier `semi: false`, `quoteStyle` `"single"`, `trailingCommas` `"es5"`, indent 2 spaces | Current Prettier config | n |
| Tailwind class sort | Enable Biome `useSortedClasses` (nursery in Biome 2) for `className`. Delete `prettier-plugin-tailwindcss`. If the sample (`apps/web/src/features/proposals`, `apps/web/src/components/ui`) is unacceptable, stop-and-ask rather than keep full Prettier | ADR-1 allows a tsx-only plugin exception; that exception is a new Landing row, not a silent leftover | n |
| Import organize | Do not enable Biome import sorting in this phase | A second reorder tsunami on top of format is unreviewable | n |
| `pnpm lint` | Root script becomes `biome check .` (not `turbo lint`) | One process covers the tree; `turbo lint` would spawn N overlapping Biome runs | n |
| Package `lint` scripts | Each workspace `lint` script that today is `eslint src/` becomes `biome check` on that package’s sources so `pnpm --filter … lint` still works | Filter UX stays; CI uses the root script | n |
| Ignores | `node_modules`, `dist`, `.next`, `generated`, `_reference` — same as current `eslint.config.mjs` | Avoid formatting Prisma client and Next output | n |
| `process.env` allowlist | `noProcessEnv` error on `packages/**` and `apps/server/**`; off on `packages/env/**`, `packages/db/prisma/seed.ts`, and `apps/web/**` | T1.3 done-when; seed is a CLI; web `NEXT_PUBLIC_*` is the documented exception | n |
| Quality-gates ESLint collector | Retarget `.quality-gates/collectors/eslint.mjs` to Biome (or stop calling `pnpm exec eslint`) in PR 1 | After `config/eslint-config` is deleted the binary is gone; the step is `continue-on-error` but must not spam a missing binary | n |
| Editor | `.vscode/settings.json` default formatter becomes the Biome VS Code / Cursor extension id; drop Prettier/ESLint format-on-save keys | Otherwise save reintroduces Prettier after T1.1 | n |
| CI Postgres image | `postgres:18` (not alpine) with `POSTGRES_USER=bens`, `POSTGRES_PASSWORD=bens_dev`, `POSTGRES_DB=bens_seguros`, port `5432`, `pg_isready` healthcheck | Same credentials as compose; GHA healthcheck is more reliable on the debian image | n |
| Dual roles | CI and compose create `app_user` (NOSUPERUSER, LOGIN). `DATABASE_URL` = `app_user`. `DATABASE_ADMIN_URL` = `bens` superuser. `pnpm db:push:dev` runs as admin then applies `rls-policies.sql` | Superusers bypass FORCE RLS; a single-user harness cannot prove tenant isolation | n |
| Local compose | An init SQL mounted on the postgres service creates `app_user` with a committed dev password. `.env.example` splits the two URLs. Existing `pg-data` volumes do not re-run init — document a one-time `CREATE ROLE` for those clones | Init scripts run only on first volume create | n |
| `db:push:dev` in CI | Job env supplies the URLs; CI writes a `.env` at the repo root if the script still requires `dotenv -e ../../.env`; install `postgresql-client` so `psql` exists | Current script hard-requires `.env` and `psql` | n |
| Harness | `packages/core/test/db-harness.ts`: begin transaction per `*.db.spec.ts`, seed one Organization, rollback in `afterEach`. Vitest project `core:db` include `**/*.db.spec.ts`. Unit project keeps `src/**/*.spec.ts` excluding `*.db.spec.ts` and the dummy `DATABASE_URL` | T1.2 names that file and glob; unit tests must not require Postgres | n |
| Proof spec | Keep the mocked `prisma-client-repository.spec.ts`. Add `prisma-client-repository.db.spec.ts` that exercises `save` P2002 against the live partial unique index (`deletedAt IS NULL`) plus a tenant-isolation case via `createTenantClient` | “Port as proof” is an additional DB spec, not a deletion of the fast mock | n |
| Local `pnpm test` | `*.db.spec.ts` always run; `docker compose up -d` is the prerequisite. No skip-if-down | Roadmap: document compose; a skip hides a red CI locally | n |
| Profile | `light` (repo has no `tlc-spec-lean` declaration) | Skill default. Thin for CI Postgres: light will not notice a test that passes under a wrong implementation. Raise to `standard` if you want fault injection on the harness/RLS surface | n |

**Open questions:** none - all resolved or logged above.

## Criteria

Grouped by slice - one observable outcome each, never a layer. Numbering runs across the whole plan.

### S1: Biome replaces ESLint + Prettier (T1.1) (P1)

**Acceptance Criteria**

1. WHEN `pnpm lint` runs from the repo root THEN the process it starts SHALL be `biome check` and SHALL NOT invoke an `eslint` binary.
2. The root `package.json` `scripts.lint` value SHALL contain `biome check` and SHALL NOT contain `eslint` or `turbo lint`.
3. The root `package.json` `scripts.format` value SHALL contain `biome` and SHALL NOT contain `prettier`.
4. The root `package.json` `lint-staged` object SHALL contain `biome` in every command it runs and SHALL NOT contain the strings `eslint` or `prettier`.
5. The file `biome.json` SHALL set JavaScript formatter `lineWidth` to `80`, semicolons equivalent to Prettier `semi: false`, `quoteStyle` to `single`, and `trailingCommas` to `es5`.
6. The file `biome.json` SHALL set `linter.rules.recommended` to `false`.
7. The file `biome.json` SHALL set `noExplicitAny` to error, `noConsole` to error with `allow` including `warn` and `error` and not including `log`, and `noUnusedVariables` to error with names matching `^_` ignored.
8. WHEN `biome check` runs on a file that contains an explicit `any` type THEN it SHALL report rule `noExplicitAny`.
9. WHEN `biome check` runs on a file that contains `console.log` THEN it SHALL report rule `noConsole`.
10. WHEN `biome check` runs on a file whose only console calls are `console.warn` and `console.error` THEN it SHALL NOT report `noConsole` for those calls.
11. The directories `config/eslint-config` and `config/prettier-config` SHALL NOT exist.
12. The files `eslint.config.mjs` and `.prettierrc.mjs` SHALL NOT exist.
13. WHEN `pnpm typecheck` runs THEN it SHALL exit `0`.
14. The CLAUDE.md Development Commands fence SHALL describe `pnpm lint` as Biome and `pnpm format` as Biome, and SHALL NOT tell the reader to run ESLint or Prettier as the project lint or format command.
15. The file `.github/workflows/ci.yml` SHALL keep a `validate` job step whose `run` is `pnpm lint` and whose `continue-on-error` is not `true`.
16. The file `biome.json` SHALL enable `useSortedClasses` (or the Biome 2 equivalent class-sort rule) for `className`.
17. WHEN `biome check` runs THEN it SHALL NOT diagnose files under `node_modules`, `dist`, `.next`, or `generated`.
18. The file `.husky/pre-commit` SHALL still invoke `lint-staged`.
19. The file `.vscode/settings.json` SHALL set the default formatter for TypeScript and TSX to the Biome editor extension and SHALL NOT set `esbenp.prettier-vscode` as `editor.defaultFormatter`.
20. The quality-gates collector that today shells out to `pnpm exec eslint` SHALL NOT invoke `eslint`.

**Independent test:** `pnpm lint` and `pnpm typecheck` locally; isolated fixture files for `any` / `console.log` / `console.warn`; `rg` on `package.json`, `lint-staged`, `ci.yml`, CLAUDE.md, `.vscode/settings.json`; `test ! -e config/eslint-config`.

### S2: `process.env` policy (T1.3) (P1)

**Acceptance Criteria**

21. The file `biome.json` SHALL enable `noProcessEnv` at error for files under `packages/` and `apps/server/`.
22. WHEN a file under `packages/core` contains `process.env.FOO` THEN `biome check` on that file SHALL report rule `noProcessEnv`.
23. WHEN `biome check` runs on `packages/env/src/index.ts` THEN it SHALL NOT report `noProcessEnv`.
24. WHEN a file under `apps/web` contains `process.env.NEXT_PUBLIC_API_URL` THEN `biome check` SHALL NOT report `noProcessEnv` for that file.
25. WHEN `biome check` runs on `packages/db/prisma/seed.ts` THEN it SHALL NOT report `noProcessEnv`.

**Independent test:** isolated canary under `packages/core` with `process.env.FOO`; `biome check` on `packages/env/src/index.ts` and `packages/db/prisma/seed.ts`; a canary under `apps/web`.

### S3: Postgres in CI + core DB harness (T1.2) (P1)

**Acceptance Criteria**

26. The `validate` job in `.github/workflows/ci.yml` SHALL declare a service whose `image` value starts with `postgres:18`.
27. The `validate` job SHALL set `DATABASE_URL` to a connection whose user is `app_user` and SHALL set `DATABASE_ADMIN_URL` to a connection whose user is `bens`.
28. WHEN the `validate` job runs THEN it SHALL execute `pnpm db:push:dev` after the Postgres service is healthy and before the step `pnpm test`, and that `db:push:dev` step SHALL NOT set `continue-on-error`.
29. The file `packages/core/test/db-harness.ts` SHALL begin a database transaction for each `*.db.spec.ts` example and SHALL roll that transaction back after the example.
30. The file `packages/core/vitest.config.ts` SHALL define a Vitest project whose include glob matches `**/*.db.spec.ts`.
31. WHEN `PrismaClientRepository.save` inserts a live Client and a second `save` with the same organization and document hits unique violation P2002 THEN the db spec SHALL throw `ClientAlreadyExistsError` and the lookup SHALL use `deletedAt: null`.
32. WHEN a Client row exists for organization A THEN `createTenantClient` for organization B SHALL return no that Client (`findById` yields `null`).
33. WHEN a `*.db.spec.ts` example inserts a Client and finishes THEN the next example in that file SHALL see zero Client rows for the seeded organization.
34. The CLAUDE.md Development Commands section SHALL state that `docker compose up -d` is required before `*.db.spec.ts` / the core DB harness.
35. The unit specs in `packages/core` matching `src/**/*.spec.ts` excluding `*.db.spec.ts` SHALL run with the existing dummy `DATABASE_URL` in the unit Vitest project and SHALL NOT open a TCP connection to Postgres.
36. The `validate` job steps whose `run` is `pnpm lint`, `pnpm typecheck`, or `pnpm test` SHALL NOT set `continue-on-error`.
37. The `validate` job step whose `run` is `pnpm arch:check` SHALL keep `continue-on-error` equal to `true`.
38. The file `docker-compose.yml` SHALL create role `app_user` as `NOSUPERUSER` `LOGIN` on first Postgres volume init, and `.env.example` SHALL set `DATABASE_URL` to that role and `DATABASE_ADMIN_URL` to `bens`.

**Independent test:** `docker compose up -d` then `pnpm db:push:dev` then `pnpm --filter @repo/core exec vitest run --project core:db`; YAML parse of `ci.yml`; `rg` on CLAUDE.md and `.env.example`.

## Traceability

| ID | Slice | Criteria | Status |
| --- | --- | --- | --- |
| TOOL-01 | S1 | 1, 2, 3, 4 | Implementing |
| TOOL-02 | S1 | 5, 6, 7, 16 | Implementing |
| TOOL-03 | S1 | 8, 9, 10 | Implementing |
| TOOL-04 | S1 | 11, 12, 20 | Implementing |
| TOOL-05 | S1 | 13, 14, 15, 17, 18, 19 | Implementing |
| ENV-01 | S2 | 21, 22, 23, 24, 25 | Implementing |
| DBCI-01 | S3 | 26, 27, 28, 36, 37 | Implementing |
| DBCI-02 | S3 | 29, 30, 33, 35 | Implementing |
| DBCI-03 | S3 | 31, 32 | Implementing |
| DBCI-04 | S3 | 34, 38 | Implementing |

**ID format:** `CATEGORY-NUMBER`. **Status:** Pending → In checks → Implementing → Verified.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| command `pnpm lint` | output format and verbosity | AC 1 - Biome check diagnostics |
| command `pnpm lint` | flags and defaults | AC 2 - `biome check` at repo root |
| command `pnpm lint` | exit codes | AC 1, 8, 9 - non-zero on rule hits; zero when clean |
| command `pnpm lint` | prints when it fails halfway | existing - Biome prints the first error group and exits non-zero; CI then fails the `pnpm lint` step |
| command `pnpm lint` | empty / no-violation output | AC 13-adjacent - a clean tree exits 0 after the format write |
| command `pnpm format` | flags and defaults | AC 3 - Biome write |
| command `pnpm format` | exit codes | existing - write mode exits 0 on success |
| command `lint-staged` / pre-commit | flags and defaults | AC 4, 18 |
| command `lint-staged` / pre-commit | exit codes | existing - hook fails the commit when Biome reports errors |
| command `biome check` (fixtures) | error shape / rule names | AC 8, 9, 10, 22 - `noExplicitAny`, `noConsole`, `noProcessEnv` |
| command `biome check` (fixtures) | who may call it | n/a - local and CI developers; not a published API |
| command `biome check` (fixtures) | versioning | n/a - repo-pinned `@biomejs/biome` 2.x |
| command `biome check` (fixtures) | rate limit | n/a - one invocation per lint |
| command `pnpm typecheck` | exit codes | AC 13 - `0` |
| command `pnpm db:push:dev` (CI) | flags and defaults | AC 28 - existing script, invoked from `validate` |
| command `pnpm db:push:dev` (CI) | exit codes | AC 28 - non-zero fails the job (`continue-on-error` absent) |
| command `pnpm db:push:dev` (CI) | prints when it fails halfway | AC 28 - `prisma db push` or `psql` stderr; job stops before `pnpm test` |
| command `pnpm test` / `core:db` | flags and defaults | AC 30 - Vitest project include `**/*.db.spec.ts` |
| command `pnpm test` / `core:db` | exit codes | AC 31, 32, 33 - non-zero on assertion failure |
| command `pnpm test` / unit project | empty / no Postgres | AC 35 - dummy `DATABASE_URL`; no TCP to Postgres |
| document `CLAUDE.md` | structure (Development Commands lint/format + compose prerequisite) | AC 14, 34 |
| document `CLAUDE.md` | tone / depth | n/a - command-comment edits only; no new chapter |
| document `CLAUDE.md` | what the reader does next | AC 14, 34 - run Biome; start compose before db specs |
| document `.env.example` | structure | AC 38 - two URLs |
| document `.env.example` | tone / depth | n/a - connection strings, not a guide |
| document `.env.example` | what the reader does next | AC 38 - copy to `.env` with `app_user` + `bens` |
| CI step `pnpm lint` | error shape / codes | AC 15 - blocking; no `continue-on-error` |
| CI step `pnpm lint` | who may call it | n/a - GitHub Actions `validate` job only |
| CI step `pnpm lint` | versioning | n/a - workflow file, not a published API |
| CI step `pnpm lint` | rate limit | n/a - one run per CI job |
| CI service `postgres` | error shape / codes | AC 26, 28 - unhealthy service fails the job before tests |
| CI service `postgres` | who may call it | n/a - `validate` job sidecar |
| CI service `postgres` | versioning | AC 26 - image `postgres:18` |
| CI service `postgres` | rate limit | n/a - one container per job |
| CI step `pnpm db:push:dev` | error shape / codes | AC 28 |
| CI step `pnpm arch:check` | error shape / codes | AC 37 - still `continue-on-error: true` |
| collection biome `linter.rules` | grouping criterion | AC 6, 7, 16, 21 - mapped ESLint three + class sort + `noProcessEnv`; recommended off |
| collection biome `linter.rules` | naming | AC 7, 16, 21 - `noExplicitAny`, `noConsole`, `noUnusedVariables`, `useSortedClasses`, `noProcessEnv` |
| collection biome `linter.rules` | ordering | n/a - JSON object key order does not change matches |
| collection biome `linter.rules` | duplicates | n/a - one entry per rule name |
| collection biome `linter.rules` | exception that does not fit | AC 23, 24, 25 - overrides for `packages/env`, `apps/web`, `packages/db/prisma/seed.ts` |
| collection workspace `lint` scripts | grouping criterion | AC 1 - root `biome check`; per-package scripts retargeted off `eslint` |
| collection workspace `lint` scripts | naming | existing - script name stays `lint` |
| collection workspace `lint` scripts | ordering | n/a - turbo no longer orchestrates root lint |
| collection workspace `lint` scripts | duplicates | n/a - root is the CI entry; package scripts are filter helpers |
| collection workspace `lint` scripts | exception that does not fit | AC 20 - quality-gates collector is not a `package.json` lint script and is still retargeted |

## Flow

This reuses the existing `validate` job (blocking `pnpm lint` / `pnpm typecheck` / `pnpm test`, warn-only `pnpm arch:check`) and the existing `pnpm db:push:dev` script (schema + `rls-policies.sql`) instead of a second migrate path. Biome migrate of the current ESLint and Prettier configs is the starting `biome.json`, then the pin in Landing.

```mermaid
flowchart TD
    IN[Phase 1] --> B["Biome toolchain door 1"]
    IN --> P["CI Postgres + harness door 2"]
    B --> B2["noProcessEnv overrides same PR as door 1"]
    B2 --> OUTB["out: pnpm lint is biome check"]
    P --> OUTP["out: pnpm test runs core:db *.db.spec.ts"]
```

1. `biome migrate prettier` then `biome migrate eslint` (new toolchain - door 1) - produce root `biome.json`, then pin formatter + the three mapped rules + `useSortedClasses` + `recommended: false`
2. `biome check --write .` (new - placement) - format tsunami on `ts`/`tsx`/`json`/`css`; ignores `node_modules`/`dist`/`.next`/`generated`
3. Root `package.json` + workspace `lint` scripts + `lint-staged` + `.husky/pre-commit` (exists) - point at Biome; delete `config/eslint-config`, `config/prettier-config`, `eslint.config.mjs`, `.prettierrc.mjs`
4. `.vscode/settings.json` (exists) and `.quality-gates/collectors/eslint.mjs` (exists) - stop calling Prettier/ESLint
5. `biome.json` overrides (door 1) - `noProcessEnv` on `packages/**` + `apps/server/**`; off on env, web, prisma seed
6. `.github/workflows/ci.yml` `validate` (exists) + `postgres:18` sidecar (door 2) - create `app_user`, set dual URLs, `pnpm db:push:dev` then `pnpm test`
7. `docker-compose.yml` (exists) + `.env.example` (exists) - first-volume init creates `app_user`; example env splits URLs
8. `packages/core/test/db-harness.ts` (new - placement) + Vitest project `core:db` (exists `vitest.config.ts`) - transaction per example, seed Organization, rollback
9. `prisma-client-repository.db.spec.ts` (new - placement) - P2002 live unique index + `createTenantClient` cross-org null
10. out: CLAUDE.md (exists) names Biome and compose-before-db-specs; `pnpm arch:check` remains warn-only

## Relations

None - no stored-data shape change

## Surface

None - nothing consumed outside (no HTTP route; CI, `pnpm lint`, and Vitest are command surfaces in Observable)

## Landing

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Biome 2 as the only formatter and linter | Root `devDependencies["@biomejs/biome"]` `^2`; `scripts.lint` = `biome check .`; `scripts.format` = `biome check --write .`; `biome.json` `javascript.formatter`: `lineWidth` 80, `quoteStyle` `"single"`, `trailingCommas` `"es5"`, semicolons equivalent to Prettier `semi: false`; `linter.rules.recommended` `false`; `suspicious.noExplicitAny` error; `suspicious.noConsole` `{ "level": "error", "options": { "allow": ["warn", "error"] } }`; `correctness.noUnusedVariables` error ignoring `^_`; `nursery.useSortedClasses` (or current group) on for `className`; delete `config/eslint-config` and `config/prettier-config` | Keep ESLint “for boundaries only” — two lint runtimes; AD-002 already chose dependency-cruiser. Ultracite preset — extra opinion layer (ADR-1 rejected). Lefthook — Husky already runs lint-staged |
| Postgres 18 in CI with dual roles | `validate.services.postgres.image` starts with `postgres:18`; `POSTGRES_USER=bens`, `POSTGRES_PASSWORD=bens_dev`, `POSTGRES_DB=bens_seguros`, published `5432`, `pg_isready` healthcheck; job env `DATABASE_ADMIN_URL=postgresql://bens:bens_dev@localhost:5432/bens_seguros` and `DATABASE_URL=postgresql://app_user:<dev-password>@localhost:5432/bens_seguros`; step `pnpm db:push:dev` with no `continue-on-error`, ordered after healthy Postgres and before `pnpm test` | Skip Postgres until Phase 4 — T4.x then ships untested. Single superuser `DATABASE_URL` — PostgreSQL superusers bypass FORCE RLS, so AC 32 would be theatre |
| Core `*.db.spec.ts` harness | `packages/core/test/db-harness.ts` `BEGIN` (or Prisma `$transaction` with a connection held) per example, seed one Organization, `ROLLBACK` in `afterEach`; Vitest project name `core:db`, `include: ['**/*.db.spec.ts']`; unit project `include: ['src/**/*.spec.ts']` excluding `*.db.spec.ts` | Shared database without rollback — leftover rows flake the next example (roadmap names this risk). Skip db specs when Postgres is down — hides a red CI from local `pnpm test` |

- Nothing else in this change is hard to reverse (script rewrites, ignore globs, CLAUDE.md command comments). Reversing Biome after other branches rebase onto the format tsunami is costly, which is why T1.1 is one PR and lands before T3.1.

## Impact

| Front | What changes |
| --- | --- |
| domain | existing term: `pnpm lint` meant ESLint via turbo. It now means `biome check .`. Who branches on it today: CI `validate`, Husky/lint-staged, CLAUDE.md Development Commands, every package `"lint"` script, `.quality-gates/collectors/eslint.mjs` |
| domain | existing term: `DATABASE_URL` in `.env.example` meant the compose superuser `bens`. It now means role `app_user` (RLS enforced). `DATABASE_ADMIN_URL` is the `bens` superuser. Who branches on it today: `packages/db/src/index.ts` (`prisma` vs `prismaAdmin`), `pnpm db:push:dev`, local `.env` files already copied from the old example |
| stored data | nothing to migrate in application tables. Existing local Docker volumes named `pg-data` will not re-run compose init — those clones need a one-time `CREATE ROLE app_user` (documented next to the compose prerequisite). CI jobs use a fresh service each run |
