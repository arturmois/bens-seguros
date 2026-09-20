# Phase 1 — Tooling verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 7fc22587..HEAD
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Fault injection was not run because profile is light, so a missing Faults injected killed-mutant table is not a forgotten step. Coverage was not recomputed from authority (light). Binding sources were not opened as a required section (standard/ui only).

Fix scoped to `8ffa4175..fdf98130`: only `scripts/biome-tooling.test.mjs` (+22). Round 1 non-PASS: C7, C16 — re-judged at `fdf98130`. Other check verdicts carried from `8ffa4175`. Citations in `biome-tooling.test.mjs` refreshed (line numbers moved). `postgres-ci.test.mjs` and `*.db.spec.ts` citations carried from `8ffa4175`.

Proofs re-run in full at HEAD `fdf98130` by the verifier (not the author's claim):

`node --test scripts/biome-tooling.test.mjs scripts/postgres-ci.test.mjs`

34 tests, 34 pass, 0 fail. Each named pattern in checks.md for C1–C28 and C30, C34–C38 exists (`rg -n "^test\('"`) and appears as `✔`. C13 `typecheck exits 0` ran in this process and passed.

`pnpm --filter @repo/core exec vitest run --project core:db --reporter=verbose`

4 tests, 4 pass, 0 fail. Names as `✓`:

- `harness rolls back inserted client`
- `harness rolls back inserted client leftover is zero`
- `P2002 live-client conflict`
- `tenant B cannot read org A client`

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `pnpm lint` from repo root runs `biome check` and does not invoke an `eslint` binary | carried from `8ffa4175`; `✔ pnpm lint is biome check not eslint` | `scripts/biome-tooling.test.mjs:102-103` - `assert.match(script, /biome check/)`; `assert.doesNotMatch(script, /eslint/)`. `:117-119` - `assert.doesNotMatch(output, /invoked-eslint/)`; `assert.notEqual(result.status, 99)`; `assert.equal(result.status, 0, output)` | PASS |
| C2 | root `scripts.lint` contains `biome check` and not `eslint` or `turbo lint` | carried from `8ffa4175`; `✔ package.json lint script is biome check` | `scripts/biome-tooling.test.mjs:129-131` - `assert.match(script, /biome check/)`; `assert.doesNotMatch(script, /eslint/)`; `assert.doesNotMatch(script, /turbo lint/)` | PASS |
| C3 | root `scripts.format` contains `biome` and not `prettier` | carried from `8ffa4175`; `✔ package.json format script is biome` | `scripts/biome-tooling.test.mjs:138-139` - `assert.match(script, /biome/)`; `assert.doesNotMatch(script, /prettier/)` | PASS |
| C4 | `lint-staged` commands contain `biome` and not `eslint` or `prettier` | carried from `8ffa4175`; `✔ lint-staged uses biome not eslint or prettier` | `scripts/biome-tooling.test.mjs:149-151` - for each command: `assert.match(String(command), /biome/)`; `assert.doesNotMatch(String(command), /eslint/)`; `assert.doesNotMatch(String(command), /prettier/)` | PASS |
| C5 | `biome.json` JS formatter `lineWidth` 80, semicolons ≡ Prettier `semi: false`, `quoteStyle` `single`, `trailingCommas` `es5` | carried from `8ffa4175`; `✔ biome.json javascript formatter pin` | `scripts/biome-tooling.test.mjs:161-164` - `assert.equal(lineWidth, 80)`; `assert.equal(js.quoteStyle, 'single')`; `assert.equal(js.trailingCommas, 'es5')`; `assert.equal(js.semicolons, 'asNeeded')` | PASS |
| C6 | `linter.rules.recommended` is `false` | carried from `8ffa4175`; `✔ biome.json recommended false` | `scripts/biome-tooling.test.mjs:169-172` - `assert.equal(config.linter && config.linter.rules && config.linter.rules.recommended, false)` | PASS |
| C7 | `noExplicitAny` error; `noConsole` error allow `warn`/`error` not `log`; `noUnusedVariables` error ignoring `^_` | verified at `fdf98130`; `✔ biome.json mapped lint rules` | `scripts/biome-tooling.test.mjs:177-188` - `assert.equal(ruleLevel(findRule(config, 'noExplicitAny')), 'error')`; `assert.equal(ruleLevel(noConsole), 'error')`; `assert.ok(allow.includes('warn'))`; `assert.ok(allow.includes('error'))`; `assert.ok(!allow.includes('log'))`; `assert.equal(ruleLevel(findRule(config, 'noUnusedVariables')), 'error')`. `:190-192` canary `const leftover = 1` then `assert.match(unusedPlain.output, /noUnusedVariables/, unusedPlain.output)`. `:193-199` canary `const _leftover = 1` then `assert.doesNotMatch(unusedUnderscore.output, /noUnusedVariables/, unusedUnderscore.output)` | PASS |
| C8 | `biome check` on explicit `any` reports `noExplicitAny` | carried from `8ffa4175`; `✔ canary reports noExplicitAny` | `scripts/biome-tooling.test.mjs:207` - `assert.match(output, /noExplicitAny/, output)` | PASS |
| C9 | `biome check` on `console.log` reports `noConsole` | carried from `8ffa4175`; `✔ canary reports noConsole for console.log` | `scripts/biome-tooling.test.mjs:214` - `assert.match(output, /noConsole/, output)` | PASS |
| C10 | `console.warn` / `console.error` only does not report `noConsole` | carried from `8ffa4175`; `✔ canary allows console.warn and console.error` | `scripts/biome-tooling.test.mjs:221` - `assert.doesNotMatch(output, /noConsole/, output)` | PASS |
| C11 | `config/eslint-config` and `config/prettier-config` do not exist | carried from `8ffa4175`; `✔ eslint-config and prettier-config directories are gone` | `scripts/biome-tooling.test.mjs:225-226` - `assert.equal(existsSync(join(root, 'config/eslint-config')), false)`; `assert.equal(existsSync(join(root, 'config/prettier-config')), false)` | PASS |
| C12 | `eslint.config.mjs` and `.prettierrc.mjs` do not exist | carried from `8ffa4175`; `✔ eslint.config.mjs and prettierrc.mjs are gone` | `scripts/biome-tooling.test.mjs:230-231` - `assert.equal(existsSync(join(root, 'eslint.config.mjs')), false)`; `assert.equal(existsSync(join(root, '.prettierrc.mjs')), false)` | PASS |
| C13 | `pnpm typecheck` exits `0` | carried from `8ffa4175`; `✔ typecheck exits 0` | `scripts/biome-tooling.test.mjs:241` - `assert.equal(result.status, 0, output)` | PASS |
| C14 | CLAUDE.md Development Commands fence describes lint/format as Biome, not ESLint/Prettier as the project commands | carried from `8ffa4175`; `✔ CLAUDE.md lint and format are Biome` | `scripts/biome-tooling.test.mjs:253-256` - `assert.match(lintLine, /biome/i)`; `assert.match(formatLine, /biome/i)`; `assert.doesNotMatch(lintLine, /eslint/i)`; `assert.doesNotMatch(formatLine, /prettier/i)` | PASS |
| C15 | CI `validate` has `run: pnpm lint` and `continue-on-error` is not `true` | carried from `8ffa4175`; `✔ CI pnpm lint stays blocking` | `scripts/biome-tooling.test.mjs:262-263` - `assert.ok(lint, 'missing CI step run: pnpm lint')`; `assert.equal(lint.continueOnError, false)` | PASS |
| C16 | `biome.json` enables `useSortedClasses` (or Biome 2 equivalent) for `className` | verified at `fdf98130`; `✔ biome.json enables useSortedClasses` | `scripts/biome-tooling.test.mjs:270` - `assert.ok(level && level !== 'off', 'useSortedClasses is not enabled')`. `:273-280` - `assert.ok(Array.isArray(attributes), ...)`; `assert.ok(attributes.includes('className'), 'useSortedClasses must apply to className')` | PASS |
| C17 | `biome check` does not diagnose `node_modules`, `dist`, `.next`, `generated` | carried from `8ffa4175`; `✔ biome.json ignores node_modules dist next generated` | `scripts/biome-tooling.test.mjs:290-293` - `assert.doesNotMatch(output, /node_modules/, output)`; `assert.doesNotMatch(output, /\bdist\b/, output)`; `assert.doesNotMatch(output, /\.next/, output)`; `assert.doesNotMatch(output, /generated/, output)` | PASS |
| C18 | `.husky/pre-commit` invokes `lint-staged` | carried from `8ffa4175`; `✔ husky pre-commit invokes lint-staged` | `scripts/biome-tooling.test.mjs:298` - `assert.match(text, /lint-staged/)` | PASS |
| C19 | VS Code default formatter for TS/TSX is Biome, not `esbenp.prettier-vscode` | carried from `8ffa4175`; `✔ vscode default formatter is biome` | `scripts/biome-tooling.test.mjs:304-308` - `assert.notEqual(settings['editor.defaultFormatter'], 'esbenp.prettier-vscode')`; `assert.equal(settings['[typescript]']?.['editor.defaultFormatter'], biomeId)`; `assert.equal(settings['[typescriptreact]']?.['editor.defaultFormatter'], biomeId)` | PASS |
| C20 | quality-gates collector does not invoke `eslint` | carried from `8ffa4175`; `✔ quality-gates collector does not invoke eslint` | `scripts/biome-tooling.test.mjs:314-315` - `assert.doesNotMatch(text, /execFileSync\(\s*'pnpm',\s*\[[^\]]*eslint/)`; `assert.doesNotMatch(text, /'eslint'/)` | PASS |
| C21 | `noProcessEnv` at error for `packages/` and `apps/server/` | carried from `8ffa4175`; `✔ biome.json enables noProcessEnv for packages and apps/server` | `scripts/biome-tooling.test.mjs:328-337` - `assert.match(joined, /packages/, ...)`; `assert.match(joined, /apps\/server/, ...)` | PASS |
| C22 | `packages/core` file with `process.env.FOO` reports `noProcessEnv` | carried from `8ffa4175`; `✔ canary packages/core process.env reports noProcessEnv` | `scripts/biome-tooling.test.mjs:344` - `assert.match(output, /noProcessEnv/, output)` | PASS |
| C23 | `packages/env/src/index.ts` does not report `noProcessEnv` | carried from `8ffa4175`; `✔ packages/env index does not report noProcessEnv` | `scripts/biome-tooling.test.mjs:354` - `assert.doesNotMatch(output, /noProcessEnv/, output)` | PASS |
| C24 | `apps/web` `process.env.NEXT_PUBLIC_API_URL` does not report `noProcessEnv` | carried from `8ffa4175`; `✔ apps/web NEXT_PUBLIC does not report noProcessEnv` | `scripts/biome-tooling.test.mjs:362` - `assert.doesNotMatch(output, /noProcessEnv/, output)` | PASS |
| C25 | `packages/db/prisma/seed.ts` does not report `noProcessEnv` | carried from `8ffa4175`; `✔ packages/db prisma seed does not report noProcessEnv` | `scripts/biome-tooling.test.mjs:376` - `assert.doesNotMatch(output, /noProcessEnv/, output)` | PASS |
| C26 | `validate` service image starts with `postgres:18` | carried from `8ffa4175`; `✔ CI postgres service image is postgres 18` | `scripts/postgres-ci.test.mjs:57` - `assert.equal(image[1].startsWith('postgres:18'), true, image[1])` | PASS |
| C27 | `DATABASE_URL` user `app_user`; `DATABASE_ADMIN_URL` user `bens` | carried from `8ffa4175`; `✔ CI DATABASE_URL is app_user and DATABASE_ADMIN_URL is bens` | `scripts/postgres-ci.test.mjs:68-75` - `assert.ok(databaseUrls.some((value) => pgUser(value) === 'app_user'), ...)`; `assert.ok(adminUrls.some((value) => pgUser(value) === 'bens'), ...)` | PASS |
| C28 | `pnpm db:push:dev` after healthy Postgres, before `pnpm test`, no `continue-on-error` | carried from `8ffa4175`; `✔ CI db:push:dev before test without continue-on-error` | `scripts/postgres-ci.test.mjs:81-92` - `assert.match(job, /pg_isready/, ...)`; `assert.equal(steps[pushIndex].continueOnError, false)`; `assert.ok(pushIndex < testIndex, 'db:push:dev must run before pnpm test')` | PASS |
| C29 | `db-harness.ts` begins a DB transaction per `*.db.spec.ts` example and rolls it back after | carried from `8ffa4175`; `✓ harness rolls back inserted client` and leftover | `packages/core/src/modules/client/infrastructure/prisma-client-repository.db.spec.ts:37` - `expect(count).toBe(1)`; `:44` - `expect(count).toBe(0)` | PASS |
| C30 | Vitest project include glob matches `**/*.db.spec.ts` | carried from `8ffa4175`; `✔ vitest core:db include glob` | `scripts/postgres-ci.test.mjs:97-100` - `assert.match(text, /name:\s*['"]core:db['"]/)`; `assert.match(dbBlock, /\*\*\/\*\.db\.spec\.ts/)` | PASS |
| C31 | live second `save` P2002 throws `ClientAlreadyExistsError`; lookup uses `deletedAt: null` | carried from `8ffa4175`; `✓ P2002 live-client conflict` | `packages/core/src/modules/client/infrastructure/prisma-client-repository.db.spec.ts:61` - `expect(caught).toBeInstanceOf(ClientAlreadyExistsError)`; `:66-72` `deletedAt: null` then `expect(conflict?.id).toBe(first.id)` | PASS |
| C32 | `createTenantClient` for org B yields null for org A's Client | carried from `8ffa4175`; `✓ tenant B cannot read org A client` | `packages/core/src/modules/client/infrastructure/prisma-client-repository.db.spec.ts:90-94` - `expect(row).toBeNull()` after `createTenantClient(orgB.id)` `findFirst({ where: { id: client.id } })` | PASS |
| C33 | next `*.db.spec.ts` example sees zero Client rows for the seeded org after an insert | carried from `8ffa4175`; `✓ harness rolls back inserted client leftover is zero` | `packages/core/src/modules/client/infrastructure/prisma-client-repository.db.spec.ts:44` - `expect(count).toBe(0)` | PASS |
| C34 | CLAUDE.md states `docker compose up -d` is required before `*.db.spec.ts` / core DB harness | carried from `8ffa4175`; `✔ CLAUDE.md compose prerequisite for db specs` | `scripts/postgres-ci.test.mjs:105-106` - `assert.match(text, /docker compose up -d/)`; `assert.match(text, /\*\.db\.spec\.ts/)` | PASS |
| C35 | unit project include `src/**/*.spec.ts` excluding `*.db.spec.ts`; dummy `DATABASE_URL` `postgresql://test:test@localhost:5432/test` | carried from `8ffa4175`; `✔ unit project dummy DATABASE_URL excludes db specs` | `scripts/postgres-ci.test.mjs:111-116` - `assert.match(text, /include:\s*\[['"]src\/\*\*\/\*\.spec\.ts['"]/)`; `assert.match(text, /exclude:[\s\S]*\*\.db\.spec\.ts/)`; `assert.match(text, /DATABASE_URL:\s*['"]postgresql:\/\/test:test@localhost:5432\/test['"]/)` | PASS |
| C36 | CI steps `pnpm lint`, `pnpm typecheck`, `pnpm test` do not set `continue-on-error` | carried from `8ffa4175`; `✔ CI lint typecheck test stay blocking` | `scripts/postgres-ci.test.mjs:124` - `assert.equal(step.continueOnError, false, command)` | PASS |
| C37 | CI `pnpm arch:check` keeps `continue-on-error` `true` | carried from `8ffa4175`; `✔ CI arch:check continue-on-error remains true` | `scripts/postgres-ci.test.mjs:132` - `assert.equal(arch.continueOnError, true)` | PASS |
| C38 | compose first-volume init creates `app_user` `NOSUPERUSER` `LOGIN`; `.env.example` `DATABASE_URL` that role, `DATABASE_ADMIN_URL` `bens` | carried from `8ffa4175`; `✔ compose app_user and env.example split URLs` | `scripts/postgres-ci.test.mjs:139-154` - `assert.match(sql, /CREATE ROLE\s+app_user/)`; `assert.match(sql, /NOSUPERUSER/)`; `assert.match(sql, /\bLOGIN\b/)`; `assert.equal(pgUser(databaseUrl.slice('DATABASE_URL='.length)), 'app_user')`; `assert.equal(pgUser(adminUrl.slice('DATABASE_ADMIN_URL='.length)), 'bens')` | PASS |

## Coverage

n/a - profile light. Carried from `8ffa4175`. The Coverage join was not recomputed from authority.

## Faults injected

n/a - profile light. Carried from `8ffa4175`. Fault injection was not run because profile is light, so a missing Faults injected section is not a forgotten step.

## Swept existing

C7 re-read at `fdf98130` (round 1 Present was no). Other rows carried from `8ffa4175`. No `existing` row cites a missing constraint.

| Dimension | Check | Constraint in code | Present |
| --- | --- | --- | --- |
| validation | C5 | carried from `8ffa4175` - `biome.json:24` `lineWidth: 80`; `:64-66` `trailingCommas: "es5"`, `semicolons: "asNeeded"`, `quoteStyle: "single"` | yes |
| validation | C7 | verified at `fdf98130` - `biome.json:33` `noUnusedVariables: "error"` (no ignore key; Biome default). Live: unused `leftover` reports `noUnusedVariables`; unused `_leftover` does not (`scripts/biome-tooling.test.mjs:192` and `:196-199`). `:35-39` `noConsole` / `noExplicitAny` unchanged. | yes |
| validation | C21 | carried from `8ffa4175` - `biome.json:75-80` override `includes: ["packages/**", "apps/server/**"]` with `style.noProcessEnv: "error"` | yes |
| failure modes | C28 | carried from `8ffa4175` - `.github/workflows/ci.yml:26-30` `pg_isready`; `:60` `run: pnpm db:push:dev`; `:69` `run: pnpm test` | yes |
| dependency failure | C28 | carried from `8ffa4175` - same YAML; no `continue-on-error` on `db:push:dev` | yes |
| data lifecycle | C29 | carried from `8ffa4175` - `packages/core/test/db-harness.ts:29-37` `$transaction`; `:56-58` rollback via `DB_HARNESS_ROLLBACK` | yes |
| data lifecycle | C33 | carried from `8ffa4175` - same harness; `prisma-client-repository.db.spec.ts:44` `expect(count).toBe(0)` | yes |
| observability | C1 | carried from `8ffa4175` - `package.json:11` `"lint": "biome check ."` | yes |

n/a rows (idempotency, authorization, concurrency, state transitions) are policy the user approved; nothing in the code for them to be wrong about.

## Gate

`node --test scripts/biome-tooling.test.mjs scripts/postgres-ci.test.mjs` - 34 passed, 0 failed

`pnpm --filter @repo/core exec vitest run --project core:db --reporter=verbose` - 4 passed, 0 failed

Expected `python3 .claude/skills/tlc-spec-lean/scripts/validate_verification.py phase-1-tooling`: exit 0, `0 error(s), 0 warning(s)`.
