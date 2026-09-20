# Forbidden dependency hotspots

Baseline for Phase 0 (T0.2). `pnpm arch:check` reports these as **warn**. T6.3 flips a rule to error when that hotspot hits zero.

## Routes importing the database package

Named hotspot: `routes/** → @repo/db`

`apps/server/src/routes/**` still imports `@repo/db` (Prisma client, `prismaAdmin`, or `Prisma` types). Roadmap §8: routes may import `@repo/core/<module>` and `@repo/auth`, not Prisma.

Typical leftovers: internal HMAC lead/claim routes, billing reads, commission approve/reject, PDF generators, terms, Asaas webhooks.

## Core module cycles

Inside `packages/core/src/modules`: none remaining. T4.2 inverted the documents/sales cycle (`AttachProposalDocument` in sales calls documents; documents do not import sales).

`shared-kernel` importing a module, or module B importing module A internals, is also forbidden once those folders exist. They are not a current hotspot.

## Core module infrastructure from apps

Named hotspot: `apps/server/src/** → packages/core/.../infrastructure`

App code must not import Prisma adapters from core module `infrastructure/` (including `@repo/core/workspace/infrastructure`). Temporary allowlist until T6.1/T6.2:

- `apps/server/src/container-registrations.ts`
- `apps/server/src/bootstrap/`

Those two may import adapters for composition. The allowlist clears when T6.1/T6.2 land.

## Not in this file

Package DAG (`@app/*` ↛ `@app/*`) is already acyclic. Chat-worker → `@repo/core` / `@repo/db` is Phase 5, not this checker yet.
