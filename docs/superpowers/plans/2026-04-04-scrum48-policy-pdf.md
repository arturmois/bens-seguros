# SCRUM-48: Policy PDF Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the policy PDF template to include all client data (with unmasked CPF/CNPJ), insured object details by branch, board type, and show "Não informado" for empty fields.

**Architecture:** Extend PolicyData to include proposal details and boardType via repository include. Fetch full client data (with decrypted document) in the PDF generation route. Rewrite policy-summary-pdf.tsx to render all sections, reusing the existing InsuredObjectSection component.

**Tech Stack:** @react-pdf/renderer 4, Prisma 7, Fastify 5

**Spec:** `docs/superpowers/specs/2026-04-04-scrum48-policy-pdf-design.md`

---

## File Map

| Action | File                                                                          | Responsibility                                          |
| ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| Modify | `packages/core/src/modules/policy/domain/policy-repository.ts`                | Add proposalDetails + boardType to PolicyData           |
| Modify | `packages/core/src/modules/policy/infrastructure/prisma-policy-repository.ts` | Extend POLICY_INCLUDE with proposal.details + boardType |
| Modify | `packages/core/src/modules/policy/infrastructure/policy-mapper.ts`            | Map new fields                                          |
| Modify | `apps/server/src/routes/v1/policies/generate-policy-pdf.ts`                   | Fetch full client data, pass to template                |
| Modify | `apps/server/src/pdf-templates/policy-summary-pdf.tsx`                        | Rewrite with all sections                               |

---

### Task 1: Extend PolicyData with Proposal Details

**Files:**

- Modify: `packages/core/src/modules/policy/domain/policy-repository.ts`
- Modify: `packages/core/src/modules/policy/infrastructure/prisma-policy-repository.ts`
- Modify: `packages/core/src/modules/policy/infrastructure/policy-mapper.ts`

- [ ] **Step 1: Add fields to PolicyData interface**

In `packages/core/src/modules/policy/domain/policy-repository.ts`, add to `PolicyData` after `proposalIdentifier`:

```typescript
  proposalDetails?: Record<string, unknown> | null
  boardType?: string
```

- [ ] **Step 2: Extend POLICY_INCLUDE**

In `packages/core/src/modules/policy/infrastructure/prisma-policy-repository.ts`, update `POLICY_INCLUDE`:

```typescript
const POLICY_INCLUDE = {
  client: { select: { name: true, document: true } },
  salesperson: { select: { name: true } },
  insurer: { select: { name: true } },
  proposal: { select: { id: true, details: true, boardType: true } },
} satisfies Prisma.PolicyInclude
```

- [ ] **Step 3: Update mapper**

In `packages/core/src/modules/policy/infrastructure/policy-mapper.ts`, read the file first then add the new fields to `toDomain()`. Map:

```typescript
proposalDetails: row.proposal?.details ? (row.proposal.details as Record<string, unknown>) : null,
boardType: row.proposal?.boardType,
```

Also update the `PolicyRelations` or inline type to include `proposal?: { id: string; details: unknown; boardType: string } | null`.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @repo/core exec vitest run src/modules/policy/
```

If any test uses mock PolicyData, add the new optional fields.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/modules/policy/
git commit -m "feat(core): extend PolicyData with proposalDetails and boardType (SCRUM-48)"
```

---

### Task 2: Update PDF Generation Route

**Files:**

- Modify: `apps/server/src/routes/v1/policies/generate-policy-pdf.ts`

- [ ] **Step 1: Fetch full client data in the route**

Read the current file first. After fetching the policy and organization, add a client query to get full data including decrypted document:

```typescript
// Fetch full client data for PDF (unmasked document, address, phone, email)
const client = await prisma.client.findFirst({
  where: { id: policy.clientId, organizationId },
  select: {
    name: true,
    email: true,
    phone: true,
    address: true,
    documentEncrypted: true,
  },
})
```

Then decrypt the document using the existing utility. Search for how `documentEncrypted` is decrypted elsewhere in the codebase — look for `decrypt` or `decryptDocument` functions in `@repo/shared` or `packages/core`.

If no decrypt utility exists, use the raw document from the client and skip decryption (the template already has `policy.clientDocument` which is the stored value).

- [ ] **Step 2: Build extended data for template**

Create a `clientFullData` object to pass to the template:

```typescript
const clientFullData = client
  ? {
      name: client.name,
      document: decryptedDocument, // or policy.clientDocument if no decrypt available
      email: client.email,
      phone: client.phone,
      address: client.address,
    }
  : null
```

- [ ] **Step 3: Update template call**

Pass the new data to `PolicySummaryPdf`:

```typescript
PolicySummaryPdf({
  policy,
  organization: organizationData,
  clientFull: clientFullData,
})
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/v1/policies/generate-policy-pdf.ts
git commit -m "feat(server): fetch full client data for policy PDF generation (SCRUM-48)"
```

---

### Task 3: Rewrite Policy PDF Template

**Files:**

- Modify: `apps/server/src/pdf-templates/policy-summary-pdf.tsx`

- [ ] **Step 1: Read the current template and the insured-object-section component**

Read:

- `apps/server/src/pdf-templates/policy-summary-pdf.tsx` (current template)
- `apps/server/src/pdf-templates/insured-object-section.tsx` (reusable component)
- `apps/server/src/pdf-templates/proposal-quote-pdf.tsx` (reference for patterns)

- [ ] **Step 2: Update the PolicySummaryPdfProps interface**

```typescript
interface ClientFullData {
  readonly name: string
  readonly document: string
  readonly email: string | null
  readonly phone: string | null
  readonly address: Record<string, string> | null
}

interface PolicySummaryPdfProps {
  readonly policy: PolicyData
  readonly organization: OrganizationData
  readonly clientFull: ClientFullData | null
}
```

- [ ] **Step 3: Add BOARD_TYPE_LABELS constant**

```typescript
const BOARD_TYPE_LABELS: Record<string, string> = {
  NEW_INSURANCE: 'Novo Seguro',
  RENEWAL: 'Renovação',
  ENDORSEMENT: 'Endosso',
}
```

- [ ] **Step 4: Add helper for empty fields**

```typescript
function displayOrFallback(
  value: string | null | undefined,
  fallback = 'Não informado'
): string {
  return value && value.trim() !== '' ? value : fallback
}
```

- [ ] **Step 5: Rewrite ClientSection with full data**

```tsx
function ClientSection({
  policy,
  clientFull,
}: {
  readonly policy: PolicyData
  readonly clientFull: ClientFullData | null
}) {
  const name = clientFull?.name ?? policy.clientName ?? 'Não informado'
  const document =
    clientFull?.document ?? policy.clientDocument ?? 'Não informado'
  const email = displayOrFallback(clientFull?.email)
  const phone = displayOrFallback(clientFull?.phone)
  const address = clientFull?.address
    ? Object.values(clientFull.address).filter(Boolean).join(', ')
    : 'Não informado'

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Dados do Cliente</Text>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>Nome</Text>
          <Text style={styles.value}>{name}</Text>
        </View>
        <View style={styles.col2}>
          <Text style={styles.label}>CPF / CNPJ</Text>
          <Text style={styles.value}>{document}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>E-mail</Text>
          <Text style={styles.value}>{email}</Text>
        </View>
        <View style={styles.col2}>
          <Text style={styles.label}>Telefone</Text>
          <Text style={styles.value}>{phone}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>Endereço</Text>
          <Text style={styles.value}>{address}</Text>
        </View>
      </View>
    </View>
  )
}
```

- [ ] **Step 6: Update PolicyInfoSection to include board type**

Add after the existing insurer row:

```tsx
<View style={styles.row}>
  <View style={styles.col2}>
    <Text style={styles.label}>Seguradora</Text>
    <Text style={styles.value}>{displayOrFallback(policy.insurerName)}</Text>
  </View>
  <View style={styles.col2}>
    <Text style={styles.label}>Tipo</Text>
    <Text style={styles.value}>
      {BOARD_TYPE_LABELS[policy.boardType ?? ''] ?? 'Não informado'}
    </Text>
  </View>
</View>
```

- [ ] **Step 7: Add InsuredObjectSection**

Import `InsuredObjectSection` and `isInsuredObjectDetails` from the existing component:

```typescript
import { InsuredObjectSection } from './insured-object-section.js'
import { isInsuredObjectDetails } from '@repo/core'
```

Add after `PremiumSection` in the main template:

```tsx
{
  policy.proposalDetails && isInsuredObjectDetails(policy.proposalDetails) ? (
    <InsuredObjectSection details={policy.proposalDetails} />
  ) : (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Objeto Segurado</Text>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.value}>Não informado</Text>
        </View>
      </View>
    </View>
  )
}
```

- [ ] **Step 8: Update the main component to accept and pass clientFull**

Update `PolicySummaryPdf` to pass `clientFull` to `ClientSection`:

```tsx
<ClientSection policy={policy} clientFull={clientFull} />
```

Update the document title from "RESUMO DA APÓLICE" to "APÓLICE DE SEGURO".

- [ ] **Step 9: Commit**

```bash
git add apps/server/src/pdf-templates/policy-summary-pdf.tsx
git commit -m "feat(server): rewrite policy PDF template with full client and insured object data (SCRUM-48)"
```

---

### Task 4: Quality Gates

- [ ] **Step 1: Run lint**

```bash
pnpm lint
```

Expected: Zero errors.

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: Zero errors.

- [ ] **Step 3: Run tests**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address quality gate issues (SCRUM-48)"
```
