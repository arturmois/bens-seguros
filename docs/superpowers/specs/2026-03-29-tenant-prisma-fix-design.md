# Tenant Prisma Fix — Batch Transaction + Pool Sizing

## Problem

`createTenantClient()` wraps every Prisma query in an **interactive transaction** (`$transaction(async (tx) => {...})`). This holds a dedicated pool connection for the entire callback duration. With the default pool of 10 connections, any `Promise.all` with >10 tenant queries causes P2028 timeout (connection pool exhaustion).

The current codebase uses tenant prisma in only 2 endpoints (search-routes: 4 queries, lead-routes: 3 queries). The remaining ~95% of queries use global prisma with application-level `WHERE organizationId` filtering. This is correct and intentional.

## Solution

Two changes:

### 1. Switch to batch transactions (official Prisma pattern)

Replace interactive transaction with batch (sequential) transaction in `createTenantClient`:

```typescript
// packages/db/src/tenant-client.ts

export function createTenantClient(organizationId: string) {
  return prisma.$extends({
    query: {
      $allOperations({ args, query }) {
        const [, result] = await prisma.$transaction([
          prisma.$executeRaw`SELECT set_config('app.current_tenant', ${organizationId}, true)`,
          query(args),
        ])
        return result
      },
    },
  })
}
```

Batch transactions complete in a single roundtrip and release the connection faster than interactive transactions (no callback to hold it open).

**Caveat:** The Prisma official RLS extension example (github.com/prisma/prisma-client-extensions/tree/main/row-level-security) uses this exact pattern and warns that explicit `$transaction()` calls on the extended client may not work as intended (nested transactions). This is acceptable because no code in the codebase calls `tenantPrisma.$transaction()`.

### 2. Increase pg pool size

Configure the PrismaPg adapter with a larger pool:

```typescript
// packages/db/src/index.ts

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  const adapter = new PrismaPg({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30_000,
  })
  return new PrismaClient({ adapter })
}
```

Pool of 20 (up from default 10) handles concurrent tenant queries better. `idleTimeoutMillis: 30s` (up from 10s) reduces connection churn in low-traffic periods.

### 3. Document the tenant isolation strategy

Add a comment block in `tenant-client.ts` explaining:

- Application-level `WHERE organizationId` is the primary isolation mechanism
- RLS via `createTenantClient` is defense-in-depth for sensitive endpoints
- Not all queries go through tenantPrisma — this is by design
- Batch transactions are used to avoid pool exhaustion

## Files Changed

- `packages/db/src/tenant-client.ts` — interactive → batch transaction
- `packages/db/src/index.ts` — pool configuration
- `packages/db/src/tenant-client.ts` — documentation comment

## Testing

- Existing tests continue to pass (tenant-middleware.spec.ts)
- Manual: dashboard loads without P2028 (server restart required)
- Manual: search route still works with tenant isolation

## What This Does NOT Change

- DI container registration stays singleton with global prisma
- Repositories continue to use global prisma via DI
- Workers continue to use global prisma
- No new tenantPrisma usage added anywhere
- stats-helpers stays on global prisma (19+ parallel queries)
