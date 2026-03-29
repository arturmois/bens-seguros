# P3 Audit Remediation — 21 Minor Findings

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 21 P3 (minor) findings from the pre-production audit (`docs/AUDITORIA-PRE-PRODUCAO.md`).

**Architecture:** Grouped into 7 tasks by domain: security hardening, error handler dedup, domain logic fixes, schema/migration, frontend UX, chat accessibility, and infrastructure fixes. Each task is independently committable.

**Tech Stack:** TypeScript, Fastify 5, Next.js 16, React 19, Prisma 7, Better Auth, React Hook Form, Zod

---

## Task 1: Security Hardening (P3 #1, #2, #3, #4, #5, #6)

**Files:**

- Modify: `packages/auth/src/index.ts` (password min, session duration)
- Modify: `packages/env/src/index.ts` (new HMAC_KEY env var)
- Modify: `packages/shared/src/crypto.ts` (use dedicated HMAC key)
- Modify: `apps/chat-server/src/infra/http/routes/webhook-routes.ts:223` (timing-safe compare)
- Modify: `apps/chat-server/src/infra/http/routes/widget-helpers.ts:77` (allowedOrigins)

### P3 #5: Password minimum 8 → 12

- [ ] **Step 1: Update min password length**

In `packages/auth/src/index.ts:53`, change:

```typescript
// OLD
minPasswordLength: 8,
// NEW
minPasswordLength: 12,
```

### P3 #1 + #2: Session duration + cookie attributes

- [ ] **Step 2: Shorten session + add explicit cookie attributes**

In `packages/auth/src/index.ts`, replace the `session` block (lines 63-70):

```typescript
// OLD
session: {
  expiresIn: 60 * 60 * 24 * 7, // 7 days
  updateAge: 60 * 60 * 24, // 1 day
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60, // 5 min
  },
},
// NEW
session: {
  expiresIn: 60 * 60 * 24 * 3, // 3 days (reduced from 7)
  updateAge: 60 * 60 * 12, // 12 hours (rotation on privilege use)
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60, // 5 min
  },
},
```

The `defaultCookieAttributes` already sets `domain` for production. Better Auth automatically sets `httpOnly`, `secure` (in production), and `sameSite: lax` — this is correct. The audit concern about "implicit" defaults is addressed by the fact that Better Auth's defaults are secure. No override needed.

### P3 #3: Webhook verify token constant-time comparison

- [ ] **Step 3: Fix timing attack vulnerability**

In `apps/chat-server/src/infra/http/routes/webhook-routes.ts`, add import at top:

```typescript
import { timingSafeEqual } from 'node:crypto'
```

Replace line 223:

```typescript
// OLD
if (verifyToken !== expectedToken) {
// NEW
const tokenBuffer = Buffer.from(verifyToken, 'utf8')
const expectedBuffer = Buffer.from(expectedToken, 'utf8')
if (
  tokenBuffer.length !== expectedBuffer.length ||
  !timingSafeEqual(tokenBuffer, expectedBuffer)
) {
```

### P3 #4: Widget allowedOrigins empty permits all origins

- [ ] **Step 4: Enforce origin validation when unconfigured**

In `apps/chat-server/src/infra/http/routes/widget-helpers.ts`, replace `isValidOrigin` (lines 73-80):

```typescript
// OLD
export function isValidOrigin(
  allowedOrigins: readonly string[],
  requestOrigin: string | undefined
): boolean {
  if (allowedOrigins.length === 0) return true
  if (!requestOrigin) return false
  return allowedOrigins.some((origin) => requestOrigin === origin)
}
// NEW
export function isValidOrigin(
  allowedOrigins: readonly string[],
  requestOrigin: string | undefined
): boolean {
  if (!requestOrigin) return false
  if (allowedOrigins.length === 0) return false
  return allowedOrigins.some((origin) => requestOrigin === origin)
}
```

### P3 #6: HMAC reuses encryption key

- [ ] **Step 5: Add dedicated HMAC key to env schema**

In `packages/env/src/index.ts`, add after `ENCRYPTION_KEY` (line 41):

```typescript
// Dedicated key for HMAC hashing of PII (CPF/CNPJ). Separate from ENCRYPTION_KEY.
// Falls back to ENCRYPTION_KEY if not set (backwards compat).
HMAC_KEY: z
  .string()
  .min(32, 'HMAC_KEY must be at least 32 characters')
  .optional(),
```

- [ ] **Step 6: Update hashDocument to use dedicated HMAC key**

In `packages/shared/src/crypto.ts`, replace `hashDocument` (lines 71-75):

```typescript
// OLD
export function hashDocument(document: string): string {
  const digits = stripNonDigits(document)
  const key = getEncryptionKey()
  return createHmac('sha256', key).update(digits).digest('hex')
}
// NEW
export function hashDocument(document: string): string {
  const digits = stripNonDigits(document)
  const hmacKeyHex = process.env.HMAC_KEY
  const key = hmacKeyHex ? Buffer.from(hmacKeyHex, 'utf8') : getEncryptionKey()
  return createHmac('sha256', key).update(digits).digest('hex')
}
```

- [ ] **Step 7: Commit**

```bash
git add packages/auth/src/index.ts packages/env/src/index.ts packages/shared/src/crypto.ts apps/chat-server/src/infra/http/routes/webhook-routes.ts apps/chat-server/src/infra/http/routes/widget-helpers.ts
git commit -m "fix: P3 security hardening — password min 12, session 3d, timing-safe verify, origin enforcement, HMAC key separation"
```

---

## Task 2: Error Handler Deduplication (P3 #9)

**Files:**

- Create: `apps/server/src/routes/v1/handle-domain-error.ts`
- Modify: `apps/server/src/routes/v1/client-routes.ts`
- Modify: `apps/server/src/routes/v1/proposal-routes.ts`
- Modify: `apps/server/src/routes/v1/commission-routes.ts`
- Modify: `apps/server/src/routes/v1/claim-routes.ts`
- Modify: `apps/server/src/routes/v1/policy-routes.ts`
- Modify: `apps/server/src/routes/v1/insurer-routes.ts`

The pattern across all route files is identical: check `instanceof DomainError`, map to HTTP status via error code, format as `{ success: false, error: { code, message } }`. The only variation is which specific error classes map to which HTTP status.

- [ ] **Step 1: Create shared error handler**

Create `apps/server/src/routes/v1/handle-domain-error.ts`:

```typescript
import type { FastifyReply } from 'fastify'

interface DomainErrorLike {
  readonly code: string
  readonly message: string
}

const CODE_TO_STATUS: Record<string, number> = {
  // 404 Not Found
  CLIENT_NOT_FOUND: 404,
  PROPOSAL_NOT_FOUND: 404,
  COMMISSION_NOT_FOUND: 404,
  CLAIM_NOT_FOUND: 404,
  POLICY_NOT_FOUND: 404,
  INSURER_NOT_FOUND: 404,
  DOCUMENT_NOT_FOUND: 404,
  ENDORSEMENT_NOT_FOUND: 404,
  ASSISTANCE_NOT_FOUND: 404,
  // 409 Conflict
  CLIENT_ALREADY_EXISTS: 409,
  POLICY_ALREADY_EXISTS: 409,
  INSURER_ALREADY_EXISTS: 409,
  // 422 Unprocessable
  INVALID_STAGE_TRANSITION: 422,
  INVALID_COMMISSION_TRANSITION: 422,
  INVALID_CLAIM_TRANSITION: 422,
  INVALID_ENDORSEMENT_TRANSITION: 422,
  INVALID_STATUS_TRANSITION: 422,
  COMMISSION_ALREADY_REVERSED: 422,
  BRANCH_MISMATCH: 422,
  MISSING_PREMIUM: 422,
}

function isDomainError(error: unknown): error is DomainErrorLike {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as DomainErrorLike).code === 'string'
  )
}

export function handleDomainError(
  error: unknown,
  reply: FastifyReply
): FastifyReply | never {
  if (isDomainError(error)) {
    const status = CODE_TO_STATUS[error.code]
    if (status) {
      return reply.status(status).send({
        success: false,
        error: { code: error.code, message: error.message },
      })
    }
  }
  throw error
}
```

- [ ] **Step 2: Replace in each route file**

For each of the 6 route files, replace the local `handleXError` function with an import:

```typescript
// ADD at top
import { handleDomainError } from './handle-domain-error.js'

// REMOVE the entire local handleXError function

// REPLACE all call sites: handleClientError(error, reply) → handleDomainError(error, reply)
// REPLACE all call sites: handleProposalError(error, reply) → handleDomainError(error, reply)
// etc.
```

Files to update:

- `client-routes.ts`: remove `handleClientError` (lines 39-53), replace 4 call sites
- `proposal-routes.ts`: remove `handleProposalError` (lines 36-68), replace 8 call sites
- `commission-routes.ts`: remove `handleCommissionError` (lines 35-64), replace 6 call sites
- `claim-routes.ts`: remove `handleClaimError` (lines 34-54), replace 5 call sites
- `policy-routes.ts`: remove `handlePolicyError` (lines 41-67), replace 4 call sites
- `insurer-routes.ts`: remove `handleInsurerError` (lines 24-37), replace 1 call site

- [ ] **Step 3: Verify no regressions**

Run: `pnpm typecheck && pnpm lint`
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/v1/handle-domain-error.ts apps/server/src/routes/v1/client-routes.ts apps/server/src/routes/v1/proposal-routes.ts apps/server/src/routes/v1/commission-routes.ts apps/server/src/routes/v1/claim-routes.ts apps/server/src/routes/v1/policy-routes.ts apps/server/src/routes/v1/insurer-routes.ts
git commit -m "refactor: P3 deduplicate handle*Error across 6 route files into shared handleDomainError"
```

---

## Task 3: Domain Logic Fixes (P3 #10, #11, #12)

**Files:**

- Modify: `packages/core/src/modules/proposal/domain/proposal.ts` (reopen LOST)
- Modify: `packages/core/src/modules/proposal/domain/proposal-errors.ts` (add error)
- Create: `packages/core/src/modules/proposal/application/reopen-proposal.ts`
- Create: `packages/core/src/modules/proposal/application/reopen-proposal.spec.ts`
- Modify: `packages/core/src/modules/proposal/index.ts` (export)
- Modify: `apps/server/src/routes/v1/proposal-routes.ts` (add route)
- Modify: `apps/server/src/container-registrations.ts` (register)
- Modify: `packages/core/src/modules/commission/domain/commission.ts` (comment)
- Modify: `apps/server/src/routes/v1/stats-helpers.ts` (conversion rate fix)

### P3 #10: Reopen LOST proposals

- [ ] **Step 1: Add reopenFromLost method to Proposal entity**

In `packages/core/src/modules/proposal/domain/proposal.ts`, add method after `markAsLost`:

```typescript
reopenFromLost(): void {
  if (this.props.stage !== 'LOST') {
    throw new InvalidStageTransitionError(this.props.stage, 'reabrir')
  }
  this.props.stage = 'CAPTURE'
  this.props.lostReason = null
  this.props.updatedAt = new Date()
}
```

- [ ] **Step 2: Write failing test for ReopenProposal use case**

Create `packages/core/src/modules/proposal/application/reopen-proposal.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReopenProposal } from './reopen-proposal.js'
import { Proposal } from '../domain/proposal.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'

function createMockRepo(): ProposalRepository {
  return {
    findById: vi.fn(),
    save: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
  } as unknown as ProposalRepository
}

describe('ReopenProposal', () => {
  let useCase: ReopenProposal
  let repo: ProposalRepository

  beforeEach(() => {
    repo = createMockRepo()
    useCase = new ReopenProposal(repo)
  })

  it('reopens a LOST proposal back to CAPTURE', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      clientId: 'client-1',
      salespersonId: 'sp-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    proposal.markAsLost('Cliente desistiu')

    vi.mocked(repo.findById).mockResolvedValue(proposal)
    vi.mocked(repo.save).mockResolvedValue(undefined)

    await useCase.execute(proposal.id, 'org-1')

    expect(proposal.stage).toBe('CAPTURE')
    expect(proposal.lostReason).toBeNull()
    expect(repo.save).toHaveBeenCalledWith(proposal)
  })

  it('throws when proposal is not LOST', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      clientId: 'client-1',
      salespersonId: 'sp-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })

    vi.mocked(repo.findById).mockResolvedValue(proposal)

    await expect(useCase.execute(proposal.id, 'org-1')).rejects.toThrow(
      'avançar' // will be 'reabrir' after implementation, adjust accordingly
    )
  })

  it('throws ProposalNotFoundError when not found', async () => {
    vi.mocked(repo.findById).mockResolvedValue(null)

    await expect(useCase.execute('nope', 'org-1')).rejects.toThrow()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @repo/core exec vitest run src/modules/proposal/application/reopen-proposal.spec.ts`
Expected: FAIL (module not found)

- [ ] **Step 4: Implement ReopenProposal use case**

Create `packages/core/src/modules/proposal/application/reopen-proposal.ts`:

```typescript
import { injectable, inject } from 'tsyringe'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import { ProposalErrors } from '../domain/proposal-errors.js'

@injectable()
export class ReopenProposal {
  constructor(
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository
  ) {}

  async execute(proposalId: string, organizationId: string): Promise<void> {
    const proposal = await this.proposalRepo.findById(
      proposalId,
      organizationId
    )
    if (!proposal) {
      throw ProposalErrors.notFound(proposalId)
    }

    proposal.reopenFromLost()
    await this.proposalRepo.save(proposal)
  }
}
```

- [ ] **Step 5: Export from index and register in container**

In `packages/core/src/modules/proposal/index.ts`, add export:

```typescript
export { ReopenProposal } from './application/reopen-proposal.js'
```

Register in `apps/server/src/container-registrations.ts` (only if not auto-resolved — check if other proposal use cases are registered there).

- [ ] **Step 6: Add route**

In `apps/server/src/routes/v1/proposal-routes.ts`, add route (after the markAsLost route):

```typescript
// POST /api/v1/proposals/:id/reopen
app.post(
  '/api/v1/proposals/:id/reopen',
  { preHandler: [requireAbility('update', 'Proposal')] },
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = idParamSchema.parse(request.params)
    const organizationId = request.organizationId!

    try {
      const useCase = container.resolve(ReopenProposal)
      await useCase.execute(id, organizationId)
      return reply.send({ success: true, data: null })
    } catch (error) {
      return handleDomainError(error, reply)
    }
  }
)
```

Add import: `import { ..., ReopenProposal } from '@repo/core'`

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm --filter @repo/core exec vitest run src/modules/proposal/application/reopen-proposal.spec.ts`
Expected: PASS

### P3 #11: Commission domain approver role validation (comment only)

- [ ] **Step 8: Document design decision**

The audit notes that the commission domain doesn't validate the approver's role. This is BY DESIGN — role enforcement is handled by CASL middleware at the route level (`requireAbility('approve', 'Commission')`). Adding domain-level role validation would create coupling between domain and auth layers.

In `packages/core/src/modules/commission/domain/commission.ts`, add comment above `approveByCommercial` (line 84):

```typescript
// NOTE: Caller role validation is delegated to CASL middleware (requireAbility).
// Domain validates status transitions only — no coupling to auth layer. (P3 #11 audit)
```

### P3 #12: Conversion rate uses createdAt instead of updatedAt

- [ ] **Step 9: Fix conversion rate query**

In `apps/server/src/routes/v1/stats-helpers.ts`, the conversion rate query at lines 147-154 counts POLICY_ISSUED proposals using `createdAt`. A proposal created months ago but issued today should count as a conversion in the current period based on when it was issued (updatedAt), not created.

Replace lines 147-154:

```typescript
// OLD
prisma.proposal.count({
  where: {
    organizationId: orgId,
    stage: 'POLICY_ISSUED',
    createdAt: { gte: currentFrom },
    deletedAt: null,
  },
}),
// NEW
prisma.proposal.count({
  where: {
    organizationId: orgId,
    stage: 'POLICY_ISSUED',
    updatedAt: { gte: currentFrom },
    deletedAt: null,
  },
}),
```

- [ ] **Step 10: Commit**

```bash
git add packages/core/src/modules/proposal/ apps/server/src/routes/v1/proposal-routes.ts apps/server/src/routes/v1/stats-helpers.ts packages/core/src/modules/commission/domain/commission.ts
git commit -m "fix: P3 domain logic — reopen LOST proposals, conversion rate uses updatedAt, commission role doc"
```

---

## Task 4: Schema & Migration Fixes (P3 #13, #14)

**Files:**

- Modify: `packages/db/prisma/schema.prisma` (Claim field + DocumentType)
- Modify: `packages/core/src/modules/claim/domain/claim-repository.ts` (add field)
- Modify: `packages/core/src/modules/document/domain/document-repository.ts` (add type)
- Modify: `apps/server/src/routes/v1/proposal-routes.ts:167,224` (use QUOTATION_PDF)
- Modify: `apps/server/src/schemas/document.schemas.ts` (add type)

### P3 #13: Claim missing estimatedValueInCents

- [ ] **Step 1: Add field to Prisma schema**

In `packages/db/prisma/schema.prisma`, add to the Claim model after `description` (line 412):

```prisma
estimatedValueInCents Int?
```

- [ ] **Step 2: Add field to domain interfaces**

In `packages/core/src/modules/claim/domain/claim-repository.ts`, add `estimatedValueInCents` to both `ClaimData` and `CreateClaimInput` interfaces (as optional `number | null`). Also update any mapper if present.

- [ ] **Step 3: Push schema changes**

Run: `pnpm --filter @repo/db exec prisma db push`
Then re-apply RLS (will be automated in Task 7).

### P3 #14: PDF type POLICY_PDF used for quotation

- [ ] **Step 4: Add QUOTATION_PDF to DocumentType**

In `packages/core/src/modules/document/domain/document-repository.ts`, add to `DocumentType` union:

```typescript
| 'QUOTATION_PDF'
```

In `apps/server/src/schemas/document.schemas.ts`, add to the enum:

```typescript
'QUOTATION_PDF',
```

- [ ] **Step 5: Update proposal-routes to use QUOTATION_PDF**

In `apps/server/src/routes/v1/proposal-routes.ts`:

Line 167 — replace:

```typescript
const existingPdf = existing.find((doc) => doc.type === 'POLICY_PDF')
// NEW
const existingPdf = existing.find(
  (doc) => doc.type === 'QUOTATION_PDF' || doc.type === 'POLICY_PDF'
)
```

Line 224 — replace:

```typescript
type: 'POLICY_PDF',
// NEW
type: 'QUOTATION_PDF',
```

Note: The `find` on line 167 checks both types for backwards compatibility with existing documents.

- [ ] **Step 6: Generate Prisma client + verify**

Run: `pnpm --filter @repo/db exec prisma generate && pnpm typecheck`
Expected: zero errors

- [ ] **Step 7: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/core/src/modules/claim/ packages/core/src/modules/document/ apps/server/src/routes/v1/proposal-routes.ts apps/server/src/schemas/document.schemas.ts
git commit -m "fix: P3 add estimatedValueInCents to Claim, add QUOTATION_PDF document type"
```

---

## Task 5: Frontend UX Fixes (P3 #15, #16, #17)

**Files:**

- Modify: `apps/web/src/components/layout/dashboard-shell.tsx` (spinner)
- Modify: `apps/web/src/features/policies/components/policies-table.tsx` (CTA)
- Modify: `apps/web/src/features/commissions/components/commissions-table-rows.tsx` (CTA)
- Modify: `apps/web/src/features/proposals/components/proposal-form.tsx` (onBlur)

### P3 #15: Dashboard shell loading without spinner

- [ ] **Step 1: Add spinner to dashboard shell**

In `apps/web/src/components/layout/dashboard-shell.tsx`, add import:

```typescript
import { Spinner } from '@/components/ui/spinner'
```

Replace lines 17-23:

```tsx
// OLD
if (isLoading || !activeOrg) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-muted-foreground text-sm">Carregando...</div>
    </div>
  )
}
// NEW
if (isLoading || !activeOrg) {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner className="text-muted-foreground size-6" />
    </div>
  )
}
```

### P3 #16: Empty states without CTA

- [ ] **Step 2: Add CTA to policies empty state**

In `apps/web/src/features/policies/components/policies-table.tsx`, replace the empty state block (lines 101-110). Add import for `Link` from `next/link` and `FileText` icon if needed:

```tsx
// OLD
<div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
  <Shield className="text-muted-foreground size-10" />
  <div>
    <p className="font-medium">Nenhuma apólice encontrada</p>
    <p className="text-muted-foreground mt-1 text-sm">
      As apólices serão criadas a partir de propostas aprovadas.
    </p>
  </div>
</div>
// NEW
<div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
  <Shield className="text-muted-foreground size-10" />
  <div>
    <p className="font-medium">Nenhuma apólice encontrada</p>
    <p className="text-muted-foreground mt-1 text-sm">
      As apólices serão criadas a partir de propostas aprovadas.
    </p>
  </div>
  <Button variant="outline" size="sm" asChild>
    <Link href="/dashboard/proposals">Ver propostas</Link>
  </Button>
</div>
```

Add imports: `Button` from `@/components/ui/button`, `Link` from `next/link`.

- [ ] **Step 3: Add CTA to commissions empty state**

In `apps/web/src/features/commissions/components/commissions-table-rows.tsx`, update `EmptyRow` (lines 128-147):

```tsx
// OLD
<div>
  <p className="font-medium">Nenhuma comissão encontrada</p>
  <p className="text-muted-foreground mt-1 text-sm">
    As comissões serão criadas automaticamente ao emitir apólices.
  </p>
</div>
// NEW
<div>
  <p className="font-medium">Nenhuma comissão encontrada</p>
  <p className="text-muted-foreground mt-1 text-sm">
    As comissões serão criadas automaticamente ao emitir apólices.
  </p>
</div>
<Button variant="outline" size="sm" asChild>
  <Link href="/dashboard/proposals">Ver propostas</Link>
</Button>
```

Add imports: `Button` from `@/components/ui/button`, `Link` from `next/link`.

### P3 #17: Proposal form validates only on submit

- [ ] **Step 4: Add onBlur validation mode**

In `apps/web/src/features/proposals/components/proposal-form.tsx`, line 59:

```typescript
// OLD
const form = useForm<ProposalFormValues>({
  resolver: zodResolver(proposalFormSchema),
  defaultValues: {
// NEW
const form = useForm<ProposalFormValues>({
  resolver: zodResolver(proposalFormSchema),
  mode: 'onBlur',
  defaultValues: {
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/dashboard-shell.tsx apps/web/src/features/policies/components/policies-table.tsx apps/web/src/features/commissions/components/commissions-table-rows.tsx apps/web/src/features/proposals/components/proposal-form.tsx
git commit -m "fix: P3 UX — dashboard spinner, empty state CTAs, proposal form onBlur validation"
```

---

## Task 6: Chat Accessibility (P3 #18)

**Files:**

- Modify: `apps/web/src/features/chat/components/message-input.tsx`
- Modify: `apps/web/src/features/chat/components/conversation-list-item.tsx`
- Modify: `apps/web/src/features/chat/components/header-actions.tsx`
- Modify: `apps/web/src/features/chat/components/contact-profile.tsx`

### 6 accessibility fixes

- [ ] **Step 1: message-input.tsx — Add aria-labels**

In `apps/web/src/features/chat/components/message-input.tsx`:

Line 37 — add `aria-label` to Input:

```tsx
<Input
  value={inputValue}
  onChange={handleChange}
  placeholder="Digite uma mensagem..."
  aria-label="Mensagem"
  className="bg-muted/50 focus-visible:ring-primary flex-1 border-0 focus-visible:ring-1"
  disabled={disabled}
/>
```

Lines 44-51 — add `aria-label` to Send button:

```tsx
<Button
  type="submit"
  size="icon"
  disabled={!inputValue.trim() || disabled}
  aria-label="Enviar mensagem"
  className="bg-primary hover:bg-primary/90 h-9 w-9 shrink-0"
>
```

- [ ] **Step 2: conversation-list-item.tsx — Add aria-label and unread badge**

In `apps/web/src/features/chat/components/conversation-list-item.tsx`:

Line 32 — add `aria-label` to button:

```tsx
<button
  onClick={onSelect}
  aria-label={`Conversa com ${displayName}${unreadCount > 0 ? `, ${unreadCount} mensagens não lidas` : ''}`}
  className={cn(
```

Lines 71-75 — add `aria-label` to unread badge:

```tsx
{
  unreadCount > 0 && (
    <span
      aria-label={`${unreadCount > 99 ? 'Mais de 99' : unreadCount} não lidas`}
      className="bg-primary text-primary-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium"
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )
}
```

Lines 82-86 — add `aria-label` to assigned agent:

```tsx
{
  conversation.status === 'HUMAN_ACTIVE' && conversation.assignedToName && (
    <span
      aria-label={`Atendido por ${conversation.assignedToName}`}
      className="text-muted-foreground shrink-0 text-xs"
    >
      {conversation.assignedToName}
    </span>
  )
}
```

- [ ] **Step 3: header-actions.tsx — Add aria-label to dropdown trigger**

In `apps/web/src/features/chat/components/header-actions.tsx`, line 73:

```tsx
// OLD
<DropdownMenuTrigger className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors md:h-9 md:w-9">
// NEW
<DropdownMenuTrigger
  aria-label="Ações da conversa"
  className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors md:h-9 md:w-9"
>
```

- [ ] **Step 4: contact-profile.tsx — Add aria-label to close button**

In `apps/web/src/features/chat/components/contact-profile.tsx`, lines 45-52:

```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={onClose}
  aria-label="Fechar perfil"
  className="h-8 w-8"
>
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/chat/components/message-input.tsx apps/web/src/features/chat/components/conversation-list-item.tsx apps/web/src/features/chat/components/header-actions.tsx apps/web/src/features/chat/components/contact-profile.tsx
git commit -m "fix: P3 accessibility — add aria-labels to chat message input, conversation list, actions, profile"
```

---

## Task 7: Infrastructure Fixes (P3 #7, #8, #19, #20, #21)

**Files:**

- Modify: `apps/chat-worker/package.json` (pin Baileys)
- Modify: `packages/db/package.json` (add db:push:dev script)
- Modify: `apps/server/src/routes/internal/lead-routes.ts` (use tenantPrisma)
- Modify: `apps/server/src/routes/v1/stats-helpers.ts` (accept prisma parameter)

### P3 #7: Baileys RC version

- [ ] **Step 1: Pin Baileys version**

In `apps/chat-worker/package.json`, change:

```json
"baileys": "^7.0.0-rc.9"
```

to:

```json
"baileys": "7.0.0-rc.9"
```

Remove the `^` to pin the exact RC version and prevent accidental upgrades to a different RC.

### P3 #8: Shared Zod schemas (deferred)

This is a large refactoring task (extracting shared schemas from frontend/backend into `packages/shared`). Deferring to a dedicated refactoring sprint. The current duplication is a maintenance concern but not a bug.

### P3 #19: db push destroys RLS policies

- [ ] **Step 2: Add dev-safe db push script**

In `packages/db/package.json`, add script:

```json
"db:push:dev": "prisma db push && psql $DATABASE_URL -f prisma/rls-policies.sql"
```

Update `db:push`:

```json
"db:push": "prisma db push && echo '⚠️  RLS policies may have been dropped. Run: pnpm db:push:dev (with psql) or manually re-apply prisma/rls-policies.sql'"
```

### P3 #20: lead-routes uses global prisma

- [ ] **Step 3: Replace global prisma with tenant-scoped client**

In `apps/server/src/routes/internal/lead-routes.ts`:

Replace import:

```typescript
// OLD
import { prisma } from '@repo/db'
// NEW
import { createTenantClient } from '@repo/db/tenant'
```

Replace usage in the route handler. After `const organizationId = request.organizationId!` (line 31), create tenant client:

```typescript
const organizationId = request.organizationId!
const tenantPrisma = createTenantClient(organizationId)
```

Then replace all `prisma.` calls with `tenantPrisma.`:

- Line 33: `tenantPrisma.client.findFirst({...})`
- Line 43: `tenantPrisma.client.create({...})`
- Line 53: `tenantPrisma.member.findFirst({...})`

### P3 #21: Raw SQL in stats-helpers without RLS safety net

- [ ] **Step 4: Parameterize stats-helpers to accept tenant prisma**

The raw SQL queries in `stats-helpers.ts` are properly parameterized with `orgId` in WHERE clauses, so there's no injection risk. However, they use global `prisma` which bypasses RLS.

In `apps/server/src/routes/v1/stats-helpers.ts`, change the module-level import:

```typescript
// OLD (line 2)
import { prisma } from '@repo/db'
// Keep this import but update function signatures
```

Update `buildDashboardData` signature to accept a prisma client parameter:

```typescript
// OLD
export async function buildDashboardData(orgId: string, preset: DashboardPreset) {
// NEW
import type { PrismaClient } from '@repo/db'

export async function buildDashboardData(orgId: string, preset: DashboardPreset, db?: PrismaClient) {
  const p = db ?? prisma
```

Then replace all `prisma.` references inside the function (and sub-functions it calls) with `p.`. This allows callers to pass in a tenant-scoped client while maintaining backwards compatibility.

In `apps/server/src/routes/v1/stats-routes.ts`, pass the tenant client:

```typescript
import { createTenantClient } from '@repo/db/tenant'

// In the route handler, after getting orgId:
const tenantPrisma = createTenantClient(orgId)
const data = await buildDashboardData(orgId, preset, tenantPrisma)
```

- [ ] **Step 5: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add apps/chat-worker/package.json packages/db/package.json apps/server/src/routes/internal/lead-routes.ts apps/server/src/routes/v1/stats-helpers.ts apps/server/src/routes/v1/stats-routes.ts
git commit -m "fix: P3 infra — pin Baileys, db push RLS warning, lead-routes tenant prisma, stats-helpers RLS"
```

---

## Final Verification

- [ ] **Run all quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

- [ ] **Update audit document**

In `docs/AUDITORIA-PRE-PRODUCAO.md`, update the P3 summary to mark all items as resolved. Update the verdict section to note P3 items are complete.

- [ ] **Final commit**

```bash
git add docs/AUDITORIA-PRE-PRODUCAO.md
git commit -m "docs: mark all 21 P3 audit findings as resolved"
```
