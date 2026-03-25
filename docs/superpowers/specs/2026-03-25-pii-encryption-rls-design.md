# SEC-01 + SEC-02: PII Encryption + PostgreSQL RLS — Design Spec

## Goal

Add two layers of data protection to the Bens Seguros platform: AES-256-GCM encryption for CPF/CNPJ (LGPD compliance) and PostgreSQL Row Level Security for defense-in-depth tenant isolation. Combined implementation as a single project since they are interdependent.

## Context

- **Phase:** Demo (no real client data — destructive migration acceptable)
- **Current state:** PII stored plaintext, RLS infrastructure coded but not activated, all 61 repository queries already filter by `organizationId`
- **Risk:** LGPD non-compliance for CPF/CNPJ, single point of failure for tenant isolation (middleware only)

## Architecture

Three layers of protection (defense-in-depth):

```
Request → Middleware (validates member) → RLS (DB rejects wrong tenant) → Encryption (PII unreadable at rest)
```

1. **Encryption:** CPF/CNPJ encrypted with AES-256-GCM, searchable via SHA-256 hash
2. **RLS:** PostgreSQL policies on 10 tables, enforced via `app.current_tenant` session variable
3. **Middleware:** Existing tenant middleware (unchanged)

## Scope

### In scope

- Encrypt `document` (CPF/CNPJ) field on Client model
- Enable RLS on 10 tables with `organizationId`
- Wire existing `createTenantClient` Prisma extension into request lifecycle
- Update search to use document hash

### Out of scope (backlog)

- Presenter pattern (SEC-03) — separate feature
- Email/phone encryption — lower LGPD priority, protected by RLS + RBAC
- LGPD deletion job — separate feature
- PII redaction for AI — separate feature

## Component Design

### 1. Crypto Utils (`packages/shared/src/crypto.ts`)

```typescript
interface EncryptedField {
  readonly ciphertext: string // base64
  readonly iv: string // base64, 12 bytes
  readonly tag: string // base64, 16 bytes
}

function encrypt(plaintext: string, key: Buffer): EncryptedField
function decrypt(encrypted: EncryptedField, key: Buffer): string
function hashDocument(document: string): string // SHA-256 hex, strips non-digits first
function getEncryptionKey(): Buffer // reads ENCRYPTION_KEY from env, validates 32+ chars
```

- AES-256-GCM with random 12-byte IV per encryption
- SHA-256 hash strips non-digit chars before hashing (so "123.456.789-00" and "12345678900" produce same hash)
- Key from `ENCRYPTION_KEY` env var (hex-encoded 32-byte key)
- Export from `@repo/shared`

### 2. Schema Changes (Client model)

```prisma
model Client {
  // ... existing fields
  document           String?          // DEPRECATED: will store masked value "***.***.XXX-XX"
  documentEncrypted  String           // AES-256-GCM ciphertext (JSON with iv, tag, ciphertext)
  documentHash       String           // SHA-256 hex for lookup

  @@unique([organizationId, documentHash])  // replaces @@unique([organizationId, document])
}
```

- `documentEncrypted`: stores JSON string of `EncryptedField`
- `documentHash`: SHA-256 of stripped digits, used for uniqueness and exact-match search
- `document`: kept temporarily with masked value for backward compat in UI list views
- Migration: `prisma migrate dev` (demo phase — reset acceptable if needed)

### 3. ClientMapper Updates

**toPersistence():**

```
1. Strip non-digits from document
2. Encrypt → documentEncrypted (JSON)
3. Hash → documentHash
4. Mask → document ("***.***.XXX-XX" last 4 digits visible)
```

**toDomain():**

```
1. Parse documentEncrypted JSON
2. Decrypt → original document
3. Return decrypted value as domain.document
```

### 4. Search by CPF/CNPJ

- **Exact match only:** `WHERE documentHash = hash(input)`
- Partial CPF search not supported (accepted tradeoff — users search by name)
- `findByDocument(document, orgId)` → hash input, query by hash
- Global search endpoint (`/api/v1/search`) updated to hash the query when it looks like a CPF/CNPJ

### 5. RLS SQL Migration

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Proposal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Policy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Claim" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Commission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Endorsement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Assistance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Create isolation policy on each table
CREATE POLICY tenant_isolation ON "Client"
  USING ("organizationId" = current_setting('app.current_tenant', true));
-- ... repeat for all 10 tables

-- Superuser bypass (for migrations, admin queries)
ALTER TABLE "Client" FORCE ROW LEVEL SECURITY;  -- even table owner respects RLS
-- OR: use a separate migration role that bypasses RLS
```

**Important:** `current_setting('app.current_tenant', true)` returns NULL if not set. The policy `USING (orgId = NULL)` matches nothing → safe default (zero rows returned).

### 6. Prisma Tenant Extension Activation

Existing code in `packages/db/src/tenant-client.ts` already implements the extension. Changes needed:

**Option chosen:** Per-request Prisma client via Fastify decorator.

```typescript
// In tenantMiddleware, after validation:
const tenantPrisma = createTenantClient(organizationId)
request.prisma = tenantPrisma
```

**Fastify type augmentation:**

```typescript
declare module 'fastify' {
  interface FastifyRequest {
    prisma: PrismaClient // tenant-scoped client
  }
}
```

**Repository changes:** Repositories receive `prisma` via constructor DI. The DI container resolves per-request using `request.prisma`. Since repositories are already `@injectable()` with prisma injected, the change is at the container registration level — resolve prisma from request context instead of global singleton.

**Alternative (simpler):** Keep global prisma in repositories but SET LOCAL in a Fastify onRequest hook. This avoids changing DI but still gets RLS enforcement:

```typescript
app.addHook('onRequest', async (request) => {
  if (request.organizationId) {
    await prisma.$executeRawUnsafe(
      `SET LOCAL app.current_tenant = '${request.organizationId}'`
    )
  }
})
```

**Concern:** `SET LOCAL` only works within a transaction. Without explicit transaction, the setting resets after each query. The existing `createTenantClient` extension wraps each operation in a transaction — this is the correct approach.

**Decision:** Use `createTenantClient` extension, injected per-request. Repositories don't change their interface — the prisma instance they receive is already tenant-scoped.

### 7. Environment Variables

```env
# Required for encryption (hex-encoded 32-byte key)
ENCRYPTION_KEY=<64 hex chars>

# Generate with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to `@repo/env` validation (Zod):

- `ENCRYPTION_KEY`: `z.string().min(64).regex(/^[0-9a-f]+$/i)` (required in production, optional in dev with fallback)

## Data Flow

### Write (create/update client)

```
API receives document "123.456.789-00"
  → Strip: "12345678900"
  → Encrypt: { ciphertext, iv, tag }
  → Hash: SHA-256("12345678900") → "a1b2c3..."
  → Mask: "***.***.789-00"
  → Store: documentEncrypted=JSON, documentHash="a1b2c3...", document="***.***.789-00"
```

### Read (get client)

```
DB returns row with documentEncrypted
  → Parse JSON: { ciphertext, iv, tag }
  → Decrypt: "12345678900"
  → Format: "123.456.789-00" (apply mask in domain)
  → Return to API caller
```

### Search (find by CPF)

```
User types "12345678900"
  → Strip: "12345678900"
  → Hash: SHA-256 → "a1b2c3..."
  → Query: WHERE documentHash = "a1b2c3..." AND organizationId via RLS
```

## Error Handling

| Scenario                          | Behavior                                       |
| --------------------------------- | ---------------------------------------------- |
| Missing ENCRYPTION_KEY in prod    | Server refuses to start (env validation)       |
| Missing ENCRYPTION_KEY in dev     | Use hardcoded dev key with warning log         |
| Decryption failure (corrupt data) | Log error, return masked document, don't crash |
| RLS blocks query (no tenant set)  | Returns 0 rows (safe default)                  |
| RLS + wrong tenant                | Returns 0 rows (policy enforced)               |
| SET LOCAL outside transaction     | createTenantClient wraps in transaction        |

## Testing

- **Unit:** crypto encrypt/decrypt/hash roundtrip
- **Unit:** ClientMapper toPersistence encrypts, toDomain decrypts
- **Integration:** Client create → read returns decrypted document
- **Integration:** findByDocument with hash returns correct client
- **Integration:** RLS — query without SET LOCAL returns 0 rows
- **Integration:** RLS — query with wrong tenant returns 0 rows
- **Integration:** RLS — query with correct tenant returns expected rows

## Acceptance Criteria

- [ ] CPF/CNPJ stored encrypted (AES-256-GCM) in `documentEncrypted`
- [ ] CPF/CNPJ searchable via SHA-256 hash in `documentHash`
- [ ] Plaintext `document` field contains only masked value
- [ ] ENCRYPTION_KEY validated at startup (required in prod)
- [ ] RLS enabled on 10 tables
- [ ] Query without `app.current_tenant` returns 0 rows
- [ ] Query with wrong tenant returns 0 rows
- [ ] Query with correct tenant returns expected data
- [ ] createTenantClient wired into request lifecycle
- [ ] All existing tests pass (no regressions)
- [ ] Global search hashes CPF input for document lookup
- [ ] Zero `console.log`, zero `any`, zero `as` assertions
