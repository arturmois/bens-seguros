# Forbidden dependency hotspots

Baseline for Phase 0 (T0.2). `pnpm arch:check` reports these as **warn**. T6.3 flips a rule to error when that hotspot hits zero.

## Routes importing the database package

Named hotspot: `routes/** → @repo/db`

`apps/server/src/routes/**` still imports `@repo/db` (Prisma client, `prismaAdmin`, or `Prisma` types). Roadmap §8: routes may import `@repo/core/<module>` and `@repo/auth`, not Prisma.

Typical leftovers: internal HMAC lead/claim routes, billing reads, commission approve/reject, PDF generators, terms, Asaas webhooks.

## Core module cycles

Inside `packages/core/src/modules`:

| Cycle             | Why it exists today                                                          | Clears when            |
| ----------------- | ---------------------------------------------------------------------------- | ---------------------- |
| proposal⇄contact  | create/advance proposal and promote-contact share checklist/contact types    | T3.1 sales merge       |
| proposal⇄policy   | `create-proposal` injects policy repo; `issue-policy` orchestrates proposal  | T3.1                   |
| proposal⇄document | `upload-document` auto-completes proposal checklist                          | T4.2 invert documents  |
| goal⇄dashboard    | progress query reads dashboard repo; dashboard types leak through goal index | T3.4 performance merge |

`shared-kernel` importing a module, or module B importing module A internals, is also forbidden once those folders exist. They are not a current hotspot.

## Not in this file

Package DAG (`@app/*` ↛ `@app/*`) is already acyclic. Chat-worker → `@repo/core` / `@repo/db` is Phase 5, not this checker yet.
