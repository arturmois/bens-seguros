# Agent instructions

Product, architecture, and coding rules: `CLAUDE.md`. Follow them.

## After every change

Do not mark work done, commit, or open a PR until the **blocking** CI steps have been run against **this** change and exited 0.

From the repo root (same order as `.github/workflows/ci.yml` job `validate`):

```bash
pnpm test:architecture
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

- `pnpm lint` is `biome check .`. It must emit **zero errors and zero infos**. `Found N infos` is not a pass — fix the diagnostics (for `useSortedClasses`, `biome check --write --unsafe --only=lint/nursery/useSortedClasses .`).
- `pnpm typecheck` must exit 0 with no `error TS`.
- `pnpm db:push:dev` only when the Prisma schema changed (needs Postgres).
- Skip steps that CI marks `continue-on-error` (`pnpm audit`, `pnpm arch:check`, coverage, quality-gates). They do not replace the commands above.

If a gate fails, fix the cause. Do not weaken assertions, skip hooks, or declare success from a previous green run.
