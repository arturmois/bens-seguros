# Fase 4: Financial (Commissions) - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar Commission (DDD Full com state machine de aprovacao), calculo em basis points, split entre vendedores, estorno/reversal, export CSV.

**Architecture:** Commission segue DDD Full com entity class, state machine (PENDING_COMMERCIAL -> PENDING_ADMIN -> APPROVED -> PAID | REJECTED | REVERSED), testes obrigatorios para todas transicoes. Auto-criacao via domain event ProposalIssued.

**Tech Stack:** Prisma 7, tsyringe, Zod, Fastify 5, React Email (templates para email de aprovacao).

**Spec:** `/home/artur/projects/ESPECIFICACAO-FINAL.md` (Secao 8.5)

**Depends on:** Fase 2 completa (Proposals + Policies)

---

## File Structure

```
packages/
├── db/prisma/schema.prisma              # Add Commission model
├── core/src/modules/
│   └── commission/
│       ├── domain/
│       │   ├── commission.ts            # Entity with state machine
│       │   ├── commission.spec.ts       # ALL transitions tested
│       │   ├── commission-repository.ts
│       │   ├── commission-errors.ts
│       │   └── commission-calculator.ts # Basis points math
│       ├── application/
│       │   ├── create-commission.ts
│       │   ├── approve-commission.ts
│       │   ├── approve-commission.spec.ts
│       │   ├── reject-commission.ts
│       │   ├── reject-commission.spec.ts
│       │   ├── pay-commission.ts
│       │   ├── reverse-commission.ts
│       │   ├── reverse-commission.spec.ts
│       │   ├── list-commissions.ts
│       │   ├── get-commission.ts
│       │   └── export-commissions-csv.ts
│       └── infrastructure/
│           ├── prisma-commission-repository.ts
│           └── commission-mapper.ts
apps/
├── server/src/
│   ├── routes/v1/commission-routes.ts
│   ├── handlers/commission.handlers.ts
│   └── schemas/commission.schemas.ts
├── web/src/
│   ├── features/commissions/
│   │   ├── components/
│   │   │   ├── commissions-table.tsx
│   │   │   ├── commission-detail.tsx
│   │   │   ├── commission-status-badge.tsx
│   │   │   └── commission-export-button.tsx
│   │   ├── hooks/
│   │   │   └── use-commissions.ts
│   │   ├── lib/
│   │   │   ├── schemas.ts
│   │   │   └── commission-calculator.ts
│   │   └── types/
│   ├── app/(dashboard)/commissions/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
```

---

## Task 1: Prisma Schema - Commission Model

**Files:**

- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add Commission enum and model**

```prisma
enum CommissionStatus {
  PENDING_COMMERCIAL
  PENDING_ADMIN
  APPROVED
  PAID
  REJECTED
  REVERSED
}

model Commission {
  id                      String           @id @default(cuid())
  organizationId          String
  policyId                String
  salespersonId           String
  status                  CommissionStatus @default(PENDING_COMMERCIAL)
  commissionValueInCents  Int
  premiumValueInCents     Int
  percentageInBasisPoints Int              // 5000 = 50%
  splitPercentage         Int?             @default(10000) // 10000 = 100%
  approvedBy              String?
  approvedAt              DateTime?
  paidAt                  DateTime?
  rejectedBy              String?
  rejectedAt              DateTime?
  rejectionReason         String?
  isReversal              Boolean          @default(false)
  originalCommissionId    String?
  deletedAt               DateTime?
  createdAt               DateTime         @default(now())
  updatedAt               DateTime         @updatedAt

  policy                  Policy           @relation(fields: [policyId], references: [id])
  salesperson             User             @relation("CommissionSalesperson", fields: [salespersonId], references: [id])
  originalCommission      Commission?      @relation("CommissionReversal", fields: [originalCommissionId], references: [id])
  reversals               Commission[]     @relation("CommissionReversal")

  @@index([organizationId, status])
  @@index([organizationId, salespersonId])
  @@index([organizationId, policyId])
  @@index([organizationId, createdAt(sort: Desc)])
}
```

- [ ] **Step 2: Add relation to Policy**

```prisma
// Add to Policy model:
commissions     Commission[]
```

- [ ] **Step 3: Generate and push**

```bash
cd packages/db && pnpm db:generate && pnpm db:push
```

- [ ] **Step 4: Commit**

```bash
git add packages/db/
git commit -m "feat: add commission model with approval workflow to prisma schema"
```

---

## Task 2: Commission Domain Entity (DDD Full)

**Files:**

- Create: `packages/core/src/modules/commission/domain/commission.ts`
- Create: `packages/core/src/modules/commission/domain/commission.spec.ts`
- Create: `packages/core/src/modules/commission/domain/commission-errors.ts`
- Create: `packages/core/src/modules/commission/domain/commission-calculator.ts`

- [ ] **Step 1: Write failing tests for Commission entity**

```ts
import { describe, it, expect } from 'vitest';
import { Commission } from './commission.js';

describe('Commission Entity', () => {
  const validProps = {
    organizationId: 'org-1',
    policyId: 'pol-1',
    salespersonId: 'user-1',
    premiumValueInCents: 100000, // R$1000
    percentageInBasisPoints: 1500, // 15%
  };

  it('creates with PENDING_COMMERCIAL status and calculated value', () => {
    const commission = Commission.create(validProps);
    expect(commission.status).toBe('PENDING_COMMERCIAL');
    expect(commission.commissionValueInCents).toBe(15000); // 1000 * 15% = 150
  });

  it('advances from PENDING_COMMERCIAL to PENDING_ADMIN', () => {
    const commission = Commission.create(validProps);
    commission.approveByCommercial('user-2');
    expect(commission.status).toBe('PENDING_ADMIN');
  });

  it('advances from PENDING_ADMIN to APPROVED', () => {
    const commission = Commission.create(validProps);
    commission.approveByCommercial('user-2');
    commission.approveByAdmin('admin-1');
    expect(commission.status).toBe('APPROVED');
    expect(commission.approvedBy).toBe('admin-1');
  });

  it('advances from APPROVED to PAID', () => {
    const commission = Commission.create(validProps);
    commission.approveByCommercial('user-2');
    commission.approveByAdmin('admin-1');
    commission.markAsPaid();
    expect(commission.status).toBe('PAID');
  });

  it('rejects from PENDING_COMMERCIAL', () => {
    const commission = Commission.create(validProps);
    commission.reject('admin-1', 'Valores incorretos');
    expect(commission.status).toBe('REJECTED');
    expect(commission.rejectionReason).toBe('Valores incorretos');
  });

  it('rejects from PENDING_ADMIN', () => {
    const commission = Commission.create(validProps);
    commission.approveByCommercial('user-2');
    commission.reject('admin-1', 'Sem orcamento');
    expect(commission.status).toBe('REJECTED');
  });

  it('cannot approve from REJECTED', () => {
    const commission = Commission.create(validProps);
    commission.reject('admin-1', 'reason');
    expect(() => commission.approveByCommercial('user-2')).toThrow();
  });

  it('cannot approve from PAID', () => {
    const commission = Commission.create(validProps);
    commission.approveByCommercial('u');
    commission.approveByAdmin('a');
    commission.markAsPaid();
    expect(() => commission.approveByAdmin('a')).toThrow();
  });

  it('cannot pay from PENDING_COMMERCIAL', () => {
    const commission = Commission.create(validProps);
    expect(() => commission.markAsPaid()).toThrow();
  });

  it('creates reversal commission', () => {
    const original = Commission.create(validProps);
    original.approveByCommercial('u');
    original.approveByAdmin('a');
    original.markAsPaid();

    const reversal = Commission.createReversal(original);
    expect(reversal.isReversal).toBe(true);
    expect(reversal.originalCommissionId).toBe(original.id);
    expect(reversal.commissionValueInCents).toBe(-15000);
    expect(reversal.status).toBe('PENDING_COMMERCIAL');
  });

  it('cannot reverse unpaid commission', () => {
    const commission = Commission.create(validProps);
    expect(() => Commission.createReversal(commission)).toThrow();
  });

  it('calculates with split percentage', () => {
    const commission = Commission.create({
      ...validProps,
      splitPercentage: 5000, // 50%
    });
    expect(commission.commissionValueInCents).toBe(7500); // 150 * 50% = 75
  });
});
```

- [ ] **Step 2: Run test - expect fail**

```bash
cd packages/core && pnpm vitest run src/modules/commission/domain/commission.spec.ts
```

- [ ] **Step 3: Implement Commission entity**

```ts
import { randomUUID } from 'node:crypto';
import { calculateCommission } from './commission-calculator.js';

type Status =
  | 'PENDING_COMMERCIAL'
  | 'PENDING_ADMIN'
  | 'APPROVED'
  | 'PAID'
  | 'REJECTED'
  | 'REVERSED';

interface CommissionProps {
  id: string;
  organizationId: string;
  policyId: string;
  salespersonId: string;
  status: Status;
  commissionValueInCents: number;
  premiumValueInCents: number;
  percentageInBasisPoints: number;
  splitPercentage: number;
  approvedBy: string | null;
  approvedAt: Date | null;
  paidAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  isReversal: boolean;
  originalCommissionId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateCommissionProps {
  organizationId: string;
  policyId: string;
  salespersonId: string;
  premiumValueInCents: number;
  percentageInBasisPoints: number;
  splitPercentage?: number;
}

export class Commission {
  private props: CommissionProps;

  private constructor(props: CommissionProps) {
    this.props = props;
  }

  static create(input: CreateCommissionProps): Commission {
    const split = input.splitPercentage ?? 10000;
    const value = calculateCommission(
      input.premiumValueInCents,
      input.percentageInBasisPoints,
      split,
    );

    return new Commission({
      id: randomUUID(),
      organizationId: input.organizationId,
      policyId: input.policyId,
      salespersonId: input.salespersonId,
      status: 'PENDING_COMMERCIAL',
      commissionValueInCents: value,
      premiumValueInCents: input.premiumValueInCents,
      percentageInBasisPoints: input.percentageInBasisPoints,
      splitPercentage: split,
      approvedBy: null,
      approvedAt: null,
      paidAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      isReversal: false,
      originalCommissionId: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static restore(props: CommissionProps): Commission {
    return new Commission(props);
  }

  static createReversal(original: Commission): Commission {
    if (original.status !== 'PAID') {
      throw new Error('Can only reverse PAID commissions');
    }

    return new Commission({
      id: randomUUID(),
      organizationId: original.organizationId,
      policyId: original.policyId,
      salespersonId: original.salespersonId,
      status: 'PENDING_COMMERCIAL',
      commissionValueInCents: -original.commissionValueInCents,
      premiumValueInCents: original.premiumValueInCents,
      percentageInBasisPoints: original.percentageInBasisPoints,
      splitPercentage: original.splitPercentage,
      approvedBy: null,
      approvedAt: null,
      paidAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      isReversal: true,
      originalCommissionId: original.id,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  approveByCommercial(userId: string): void {
    if (this.props.status !== 'PENDING_COMMERCIAL') {
      throw new Error(`Cannot approve from ${this.props.status}`);
    }
    this.props.status = 'PENDING_ADMIN';
    this.props.updatedAt = new Date();
  }

  approveByAdmin(userId: string): void {
    if (this.props.status !== 'PENDING_ADMIN') {
      throw new Error(`Cannot approve from ${this.props.status}`);
    }
    this.props.status = 'APPROVED';
    this.props.approvedBy = userId;
    this.props.approvedAt = new Date();
    this.props.updatedAt = new Date();
  }

  markAsPaid(): void {
    if (this.props.status !== 'APPROVED') {
      throw new Error(`Cannot pay from ${this.props.status}`);
    }
    this.props.status = 'PAID';
    this.props.paidAt = new Date();
    this.props.updatedAt = new Date();
  }

  reject(userId: string, reason: string): void {
    if (this.props.status !== 'PENDING_COMMERCIAL' && this.props.status !== 'PENDING_ADMIN') {
      throw new Error(`Cannot reject from ${this.props.status}`);
    }
    this.props.status = 'REJECTED';
    this.props.rejectedBy = userId;
    this.props.rejectedAt = new Date();
    this.props.rejectionReason = reason;
    this.props.updatedAt = new Date();
  }

  get id() {
    return this.props.id;
  }
  get organizationId() {
    return this.props.organizationId;
  }
  get policyId() {
    return this.props.policyId;
  }
  get salespersonId() {
    return this.props.salespersonId;
  }
  get status() {
    return this.props.status;
  }
  get commissionValueInCents() {
    return this.props.commissionValueInCents;
  }
  get premiumValueInCents() {
    return this.props.premiumValueInCents;
  }
  get percentageInBasisPoints() {
    return this.props.percentageInBasisPoints;
  }
  get splitPercentage() {
    return this.props.splitPercentage;
  }
  get approvedBy() {
    return this.props.approvedBy;
  }
  get rejectionReason() {
    return this.props.rejectionReason;
  }
  get isReversal() {
    return this.props.isReversal;
  }
  get originalCommissionId() {
    return this.props.originalCommissionId;
  }

  toJSON(): CommissionProps {
    return { ...this.props };
  }
}
```

- [ ] **Step 4: Implement commission-calculator.ts**

```ts
/**
 * Calculate commission value in cents.
 * @param premiumInCents - Premium value in cents (e.g., 100000 = R$1000)
 * @param percentageInBasisPoints - Commission percentage in basis points (e.g., 1500 = 15%)
 * @param splitInBasisPoints - Split percentage in basis points (e.g., 5000 = 50%, default 10000 = 100%)
 * @returns Commission value in cents
 */
export function calculateCommission(
  premiumInCents: number,
  percentageInBasisPoints: number,
  splitInBasisPoints: number = 10000,
): number {
  return Math.round(
    (premiumInCents * percentageInBasisPoints * splitInBasisPoints) / (10000 * 10000),
  );
}
```

- [ ] **Step 5: Run tests - expect pass**

```bash
cd packages/core && pnpm vitest run src/modules/commission/
```

Expected: all 12 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/modules/commission/
git commit -m "feat: add commission entity with approval state machine - all transitions tested"
```

---

## Task 3: Commission Use Cases

- [ ] **Step 1: Create repository interface**
- [ ] **Step 2: Create use cases (create, approve, reject, pay, reverse, list, get)**
- [ ] **Step 3: Write tests for approve-commission and reverse-commission**
- [ ] **Step 4: Create export-commissions-csv use case**

```ts
@injectable()
export class ExportCommissionsCsv {
  constructor(@inject('CommissionRepository') private repo: CommissionRepository) {}

  async execute(organizationId: string, filters: CommissionFilters): Promise<string> {
    const { items } = await this.repo.findMany({ ...filters, organizationId, limit: 10000 });

    const header = 'ID,Apolice,Vendedor,Premio,Percentual,Valor,Status,Data\n';
    const rows = items
      .map((c) =>
        [
          c.id,
          c.policyId,
          c.salespersonId,
          (c.premiumValueInCents / 100).toFixed(2),
          (c.percentageInBasisPoints / 100).toFixed(2) + '%',
          (c.commissionValueInCents / 100).toFixed(2),
          c.status,
          c.createdAt.toISOString(),
        ].join(','),
      )
      .join('\n');

    return header + rows;
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/modules/commission/
git commit -m "feat: add commission use cases (approve, reject, pay, reverse, export CSV)"
```

---

## Task 4: Commission API Routes

- [ ] **Step 1: Create schemas, handlers, routes**

Routes:

- `GET /api/v1/commissions` - list with filters (status, salesperson, date range)
- `GET /api/v1/commissions/:id` - get detail
- `POST /api/v1/commissions/:id/approve-commercial` - approve by commercial
- `POST /api/v1/commissions/:id/approve-admin` - approve by admin (requires ADMIN/MANAGER)
- `POST /api/v1/commissions/:id/reject` - reject with reason
- `POST /api/v1/commissions/:id/pay` - mark as paid
- `POST /api/v1/commissions/:id/reverse` - create reversal
- `GET /api/v1/commissions/export` - CSV download

- [ ] **Step 2: Register routes**
- [ ] **Step 3: Commit**

```bash
git add apps/server/
git commit -m "feat: add commission API routes with approval workflow"
```

---

## Task 5: Commission Frontend

- [ ] **Step 1: Create commission feature structure**
- [ ] **Step 2: Create commission-status-badge with colors per status**
- [ ] **Step 3: Create commissions-table with filters and role-based action buttons**
- [ ] **Step 4: Create commission-detail with approval/reject/pay actions**
- [ ] **Step 5: Create commission-export-button (downloads CSV)**
- [ ] **Step 6: Create pages (list, detail)**
- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/commissions/ apps/web/src/app/\(dashboard\)/commissions/
git commit -m "feat: add commission management pages with approval workflow and CSV export"
```

---

## Task 6: Auto-create Commission on Policy Issuance

**Files:**

- Create: `packages/core/src/modules/commission/application/on-proposal-issued.ts`
- Modify: `packages/core/src/container.ts` - register event subscription

- [ ] **Step 1: Create event handler**

```ts
import { injectable, inject } from 'tsyringe';
import { Commission } from '../domain/commission.js';
import type { CommissionRepository } from '../domain/commission-repository.js';
import type { ProposalIssuedEvent } from '../../proposal/domain/events/proposal-issued.js';

@injectable()
export class OnProposalIssued {
  constructor(@inject('CommissionRepository') private repo: CommissionRepository) {}

  async handle(event: ProposalIssuedEvent): Promise<void> {
    const commission = Commission.create({
      organizationId: event.organizationId,
      policyId: event.proposalId, // will be policy ID after issuance
      salespersonId: event.salespersonId,
      premiumValueInCents: event.premiumValueInCents,
      percentageInBasisPoints: event.commissionPercentageInCents,
    });

    await this.repo.save(commission);
  }
}
```

- [ ] **Step 2: Wire event in IssuePolicy use case**
- [ ] **Step 3: Commit**

```bash
git add packages/core/
git commit -m "feat: auto-create commission on policy issuance via domain event"
```

---

## Task 7: Validate and Quality Gates

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```

Expected: all commission entity + use case tests pass.

- [ ] **Step 2: Run quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm build
```

- [ ] **Step 3: Test approval workflow end-to-end via API**
- [ ] **Step 4: Test CSV export**
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete financial module (commissions with full approval workflow)"
```
