# Phase 1 — Tooling checks

Profile: light
Plan: `.specs/features/phase-1-tooling/plan.md`

38 checks in 3 slices · 3 one-way doors · 0 open, of which 0 block

## Checks

Grouped by the spec's slices; numbering runs across the whole feature.

### S1 - Biome replaces ESLint + Prettier (T1.1) · ~20 files + format write · ~80k obligations (tree format is the tsunami)

**C1** · closed - `pnpm lint` from the repo root runs `biome check` and does not invoke an `eslint` binary (TOOL-01, AC 1, door 1)
Proof: `node --test --test-name-pattern "pnpm lint is biome check not eslint" scripts/biome-tooling.test.mjs`

**C2** · closed - root `package.json` `scripts.lint` contains `biome check` and does not contain `eslint` or `turbo lint` (TOOL-01, AC 2, door 1)
Proof: `node --test --test-name-pattern "package.json lint script is biome check" scripts/biome-tooling.test.mjs`

**C3** · closed - root `package.json` `scripts.format` contains `biome` and does not contain `prettier` (TOOL-01, AC 3, door 1)
Proof: `node --test --test-name-pattern "package.json format script is biome" scripts/biome-tooling.test.mjs`

**C4** · closed - root `package.json` `lint-staged` commands contain `biome` and do not contain `eslint` or `prettier` (TOOL-01, AC 4)
Proof: `node --test --test-name-pattern "lint-staged uses biome not eslint or prettier" scripts/biome-tooling.test.mjs`

**C5** · closed - `biome.json` JavaScript formatter has `lineWidth` 80, semicolons equivalent to Prettier `semi: false`, `quoteStyle` `single`, `trailingCommas` `es5` (TOOL-02, AC 5, door 1)
Proof: `node --test --test-name-pattern "biome.json javascript formatter pin" scripts/biome-tooling.test.mjs`

**C6** · closed - `biome.json` sets `linter.rules.recommended` to `false` (TOOL-02, AC 6)
Proof: `node --test --test-name-pattern "biome.json recommended false" scripts/biome-tooling.test.mjs`

**C7** · closed - `biome.json` sets `noExplicitAny` to error, `noConsole` to error with `allow` including `warn` and `error` and not including `log`, and `noUnusedVariables` to error ignoring `^_` (TOOL-02, AC 7, door 1)
Proof: `node --test --test-name-pattern "biome.json mapped lint rules" scripts/biome-tooling.test.mjs`

**C8** · closed - `biome check` on a file with an explicit `any` type reports rule `noExplicitAny` (TOOL-03, AC 8)
Proof: `node --test --test-name-pattern "canary reports noExplicitAny" scripts/biome-tooling.test.mjs`

**C9** · closed - `biome check` on a file containing `console.log` reports rule `noConsole` (TOOL-03, AC 9)
Proof: `node --test --test-name-pattern "canary reports noConsole for console.log" scripts/biome-tooling.test.mjs`

**C10** · closed - `biome check` on a file whose only console calls are `console.warn` and `console.error` does not report `noConsole` (TOOL-03, AC 10)
Proof: `node --test --test-name-pattern "canary allows console.warn and console.error" scripts/biome-tooling.test.mjs`

**C11** · closed - directories `config/eslint-config` and `config/prettier-config` do not exist (TOOL-04, AC 11, door 1)
Proof: `node --test --test-name-pattern "eslint-config and prettier-config directories are gone" scripts/biome-tooling.test.mjs`

**C12** · closed - files `eslint.config.mjs` and `.prettierrc.mjs` do not exist (TOOL-04, AC 12)
Proof: `node --test --test-name-pattern "eslint.config.mjs and prettierrc.mjs are gone" scripts/biome-tooling.test.mjs`

**C13** · closed - `pnpm typecheck` exits `0` (TOOL-05, AC 13)
Proof: `node --test --test-name-pattern "typecheck exits 0" scripts/biome-tooling.test.mjs`

**C14** · closed - CLAUDE.md Development Commands fence describes `pnpm lint` as Biome and `pnpm format` as Biome, and does not tell the reader to run ESLint or Prettier as the project lint or format command (TOOL-05, AC 14)
Proof: `node --test --test-name-pattern "CLAUDE.md lint and format are Biome" scripts/biome-tooling.test.mjs`

**C15** · closed - `.github/workflows/ci.yml` `validate` job has a step whose `run` is `pnpm lint` and `continue-on-error` is not `true` (TOOL-05, AC 15)
Proof: `node --test --test-name-pattern "CI pnpm lint stays blocking" scripts/biome-tooling.test.mjs`

**C16** · closed - `biome.json` enables `useSortedClasses` (or the Biome 2 equivalent class-sort rule) for `className` (TOOL-02, AC 16)
Proof: `node --test --test-name-pattern "biome.json enables useSortedClasses" scripts/biome-tooling.test.mjs`

**C17** · closed - `biome check` does not diagnose files under `node_modules`, `dist`, `.next`, or `generated` (TOOL-05, AC 17)
Proof: `node --test --test-name-pattern "biome.json ignores node_modules dist next generated" scripts/biome-tooling.test.mjs`

**C18** · closed - `.husky/pre-commit` still invokes `lint-staged` (TOOL-05, AC 18)
Proof: `node --test --test-name-pattern "husky pre-commit invokes lint-staged" scripts/biome-tooling.test.mjs`

**C19** · closed - `.vscode/settings.json` default formatter for TypeScript and TSX is the Biome editor extension and is not `esbenp.prettier-vscode` (TOOL-05, AC 19)
Proof: `node --test --test-name-pattern "vscode default formatter is biome" scripts/biome-tooling.test.mjs`

**C20** · closed - the quality-gates collector that today shells out to `pnpm exec eslint` does not invoke `eslint` (TOOL-04, AC 20)
Proof: `node --test --test-name-pattern "quality-gates collector does not invoke eslint" scripts/biome-tooling.test.mjs`

### S2 - process.env policy (T1.3) · 1 file (biome.json overrides) · ~5k

**C21** · closed - `biome.json` enables `noProcessEnv` at error for files under `packages/` and `apps/server/` (ENV-01, AC 21)
Proof: `node --test --test-name-pattern "biome.json enables noProcessEnv for packages and apps/server" scripts/biome-tooling.test.mjs`

**C22** · closed - `biome check` on a file under `packages/core` containing `process.env.FOO` reports rule `noProcessEnv` (ENV-01, AC 22)
Proof: `node --test --test-name-pattern "canary packages/core process.env reports noProcessEnv" scripts/biome-tooling.test.mjs`

**C23** · closed - `biome check` on `packages/env/src/index.ts` does not report `noProcessEnv` (ENV-01, AC 23)
Proof: `node --test --test-name-pattern "packages/env index does not report noProcessEnv" scripts/biome-tooling.test.mjs`

**C24** · closed - `biome check` on a file under `apps/web` containing `process.env.NEXT_PUBLIC_API_URL` does not report `noProcessEnv` (ENV-01, AC 24)
Proof: `node --test --test-name-pattern "apps/web NEXT_PUBLIC does not report noProcessEnv" scripts/biome-tooling.test.mjs`

**C25** · closed - `biome check` on `packages/db/prisma/seed.ts` does not report `noProcessEnv` (ENV-01, AC 25)
Proof: `node --test --test-name-pattern "packages/db prisma seed does not report noProcessEnv" scripts/biome-tooling.test.mjs`

### S3 - Postgres in CI + core DB harness (T1.2) · ~8 files · ~50k

**C26** · closed - `validate` job in `.github/workflows/ci.yml` declares a service whose `image` value starts with `postgres:18` (DBCI-01, AC 26, door 2)
Proof: `node --test --test-name-pattern "CI postgres service image is postgres 18" scripts/postgres-ci.test.mjs`

**C27** · closed - `validate` job sets `DATABASE_URL` to a connection whose user is `app_user` and `DATABASE_ADMIN_URL` to a connection whose user is `bens` (DBCI-01, AC 27, door 2)
Proof: `node --test --test-name-pattern "CI DATABASE_URL is app_user and DATABASE_ADMIN_URL is bens" scripts/postgres-ci.test.mjs`

**C28** · closed - `validate` job runs `pnpm db:push:dev` after Postgres is healthy and before `pnpm test`, without `continue-on-error` (DBCI-01, AC 28, door 2)
Proof: `node --test --test-name-pattern "CI db:push:dev before test without continue-on-error" scripts/postgres-ci.test.mjs`

**C29** · closed - `packages/core/test/db-harness.ts` begins a database transaction for each `*.db.spec.ts` example and rolls it back after the example (DBCI-02, AC 29, door 3)
Proof: `pnpm --filter @repo/core exec vitest run --project core:db -t "harness rolls back inserted client"`

**C30** · closed - `packages/core/vitest.config.ts` defines a Vitest project whose include glob matches `**/*.db.spec.ts` (DBCI-02, AC 30, door 3)
Proof: `node --test --test-name-pattern "vitest core:db include glob" scripts/postgres-ci.test.mjs`

**C31** · closed - `PrismaClientRepository.save` P2002 on a second live Client with the same organization and document throws `ClientAlreadyExistsError` and the lookup uses `deletedAt: null` (DBCI-03, AC 31)
Proof: `pnpm --filter @repo/core exec vitest run --project core:db -t "P2002 live-client conflict"`

**C32** · closed - `createTenantClient` for organization B returns `null` from `findById` for a Client that belongs to organization A (DBCI-03, AC 32)
Proof: `pnpm --filter @repo/core exec vitest run --project core:db -t "tenant B cannot read org A client"`

**C33** · closed - after a `*.db.spec.ts` example inserts a Client and finishes, the next example in that file sees zero Client rows for the seeded organization (DBCI-02, AC 33, door 3)
Proof: `pnpm --filter @repo/core exec vitest run --project core:db -t "harness rolls back inserted client"`

**C34** · closed - CLAUDE.md Development Commands states that `docker compose up -d` is required before `*.db.spec.ts` / the core DB harness (DBCI-04, AC 34)
Proof: `node --test --test-name-pattern "CLAUDE.md compose prerequisite for db specs" scripts/postgres-ci.test.mjs`

**C35** · closed - `packages/core` unit project include is `src/**/*.spec.ts` excluding `*.db.spec.ts` and its `DATABASE_URL` is `postgresql://test:test@localhost:5432/test` (DBCI-02, AC 35)
Proof: `node --test --test-name-pattern "unit project dummy DATABASE_URL excludes db specs" scripts/postgres-ci.test.mjs`

**C36** · closed - `validate` job steps whose `run` is `pnpm lint`, `pnpm typecheck`, or `pnpm test` do not set `continue-on-error` (DBCI-01, AC 36)
Proof: `node --test --test-name-pattern "CI lint typecheck test stay blocking" scripts/postgres-ci.test.mjs`

**C37** · closed - `validate` job step whose `run` is `pnpm arch:check` keeps `continue-on-error` equal to `true` (DBCI-01, AC 37)
Proof: `node --test --test-name-pattern "CI arch:check continue-on-error remains true" scripts/postgres-ci.test.mjs`

**C38** · closed - `docker-compose.yml` creates role `app_user` as `NOSUPERUSER` `LOGIN` on first Postgres volume init, and `.env.example` sets `DATABASE_URL` to that role and `DATABASE_ADMIN_URL` to `bens` (DBCI-04, AC 38, door 2)
Proof: `node --test --test-name-pattern "compose app_user and env.example split URLs" scripts/postgres-ci.test.mjs`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| Landing doors (3) | Biome toolchain C2, C5, C7 · CI Postgres dual roles C26, C27, C28 · core db harness C29, C30, C33 | - |
| formatter pin (4) | C5, table-driven over all 4 | - |
| mapped lint rules (5) | `noExplicitAny` C7 · `noConsole` C7 · `noUnusedVariables` C7 · `useSortedClasses` C16 · `noProcessEnv` C21 | - |
| noConsole methods (3) | `log` C9 · `warn` C10 · `error` C10 | - |
| removed ESLint/Prettier artifacts (4) | `config/eslint-config` C11 · `config/prettier-config` C11 · `eslint.config.mjs` C12 · `.prettierrc.mjs` C12 | - |
| ignore directories (4) | C17, table-driven over all 4 | - |
| process.env surfaces (4) | core canary C22 · `packages/env` C23 · `apps/web` C24 · prisma seed C25 | - |
| CI dual-role users (2) | `app_user` C27 · `bens` C27 | - |
| blocking CI steps (3) | C36, table-driven over all 3 | - |
| local dual-role files (2) | compose C38 · `.env.example` C38 | - |

- Claims naming a command, exit code or CI step: C1, C13, C15, C26, C27, C28, C36, C37 - each has a proof that reads that file or runs that command
- Claims naming a Vitest db example: C29, C31, C32, C33 - each has a proof that crosses the database boundary
- No other check claims more than the single case its proof exercises

## Swept

- validation: C5, C7, C21
- failure modes: C28
- idempotency: n/a - no retryable write or duplicate key introduced by the toolchain; P2002 is existing unique-index behaviour proven by C31
- authorization: n/a - no authenticated HTTP surface
- concurrency: n/a - harness is one example at a time; no concurrent writers in this phase
- data lifecycle: C29, C33
- dependency failure: C28
- state transitions: n/a - no state machine
- observability: C1

## Handoff

Intended split, with the arithmetic, written before any code:

- S1+S2 obligation files (biome.json, scripts, package.json, CLAUDE.md, vscode, quality-gates, biome-tooling.test.mjs) ≈ 80k. The format tsunami touches the whole tree and would blow the 150k budget if counted as reading; it cannot be split (roadmap: T1.1 is one PR). S3 ≈ 50k (ci.yml, compose, harness, db spec, postgres-ci.test.mjs). Combined obligations under 150k; tsunami is mechanical `biome check --write`. One builder, two commits (Biome+T1.3 then Postgres harness), no hand-off.

- **Boundary:** C1-C25 closed at `886343b4`
- **Boundary:** C26-C38 closed at `c9b4338e`
- **Settled mid-build:** Biome 2.5.14 rejects `recommended` together with `preset`; kept `recommended: false` and dropped `preset`. Canary helper sets `vcs.useIgnoreFile` false so tmp trees without `.gitignore` still lint. `files.includes` also excludes `.turbo` and `.agents`. P2002 live proof uses `prismaAdmin` autocommit because a unique violation aborts a held interactive transaction before the `deletedAt: null` lookup. `db:push:dev` pushes schema as `DATABASE_ADMIN_URL`. Host `psql` is still required for the RLS companion; CI installs `postgresql-client`.
- **Abandoned:** none
