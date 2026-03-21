# Fase 3: Insurance Operations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Claims (sinistros), Endorsements (endossos), Assistances (assistencias), Documents (documentos), Occurrences (ocorrencias) and Insurer (seguradoras) — all DDD Light modules with full backend + frontend.

**Architecture:** All modules follow DDD Light (interface + use cases + Prisma repository, no domain entity class). Claims and Assistances have status workflows validated via transition maps in use cases. Documents integrate with Cloudflare R2 via `StorageProvider` interface (with `LocalStorageProvider` for dev). Insurer is reference data seeded on bootstrap.

**Tech Stack:** Prisma 7, tsyringe DI, Zod, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, Fastify 5, React 19, TanStack React Query, React Hook Form, shadcn/ui @coss/style.

**Spec:** `ESPECIFICACAO-FINAL.md` sections 8.4-8.8, 8.14

**Depends on:** Fase 2 complete (Client, Proposal, Policy modules)

**Decisions confirmed:**

1. Claim has `claimNumber: Int` (sequential per org), formatted as `SIN-YYYY-NNNN` in frontend
2. `insurerId` added to Proposal (optional) and propagated to Policy on issue
3. Assistance location = text + "Open in Google Maps" link (no map widget)
4. Storage: `LocalStorageProvider` (dev, saves to `./uploads/`) + `R2StorageProvider` (prod), selected via `STORAGE_PROVIDER` env var
5. `InsuranceBranch` enum already exists in schema — not part of this phase (it's a Prisma enum, not a reference data table)

**Scope note:** Occurrence is a sub-entity of Claim (like ProposalChecklistItem is to Proposal). It does not have its own `organizationId` — tenant isolation is enforced by always resolving claims first, which are org-scoped. This matches the existing `ProposalChecklistItem` pattern.

---

## File Structure

```
packages/
├── env/src/index.ts                                    # Modify: add STORAGE_PROVIDER env var
├── db/prisma/schema.prisma                             # Modify: add 6 models + 5 enums + relations
├── core/src/
│   ├── index.ts                                        # Modify: export new modules
│   └── modules/
│       ├── insurer/
│       │   ├── domain/
│       │   │   ├── insurer-repository.ts               # Create: InsurerData, InsurerRepository interface
│       │   │   └── insurer-errors.ts                   # Create: InsurerNotFoundError
│       │   ├── application/
│       │   │   ├── create-insurer.ts                   # Create: CreateInsurer use case
│       │   │   ├── list-insurers.ts                    # Create: ListInsurers use case
│       │   │   └── get-insurer.ts                      # Create: GetInsurer use case
│       │   ├── infrastructure/
│       │   │   ├── insurer-mapper.ts                   # Create: InsurerMapper
│       │   │   └── prisma-insurer-repository.ts        # Create: PrismaInsurerRepository
│       │   └── index.ts                                # Create: barrel exports
│       ├── claim/
│       │   ├── domain/
│       │   │   ├── claim-repository.ts                 # Create: ClaimData, ClaimRepository interface
│       │   │   └── claim-errors.ts                     # Create: ClaimNotFoundError, InvalidClaimStatusTransitionError
│       │   ├── application/
│       │   │   ├── create-claim.ts                     # Create: CreateClaim use case
│       │   │   ├── update-claim-status.ts              # Create: UpdateClaimStatus with transition validation
│       │   │   ├── list-claims.ts                      # Create: ListClaims use case
│       │   │   └── get-claim.ts                        # Create: GetClaim use case
│       │   ├── infrastructure/
│       │   │   ├── claim-mapper.ts                     # Create: ClaimMapper
│       │   │   └── prisma-claim-repository.ts          # Create: PrismaClaimRepository
│       │   └── index.ts                                # Create: barrel exports
│       ├── occurrence/
│       │   ├── domain/
│       │   │   ├── occurrence-repository.ts            # Create: OccurrenceData, OccurrenceRepository interface
│       │   │   └── occurrence-errors.ts                # Create: OccurrenceErrors
│       │   ├── application/
│       │   │   ├── create-occurrence.ts                # Create: CreateOccurrence use case
│       │   │   └── list-occurrences.ts                 # Create: ListOccurrences use case
│       │   ├── infrastructure/
│       │   │   ├── occurrence-mapper.ts                # Create: OccurrenceMapper
│       │   │   └── prisma-occurrence-repository.ts     # Create: PrismaOccurrenceRepository
│       │   └── index.ts                                # Create: barrel exports
│       ├── endorsement/
│       │   ├── domain/
│       │   │   ├── endorsement-repository.ts           # Create: EndorsementData, EndorsementRepository interface
│       │   │   └── endorsement-errors.ts               # Create: EndorsementNotFoundError
│       │   ├── application/
│       │   │   ├── create-endorsement.ts               # Create: CreateEndorsement use case
│       │   │   ├── list-endorsements.ts                # Create: ListEndorsements use case
│       │   │   └── get-endorsement.ts                  # Create: GetEndorsement use case
│       │   ├── infrastructure/
│       │   │   ├── endorsement-mapper.ts               # Create: EndorsementMapper
│       │   │   └── prisma-endorsement-repository.ts    # Create: PrismaEndorsementRepository
│       │   └── index.ts                                # Create: barrel exports
│       ├── assistance/
│       │   ├── domain/
│       │   │   ├── assistance-repository.ts            # Create: AssistanceData, AssistanceRepository interface
│       │   │   └── assistance-errors.ts                # Create: AssistanceNotFoundError, InvalidAssistanceStatusTransitionError
│       │   ├── application/
│       │   │   ├── create-assistance.ts                # Create: CreateAssistance use case
│       │   │   ├── update-assistance-status.ts         # Create: UpdateAssistanceStatus with transition validation
│       │   │   ├── list-assistances.ts                 # Create: ListAssistances use case
│       │   │   └── get-assistance.ts                   # Create: GetAssistance use case
│       │   ├── infrastructure/
│       │   │   ├── assistance-mapper.ts                # Create: AssistanceMapper
│       │   │   └── prisma-assistance-repository.ts     # Create: PrismaAssistanceRepository
│       │   └── index.ts                                # Create: barrel exports
│       └── document/
│           ├── domain/
│           │   ├── document-repository.ts              # Create: DocumentData, DocumentRepository interface
│           │   ├── storage-provider.ts                 # Create: StorageProvider interface
│           │   └── document-errors.ts                  # Create: DocumentNotFoundError
│           ├── application/
│           │   ├── upload-document.ts                  # Create: UploadDocument use case
│           │   ├── list-documents.ts                   # Create: ListDocuments use case
│           │   ├── get-document-url.ts                 # Create: GetDocumentUrl use case
│           │   └── delete-document.ts                  # Create: DeleteDocument use case (also deletes from storage)
│           ├── infrastructure/
│           │   ├── document-mapper.ts                  # Create: DocumentMapper
│           │   ├── prisma-document-repository.ts       # Create: PrismaDocumentRepository
│           │   ├── r2-storage-provider.ts              # Create: R2StorageProvider (Cloudflare R2)
│           │   └── local-storage-provider.ts           # Create: LocalStorageProvider (dev fallback)
│           └── index.ts                                # Create: barrel exports
apps/
├── server/src/
│   ├── app.ts                                          # Modify: register new routes
│   ├── container-registrations.ts                      # Modify: register new repos + use cases + storage provider
│   ├── schemas/
│   │   ├── claim.schemas.ts                            # Create
│   │   ├── endorsement.schemas.ts                      # Create
│   │   ├── assistance.schemas.ts                       # Create
│   │   ├── document.schemas.ts                         # Create
│   │   └── insurer.schemas.ts                          # Create
│   └── routes/v1/
│       ├── claim-routes.ts                             # Create (includes /claims/:id/occurrences sub-routes)
│       ├── endorsement-routes.ts                       # Create
│       ├── assistance-routes.ts                        # Create
│       ├── document-routes.ts                          # Create
│       └── insurer-routes.ts                           # Create
├── web/src/
│   ├── lib/
│   │   ├── api-client.ts                               # Modify: add patch method
│   │   └── permissions.ts                              # Modify: add endorsement, assistance, document permissions
│   ├── components/layout/sidebar.tsx                   # Modify: add Assistencias nav item
│   ├── features/
│   │   ├── claims/
│   │   │   ├── types/index.ts                          # Create
│   │   │   ├── lib/
│   │   │   │   ├── constants.ts                        # Create: status labels, priority labels, colors, transition maps
│   │   │   │   └── schemas.ts                          # Create: Zod schemas for forms
│   │   │   ├── hooks/use-claims.ts                     # Create
│   │   │   └── components/
│   │   │       ├── claim-status-badge.tsx               # Create
│   │   │       ├── claim-priority-badge.tsx             # Create
│   │   │       ├── claims-table.tsx                     # Create
│   │   │       ├── claim-form.tsx                       # Create
│   │   │       ├── claim-detail.tsx                     # Create
│   │   │       ├── claim-status-actions.tsx             # Create
│   │   │       ├── occurrence-list.tsx                  # Create
│   │   │       └── occurrence-form.tsx                  # Create
│   │   ├── endorsements/
│   │   │   ├── types/index.ts                          # Create
│   │   │   ├── lib/constants.ts                        # Create
│   │   │   ├── hooks/use-endorsements.ts               # Create
│   │   │   └── components/
│   │   │       ├── endorsement-list.tsx                 # Create (inline in policy detail)
│   │   │       └── endorsement-form.tsx                 # Create (Sheet)
│   │   ├── assistances/
│   │   │   ├── types/index.ts                          # Create
│   │   │   ├── lib/
│   │   │   │   ├── constants.ts                        # Create
│   │   │   │   └── schemas.ts                          # Create
│   │   │   ├── hooks/use-assistances.ts                # Create
│   │   │   └── components/
│   │   │       ├── assistance-status-badge.tsx          # Create
│   │   │       ├── assistances-table.tsx                # Create
│   │   │       ├── assistance-form.tsx                  # Create
│   │   │       └── assistance-detail.tsx                # Create
│   │   └── documents/
│   │       ├── types/index.ts                          # Create
│   │       ├── hooks/use-documents.ts                  # Create
│   │       └── components/
│   │           ├── document-upload.tsx                  # Create (drag-and-drop)
│   │           ├── document-list.tsx                    # Create (reusable, used in claim/proposal/policy detail)
│   │           └── document-type-badge.tsx              # Create
│   └── app/(dashboard)/
│       ├── claims/
│       │   ├── page.tsx                                # Create
│       │   ├── claims-content.tsx                      # Create
│       │   ├── new/
│       │   │   ├── page.tsx                            # Create
│       │   │   └── new-claim-content.tsx               # Create
│       │   └── [id]/
│       │       ├── page.tsx                            # Create
│       │       └── claim-detail-content.tsx            # Create
│       └── assistances/
│           ├── page.tsx                                # Create
│           ├── assistances-content.tsx                  # Create
│           ├── new/
│           │   ├── page.tsx                            # Create
│           │   └── new-assistance-content.tsx          # Create
│           └── [id]/
│               ├── page.tsx                            # Create
│               └── assistance-detail-content.tsx       # Create
```

---

## Task 1: Prisma Schema — New Models and Relations

**Files:**

- Modify: `packages/db/prisma/schema.prisma`
- Modify: `packages/env/src/index.ts`

- [ ] **Step 1: Add STORAGE_PROVIDER env var**

In `packages/env/src/index.ts`, add to the `server` block:

```ts
STORAGE_PROVIDER: z.enum(['local', 'r2']).default('local'),
```

- [ ] **Step 2: Add new enums to schema.prisma**

After the existing `PolicyStatus` enum:

```prisma
enum ClaimStatus {
  REGISTERED
  IN_ANALYSIS
  AWAITING_DOCUMENT
  PENDING_INSPECTION
  APPROVED
  REJECTED
  PAID
  COMPLETED
}

enum ClaimPriority {
  NORMAL
  HIGH
  URGENT
}

enum AssistanceStatus {
  REQUESTED
  AWAITING_DOCUMENT
  PENDING_INSPECTION
  DISPATCHED
  IN_PROGRESS
  COMPLETED
}

enum DocumentEntityType {
  CLIENT
  PROPOSAL
  POLICY
  CLAIM
}

enum DocumentType {
  DRIVER_LICENSE
  VEHICLE_REGISTRATION
  POLICY_PDF
  CLAIM_PHOTO
  CLAIM_REPORT
  PROOF_OF_PAYMENT
  CONTRACT
  OTHER
}
```

- [ ] **Step 3: Add Insurer model**

After the Policy model:

```prisma
model Insurer {
  id              String    @id @default(cuid())
  organizationId  String
  name            String
  code            String?
  active          Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  claims          Claim[]
  proposals       Proposal[]
  policies        Policy[]

  @@unique([organizationId, name])
  @@index([organizationId])
}
```

- [ ] **Step 4: Add insurerId to Proposal and Policy**

Add to Proposal model (after `renewalPolicyId`):

```prisma
  insurerId                   String?
```

Add to Proposal relations:

```prisma
  insurer       Insurer?              @relation(fields: [insurerId], references: [id])
```

Add to Policy model (after `salespersonId`):

```prisma
  insurerId           String?
```

Add to Policy relations:

```prisma
  insurer          Insurer?   @relation(fields: [insurerId], references: [id])
```

Add indexes to both:

```prisma
  // Proposal: add
  @@index([organizationId, insurerId])

  // Policy: add
  @@index([organizationId, insurerId])
```

- [ ] **Step 5: Add Claim model**

```prisma
model Claim {
  id               String        @id @default(cuid())
  organizationId   String
  claimNumber      Int
  policyId         String
  clientId         String
  insurerId        String?
  assignedToId     String?
  status           ClaimStatus   @default(REGISTERED)
  priority         ClaimPriority @default(NORMAL)
  description      String
  incidentDate     DateTime?
  incidentLocation String?
  reportedAt       DateTime      @default(now())
  resolvedAt       DateTime?
  closedAt         DateTime?
  deletedAt        DateTime?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  policy           Policy        @relation(fields: [policyId], references: [id])
  client           Client        @relation(fields: [clientId], references: [id])
  insurer          Insurer?      @relation(fields: [insurerId], references: [id])
  assignedTo       User?         @relation("ClaimAssignee", fields: [assignedToId], references: [id])
  occurrences      Occurrence[]

  @@unique([organizationId, claimNumber])
  @@index([organizationId, status])
  @@index([organizationId, policyId])
  @@index([organizationId, priority])
  @@index([organizationId, createdAt(sort: Desc)])
}
```

- [ ] **Step 6: Add Occurrence model**

```prisma
model Occurrence {
  id          String   @id @default(cuid())
  claimId     String
  type        String
  description String
  metadata    Json?
  createdBy   String?
  createdAt   DateTime @default(now())

  claim       Claim    @relation(fields: [claimId], references: [id], onDelete: Cascade)

  @@index([claimId])
}
```

- [ ] **Step 7: Add Endorsement model**

```prisma
model Endorsement {
  id                      String   @id @default(cuid())
  organizationId          String
  policyId                String
  type                    String
  description             String
  effectiveDate           DateTime
  previousVersionSnapshot Json
  changes                 Json
  createdBy               String?
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  policy                  Policy   @relation(fields: [policyId], references: [id])

  @@index([organizationId, policyId])
  @@index([organizationId, createdAt(sort: Desc)])
}
```

- [ ] **Step 8: Add Assistance model**

```prisma
model Assistance {
  id              String           @id @default(cuid())
  organizationId  String
  policyId        String
  clientId        String
  claimId         String?
  type            String
  status          AssistanceStatus @default(REQUESTED)
  description     String?
  address         String?
  latitude        Float?
  longitude       Float?
  providerName    String?
  providerPhone   String?
  requestedAt     DateTime         @default(now())
  scheduledAt     DateTime?
  completedAt     DateTime?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  policy          Policy           @relation(fields: [policyId], references: [id])
  client          Client           @relation(fields: [clientId], references: [id])
  claim           Claim?           @relation(fields: [claimId], references: [id])

  @@index([organizationId, status])
  @@index([organizationId, createdAt(sort: Desc)])
}
```

- [ ] **Step 9: Add Document model**

```prisma
model Document {
  id              String             @id @default(cuid())
  organizationId  String
  entityType      DocumentEntityType
  entityId        String
  clientId        String?
  type            DocumentType       @default(OTHER)
  fileName        String
  mimeType        String
  sizeBytes       Int
  storageKey      String             @unique
  url             String?
  createdBy       String?
  createdAt       DateTime           @default(now())

  @@index([organizationId, entityType, entityId])
  @@index([organizationId, createdAt(sort: Desc)])
}
```

- [ ] **Step 10: Add relations to existing models**

Add to User model:

```prisma
  claimsAssigned    Claim[]       @relation("ClaimAssignee")
```

Add to Client model:

```prisma
  claims        Claim[]
  assistances   Assistance[]
```

Add to Policy model:

```prisma
  claims          Claim[]
  endorsements    Endorsement[]
  assistances     Assistance[]
```

Add to Claim model (already defined above, but add Assistance relation):

```prisma
  assistances     Assistance[]
```

- [ ] **Step 11: Generate Prisma client and push**

```bash
cd packages/db && pnpm db:generate && pnpm db:push
```

- [ ] **Step 12: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/env/src/index.ts
git commit -m "feat: add claim, endorsement, assistance, document, occurrence, insurer models

Add insurerId to Proposal and Policy. Add STORAGE_PROVIDER env var.
Claim has claimNumber (sequential per org) for user-facing identification."
```

---

## Task 2: Insurer Module (Reference Data)

**Files:**

- Create: `packages/core/src/modules/insurer/domain/insurer-repository.ts`
- Create: `packages/core/src/modules/insurer/domain/insurer-errors.ts`
- Create: `packages/core/src/modules/insurer/application/create-insurer.ts`
- Create: `packages/core/src/modules/insurer/application/list-insurers.ts`
- Create: `packages/core/src/modules/insurer/application/get-insurer.ts`
- Create: `packages/core/src/modules/insurer/infrastructure/insurer-mapper.ts`
- Create: `packages/core/src/modules/insurer/infrastructure/prisma-insurer-repository.ts`
- Create: `packages/core/src/modules/insurer/index.ts`

- [ ] **Step 1: Create insurer-repository.ts**

```ts
// packages/core/src/modules/insurer/domain/insurer-repository.ts
import type { CursorPage, Page } from '../../client/domain/client-repository.js';

export interface InsurerData {
  id: string;
  organizationId: string;
  name: string;
  code: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsurerFilters {
  organizationId: string;
  active?: boolean;
  search?: string;
}

export interface CreateInsurerInput {
  organizationId: string;
  name: string;
  code?: string | null;
  active?: boolean;
}

export interface InsurerRepository {
  create(data: CreateInsurerInput): Promise<InsurerData>;
  findById(id: string, organizationId: string): Promise<InsurerData | null>;
  findByName(name: string, organizationId: string): Promise<InsurerData | null>;
  findMany(filters: InsurerFilters, page: CursorPage): Promise<Page<InsurerData>>;
}
```

- [ ] **Step 2: Create insurer-errors.ts**

```ts
// packages/core/src/modules/insurer/domain/insurer-errors.ts
export class InsurerNotFoundError extends Error {
  readonly code = 'INSURER_NOT_FOUND' as const;
  constructor(id: string) {
    super(`Seguradora ${id} não encontrada`);
    this.name = 'InsurerNotFoundError';
  }
}

export class InsurerAlreadyExistsError extends Error {
  readonly code = 'INSURER_ALREADY_EXISTS' as const;
  constructor(name: string) {
    super(`Seguradora "${name}" já cadastrada nesta organização`);
    this.name = 'InsurerAlreadyExistsError';
  }
}

export const InsurerErrors = {
  notFound: (id: string) => new InsurerNotFoundError(id),
  alreadyExists: (name: string) => new InsurerAlreadyExistsError(name),
};
```

- [ ] **Step 3: Create use cases (create-insurer.ts, list-insurers.ts, get-insurer.ts)**

```ts
// packages/core/src/modules/insurer/application/create-insurer.ts
import { injectable, inject } from 'tsyringe';
import type {
  InsurerRepository,
  InsurerData,
  CreateInsurerInput,
} from '../domain/insurer-repository.js';
import { InsurerErrors } from '../domain/insurer-errors.js';

@injectable()
export class CreateInsurer {
  constructor(@inject('InsurerRepository') private readonly insurerRepo: InsurerRepository) {}

  async execute(dto: CreateInsurerInput): Promise<InsurerData> {
    const existing = await this.insurerRepo.findByName(dto.name, dto.organizationId);
    if (existing) {
      throw InsurerErrors.alreadyExists(dto.name);
    }
    return this.insurerRepo.create(dto);
  }
}
```

```ts
// packages/core/src/modules/insurer/application/list-insurers.ts
import { injectable, inject } from 'tsyringe';
import type { CursorPage, Page } from '../../client/domain/client-repository.js';
import type {
  InsurerRepository,
  InsurerData,
  InsurerFilters,
} from '../domain/insurer-repository.js';

@injectable()
export class ListInsurers {
  constructor(@inject('InsurerRepository') private readonly insurerRepo: InsurerRepository) {}

  async execute(filters: InsurerFilters, page: CursorPage): Promise<Page<InsurerData>> {
    return this.insurerRepo.findMany(filters, page);
  }
}
```

```ts
// packages/core/src/modules/insurer/application/get-insurer.ts
import { injectable, inject } from 'tsyringe';
import type { InsurerRepository, InsurerData } from '../domain/insurer-repository.js';
import { InsurerErrors } from '../domain/insurer-errors.js';

@injectable()
export class GetInsurer {
  constructor(@inject('InsurerRepository') private readonly insurerRepo: InsurerRepository) {}

  async execute(id: string, organizationId: string): Promise<InsurerData> {
    const insurer = await this.insurerRepo.findById(id, organizationId);
    if (!insurer) {
      throw InsurerErrors.notFound(id);
    }
    return insurer;
  }
}
```

- [ ] **Step 4: Create insurer-mapper.ts**

```ts
// packages/core/src/modules/insurer/infrastructure/insurer-mapper.ts
import type { Insurer as PrismaInsurerRecord } from '@repo/db';
import type { InsurerData } from '../domain/insurer-repository.js';

export class InsurerMapper {
  static toDomain(row: PrismaInsurerRecord): InsurerData {
    return {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      code: row.code,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
```

- [ ] **Step 5: Create prisma-insurer-repository.ts**

```ts
// packages/core/src/modules/insurer/infrastructure/prisma-insurer-repository.ts
import { injectable, inject } from 'tsyringe';
import type { PrismaClient } from '@repo/db';
import { Prisma } from '@repo/db';
import type {
  InsurerRepository,
  InsurerData,
  InsurerFilters,
  CreateInsurerInput,
} from '../domain/insurer-repository.js';
import type { CursorPage, Page } from '../../client/domain/client-repository.js';
import { InsurerMapper } from './insurer-mapper.js';

@injectable()
export class PrismaInsurerRepository implements InsurerRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async create(data: CreateInsurerInput): Promise<InsurerData> {
    const row = await this.prisma.insurer.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        code: data.code ?? null,
        active: data.active ?? true,
      },
    });
    return InsurerMapper.toDomain(row);
  }

  async findById(id: string, organizationId: string): Promise<InsurerData | null> {
    const row = await this.prisma.insurer.findFirst({
      where: { id, organizationId },
    });
    return row ? InsurerMapper.toDomain(row) : null;
  }

  async findByName(name: string, organizationId: string): Promise<InsurerData | null> {
    const row = await this.prisma.insurer.findFirst({
      where: { organizationId, name },
    });
    return row ? InsurerMapper.toDomain(row) : null;
  }

  async findMany(filters: InsurerFilters, page: CursorPage): Promise<Page<InsurerData>> {
    const where: Prisma.InsurerWhereInput = {
      organizationId: filters.organizationId,
      ...(filters.active !== undefined && { active: filters.active }),
      ...(filters.search && {
        name: { contains: filters.search, mode: 'insensitive' },
      }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.insurer.findMany({
        where,
        take: page.limit + 1,
        ...(page.cursor && { cursor: { id: page.cursor }, skip: 1 }),
        orderBy: [{ name: 'asc' }],
      }),
      this.prisma.insurer.count({ where }),
    ]);

    const hasNext = rows.length > page.limit;
    const items = hasNext ? rows.slice(0, -1) : rows;

    return {
      items: items.map(InsurerMapper.toDomain),
      total,
      nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null,
    };
  }
}
```

- [ ] **Step 6: Create insurer index.ts**

```ts
// packages/core/src/modules/insurer/index.ts
// Domain
export type {
  InsurerData,
  InsurerFilters,
  InsurerRepository,
  CreateInsurerInput,
} from './domain/insurer-repository.js';
export {
  InsurerNotFoundError,
  InsurerAlreadyExistsError,
  InsurerErrors,
} from './domain/insurer-errors.js';

// Application
export { CreateInsurer } from './application/create-insurer.js';
export { ListInsurers } from './application/list-insurers.js';
export { GetInsurer } from './application/get-insurer.js';

// Infrastructure
export { InsurerMapper } from './infrastructure/insurer-mapper.js';
export { PrismaInsurerRepository } from './infrastructure/prisma-insurer-repository.js';
```

- [ ] **Step 7: Add insurer export to packages/core/src/index.ts**

```ts
export * from './modules/insurer/index.js';
```

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/modules/insurer/ packages/core/src/index.ts
git commit -m "feat: add insurer module (reference data for insurance companies)"
```

---

## Task 3: Claim Module (Backend)

**Files:**

- Create: `packages/core/src/modules/claim/domain/claim-repository.ts`
- Create: `packages/core/src/modules/claim/domain/claim-errors.ts`
- Create: `packages/core/src/modules/claim/application/create-claim.ts`
- Create: `packages/core/src/modules/claim/application/update-claim-status.ts`
- Create: `packages/core/src/modules/claim/application/list-claims.ts`
- Create: `packages/core/src/modules/claim/application/get-claim.ts`
- Create: `packages/core/src/modules/claim/infrastructure/claim-mapper.ts`
- Create: `packages/core/src/modules/claim/infrastructure/prisma-claim-repository.ts`
- Create: `packages/core/src/modules/claim/index.ts`

- [ ] **Step 1: Create claim-repository.ts**

```ts
// packages/core/src/modules/claim/domain/claim-repository.ts
import type { CursorPage, Page } from '../../client/domain/client-repository.js';

export type ClaimStatus =
  | 'REGISTERED'
  | 'IN_ANALYSIS'
  | 'AWAITING_DOCUMENT'
  | 'PENDING_INSPECTION'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'COMPLETED';

export type ClaimPriority = 'NORMAL' | 'HIGH' | 'URGENT';

export interface ClaimData {
  id: string;
  organizationId: string;
  claimNumber: number;
  policyId: string;
  clientId: string;
  insurerId: string | null;
  assignedToId: string | null;
  status: ClaimStatus;
  priority: ClaimPriority;
  description: string;
  incidentDate: Date | null;
  incidentLocation: string | null;
  reportedAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Joined fields (populated when using include)
  policyNumber?: string;
  clientName?: string;
  insurerName?: string;
  assignedToName?: string;
}

export interface ClaimFilters {
  organizationId: string;
  status?: ClaimStatus;
  priority?: ClaimPriority;
  policyId?: string;
  clientId?: string;
  search?: string;
}

export interface CreateClaimInput {
  organizationId: string;
  policyId: string;
  clientId: string;
  insurerId?: string | null;
  assignedToId?: string | null;
  priority?: ClaimPriority;
  description: string;
  incidentDate?: Date | null;
  incidentLocation?: string | null;
}

export interface UpdateClaimStatusInput {
  status: ClaimStatus;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
}

export interface ClaimRepository {
  create(data: CreateClaimInput): Promise<ClaimData>;
  findById(id: string, organizationId: string): Promise<ClaimData | null>;
  findMany(filters: ClaimFilters, page: CursorPage): Promise<Page<ClaimData>>;
  updateStatus(
    id: string,
    organizationId: string,
    data: UpdateClaimStatusInput,
  ): Promise<ClaimData>;
  softDelete(id: string, organizationId: string): Promise<void>;
}
```

- [ ] **Step 2: Create claim-errors.ts**

```ts
// packages/core/src/modules/claim/domain/claim-errors.ts
export class ClaimNotFoundError extends Error {
  readonly code = 'CLAIM_NOT_FOUND' as const;
  constructor(id: string) {
    super(`Sinistro ${id} não encontrado`);
    this.name = 'ClaimNotFoundError';
  }
}

export class InvalidClaimStatusTransitionError extends Error {
  readonly code = 'INVALID_CLAIM_STATUS_TRANSITION' as const;
  constructor(from: string, to: string) {
    super(`Transição de status inválida: ${from} → ${to}`);
    this.name = 'InvalidClaimStatusTransitionError';
  }
}

export const ClaimErrors = {
  notFound: (id: string) => new ClaimNotFoundError(id),
  invalidTransition: (from: string, to: string) => new InvalidClaimStatusTransitionError(from, to),
};
```

- [ ] **Step 3: Create create-claim.ts**

```ts
// packages/core/src/modules/claim/application/create-claim.ts
import { injectable, inject } from 'tsyringe';
import type { ClaimRepository, ClaimData, CreateClaimInput } from '../domain/claim-repository.js';

@injectable()
export class CreateClaim {
  constructor(@inject('ClaimRepository') private readonly claimRepo: ClaimRepository) {}

  async execute(dto: CreateClaimInput): Promise<ClaimData> {
    return this.claimRepo.create(dto);
  }
}
```

Note: `claimNumber` generation is handled atomically inside the repository's `create` method using `$transaction` to prevent race conditions.

- [ ] **Step 4: Create update-claim-status.ts**

```ts
// packages/core/src/modules/claim/application/update-claim-status.ts
import { injectable, inject } from 'tsyringe';
import type { ClaimRepository, ClaimData, ClaimStatus } from '../domain/claim-repository.js';
import { ClaimErrors } from '../domain/claim-errors.js';

const VALID_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  REGISTERED: ['IN_ANALYSIS'],
  IN_ANALYSIS: ['AWAITING_DOCUMENT', 'PENDING_INSPECTION', 'APPROVED', 'REJECTED'],
  AWAITING_DOCUMENT: ['IN_ANALYSIS'],
  PENDING_INSPECTION: ['APPROVED', 'REJECTED'],
  APPROVED: ['PAID'],
  REJECTED: [],
  PAID: ['COMPLETED'],
  COMPLETED: [],
};

@injectable()
export class UpdateClaimStatus {
  constructor(@inject('ClaimRepository') private readonly claimRepo: ClaimRepository) {}

  async execute(id: string, organizationId: string, newStatus: ClaimStatus): Promise<ClaimData> {
    const claim = await this.claimRepo.findById(id, organizationId);
    if (!claim) {
      throw ClaimErrors.notFound(id);
    }

    const allowed = VALID_TRANSITIONS[claim.status];
    if (!allowed.includes(newStatus)) {
      throw ClaimErrors.invalidTransition(claim.status, newStatus);
    }

    const resolvedAt =
      newStatus === 'APPROVED' || newStatus === 'REJECTED' ? new Date() : claim.resolvedAt;
    const closedAt = newStatus === 'COMPLETED' ? new Date() : claim.closedAt;

    return this.claimRepo.updateStatus(id, organizationId, {
      status: newStatus,
      resolvedAt,
      closedAt,
    });
  }
}
```

- [ ] **Step 5: Create list-claims.ts and get-claim.ts**

```ts
// packages/core/src/modules/claim/application/list-claims.ts
import { injectable, inject } from 'tsyringe';
import type { CursorPage, Page } from '../../client/domain/client-repository.js';
import type { ClaimRepository, ClaimData, ClaimFilters } from '../domain/claim-repository.js';

@injectable()
export class ListClaims {
  constructor(@inject('ClaimRepository') private readonly claimRepo: ClaimRepository) {}

  async execute(filters: ClaimFilters, page: CursorPage): Promise<Page<ClaimData>> {
    return this.claimRepo.findMany(filters, page);
  }
}
```

```ts
// packages/core/src/modules/claim/application/get-claim.ts
import { injectable, inject } from 'tsyringe';
import type { ClaimRepository, ClaimData } from '../domain/claim-repository.js';
import { ClaimErrors } from '../domain/claim-errors.js';

@injectable()
export class GetClaim {
  constructor(@inject('ClaimRepository') private readonly claimRepo: ClaimRepository) {}

  async execute(id: string, organizationId: string): Promise<ClaimData> {
    const claim = await this.claimRepo.findById(id, organizationId);
    if (!claim) {
      throw ClaimErrors.notFound(id);
    }
    return claim;
  }
}
```

- [ ] **Step 6: Create claim-mapper.ts**

```ts
// packages/core/src/modules/claim/infrastructure/claim-mapper.ts
import type { Claim as PrismaClaimRecord } from '@repo/db';
import type { ClaimData } from '../domain/claim-repository.js';

interface ClaimWithRelations extends PrismaClaimRecord {
  policy?: { policyNumber: string } | null;
  client?: { name: string } | null;
  insurer?: { name: string } | null;
  assignedTo?: { name: string } | null;
}

export class ClaimMapper {
  static toDomain(row: ClaimWithRelations): ClaimData {
    return {
      id: row.id,
      organizationId: row.organizationId,
      claimNumber: row.claimNumber,
      policyId: row.policyId,
      clientId: row.clientId,
      insurerId: row.insurerId,
      assignedToId: row.assignedToId,
      status: row.status,
      priority: row.priority,
      description: row.description,
      incidentDate: row.incidentDate,
      incidentLocation: row.incidentLocation,
      reportedAt: row.reportedAt,
      resolvedAt: row.resolvedAt,
      closedAt: row.closedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      policyNumber: row.policy?.policyNumber,
      clientName: row.client?.name,
      insurerName: row.insurer?.name,
      assignedToName: row.assignedTo?.name,
    };
  }
}
```

- [ ] **Step 7: Create prisma-claim-repository.ts**

```ts
// packages/core/src/modules/claim/infrastructure/prisma-claim-repository.ts
import { injectable, inject } from 'tsyringe';
import type { PrismaClient } from '@repo/db';
import { Prisma } from '@repo/db';
import type {
  ClaimRepository,
  ClaimData,
  ClaimFilters,
  CreateClaimInput,
  UpdateClaimStatusInput,
} from '../domain/claim-repository.js';
import type { CursorPage, Page } from '../../client/domain/client-repository.js';
import { ClaimMapper } from './claim-mapper.js';

const CLAIM_INCLUDE = {
  policy: { select: { policyNumber: true } },
  client: { select: { name: true } },
  insurer: { select: { name: true } },
  assignedTo: { select: { name: true } },
} satisfies Prisma.ClaimInclude;

@injectable()
export class PrismaClaimRepository implements ClaimRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async create(data: CreateClaimInput): Promise<ClaimData> {
    const row = await this.prisma.$transaction(async (tx) => {
      const result = await tx.claim.aggregate({
        where: { organizationId: data.organizationId },
        _max: { claimNumber: true },
      });
      const claimNumber = (result._max.claimNumber ?? 0) + 1;

      return tx.claim.create({
        data: {
          organizationId: data.organizationId,
          claimNumber,
          policyId: data.policyId,
          clientId: data.clientId,
          insurerId: data.insurerId ?? null,
          assignedToId: data.assignedToId ?? null,
          priority: data.priority ?? 'NORMAL',
          description: data.description,
          incidentDate: data.incidentDate ?? null,
          incidentLocation: data.incidentLocation ?? null,
        },
        include: CLAIM_INCLUDE,
      });
    });

    return ClaimMapper.toDomain(row);
  }

  async findById(id: string, organizationId: string): Promise<ClaimData | null> {
    const row = await this.prisma.claim.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: CLAIM_INCLUDE,
    });
    return row ? ClaimMapper.toDomain(row) : null;
  }

  async findMany(filters: ClaimFilters, page: CursorPage): Promise<Page<ClaimData>> {
    const where: Prisma.ClaimWhereInput = {
      organizationId: filters.organizationId,
      deletedAt: null,
      ...(filters.status && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.policyId && { policyId: filters.policyId }),
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.search && {
        OR: [
          { description: { contains: filters.search, mode: 'insensitive' } },
          { incidentLocation: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.claim.findMany({
        where,
        take: page.limit + 1,
        ...(page.cursor && { cursor: { id: page.cursor }, skip: 1 }),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: CLAIM_INCLUDE,
      }),
      this.prisma.claim.count({ where }),
    ]);

    const hasNext = rows.length > page.limit;
    const items = hasNext ? rows.slice(0, -1) : rows;

    return {
      items: items.map(ClaimMapper.toDomain),
      total,
      nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null,
    };
  }

  async updateStatus(
    id: string,
    organizationId: string,
    data: UpdateClaimStatusInput,
  ): Promise<ClaimData> {
    const row = await this.prisma.claim.update({
      where: { id, organizationId },
      data: {
        status: data.status,
        resolvedAt: data.resolvedAt,
        closedAt: data.closedAt,
      },
      include: CLAIM_INCLUDE,
    });
    return ClaimMapper.toDomain(row);
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await this.prisma.claim.update({
      where: { id, organizationId },
      data: { deletedAt: new Date() },
    });
  }
}
```

- [ ] **Step 8: Create claim index.ts and add to core exports**

```ts
// packages/core/src/modules/claim/index.ts
// Domain
export type {
  ClaimData,
  ClaimStatus,
  ClaimPriority,
  ClaimFilters,
  ClaimRepository,
  CreateClaimInput,
  UpdateClaimStatusInput,
} from './domain/claim-repository.js';
export {
  ClaimNotFoundError,
  InvalidClaimStatusTransitionError,
  ClaimErrors,
} from './domain/claim-errors.js';

// Application
export { CreateClaim } from './application/create-claim.js';
export { UpdateClaimStatus } from './application/update-claim-status.js';
export { ListClaims } from './application/list-claims.js';
export { GetClaim } from './application/get-claim.js';

// Infrastructure
export { ClaimMapper } from './infrastructure/claim-mapper.js';
export { PrismaClaimRepository } from './infrastructure/prisma-claim-repository.js';
```

Add to `packages/core/src/index.ts`:

```ts
export * from './modules/claim/index.js';
```

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/modules/claim/ packages/core/src/index.ts
git commit -m "feat: add claim module with status workflow validation"
```

---

## Task 4: Occurrence Module (Backend)

**Files:**

- Create: `packages/core/src/modules/occurrence/domain/occurrence-repository.ts`
- Create: `packages/core/src/modules/occurrence/domain/occurrence-errors.ts`
- Create: `packages/core/src/modules/occurrence/application/create-occurrence.ts`
- Create: `packages/core/src/modules/occurrence/application/list-occurrences.ts`
- Create: `packages/core/src/modules/occurrence/infrastructure/occurrence-mapper.ts`
- Create: `packages/core/src/modules/occurrence/infrastructure/prisma-occurrence-repository.ts`
- Create: `packages/core/src/modules/occurrence/index.ts`

- [ ] **Step 1: Create occurrence-repository.ts**

```ts
// packages/core/src/modules/occurrence/domain/occurrence-repository.ts

export interface OccurrenceData {
  id: string;
  claimId: string;
  type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: Date;
  createdByName?: string;
}

export interface CreateOccurrenceInput {
  claimId: string;
  type: string;
  description: string;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
}

export interface OccurrenceRepository {
  create(data: CreateOccurrenceInput): Promise<OccurrenceData>;
  findByClaimId(claimId: string): Promise<OccurrenceData[]>;
}
```

- [ ] **Step 2: Create occurrence-errors.ts**

```ts
// packages/core/src/modules/occurrence/domain/occurrence-errors.ts
export class OccurrenceClaimNotFoundError extends Error {
  readonly code = 'OCCURRENCE_CLAIM_NOT_FOUND' as const;
  constructor(claimId: string) {
    super(`Sinistro ${claimId} não encontrado para registrar ocorrência`);
    this.name = 'OccurrenceClaimNotFoundError';
  }
}

export const OccurrenceErrors = {
  claimNotFound: (claimId: string) => new OccurrenceClaimNotFoundError(claimId),
};
```

- [ ] **Step 3: Create use cases**

```ts
// packages/core/src/modules/occurrence/application/create-occurrence.ts
import { injectable, inject } from 'tsyringe';
import type {
  OccurrenceRepository,
  OccurrenceData,
  CreateOccurrenceInput,
} from '../domain/occurrence-repository.js';

@injectable()
export class CreateOccurrence {
  constructor(
    @inject('OccurrenceRepository') private readonly occurrenceRepo: OccurrenceRepository,
  ) {}

  async execute(dto: CreateOccurrenceInput): Promise<OccurrenceData> {
    return this.occurrenceRepo.create(dto);
  }
}
```

```ts
// packages/core/src/modules/occurrence/application/list-occurrences.ts
import { injectable, inject } from 'tsyringe';
import type { OccurrenceRepository, OccurrenceData } from '../domain/occurrence-repository.js';

@injectable()
export class ListOccurrences {
  constructor(
    @inject('OccurrenceRepository') private readonly occurrenceRepo: OccurrenceRepository,
  ) {}

  async execute(claimId: string): Promise<OccurrenceData[]> {
    return this.occurrenceRepo.findByClaimId(claimId);
  }
}
```

- [ ] **Step 4: Create mapper and repository**

```ts
// packages/core/src/modules/occurrence/infrastructure/occurrence-mapper.ts
import type { Occurrence as PrismaOccurrenceRecord } from '@repo/db';
import type { OccurrenceData } from '../domain/occurrence-repository.js';

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export class OccurrenceMapper {
  static toDomain(row: PrismaOccurrenceRecord): OccurrenceData {
    return {
      id: row.id,
      claimId: row.claimId,
      type: row.type,
      description: row.description,
      metadata: isJsonObject(row.metadata) ? row.metadata : null,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    };
  }
}
```

```ts
// packages/core/src/modules/occurrence/infrastructure/prisma-occurrence-repository.ts
import { injectable, inject } from 'tsyringe';
import type { PrismaClient } from '@repo/db';
import { Prisma } from '@repo/db';
import type {
  OccurrenceRepository,
  OccurrenceData,
  CreateOccurrenceInput,
} from '../domain/occurrence-repository.js';
import { OccurrenceMapper } from './occurrence-mapper.js';

@injectable()
export class PrismaOccurrenceRepository implements OccurrenceRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async create(data: CreateOccurrenceInput): Promise<OccurrenceData> {
    const row = await this.prisma.occurrence.create({
      data: {
        claimId: data.claimId,
        type: data.type,
        description: data.description,
        metadata:
          data.metadata === null || data.metadata === undefined ? Prisma.JsonNull : data.metadata,
        createdBy: data.createdBy ?? null,
      },
    });
    return OccurrenceMapper.toDomain(row);
  }

  async findByClaimId(claimId: string): Promise<OccurrenceData[]> {
    const rows = await this.prisma.occurrence.findMany({
      where: { claimId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(OccurrenceMapper.toDomain);
  }
}
```

- [ ] **Step 5: Create occurrence index.ts and add to core exports**

```ts
// packages/core/src/modules/occurrence/index.ts
// Domain
export type {
  OccurrenceData,
  OccurrenceRepository,
  CreateOccurrenceInput,
} from './domain/occurrence-repository.js';
export { OccurrenceClaimNotFoundError, OccurrenceErrors } from './domain/occurrence-errors.js';

// Application
export { CreateOccurrence } from './application/create-occurrence.js';
export { ListOccurrences } from './application/list-occurrences.js';

// Infrastructure
export { OccurrenceMapper } from './infrastructure/occurrence-mapper.js';
export { PrismaOccurrenceRepository } from './infrastructure/prisma-occurrence-repository.js';
```

Add to `packages/core/src/index.ts`:

```ts
export * from './modules/occurrence/index.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/modules/occurrence/ packages/core/src/index.ts
git commit -m "feat: add occurrence module (sub-entity log for claims)"
```

---

## Task 5: Endorsement Module (Backend)

**Files:**

- Create: `packages/core/src/modules/endorsement/` (domain, application, infrastructure, index.ts)

- [ ] **Step 1: Create endorsement-repository.ts**

```ts
// packages/core/src/modules/endorsement/domain/endorsement-repository.ts
import type { CursorPage, Page } from '../../client/domain/client-repository.js';

export interface EndorsementData {
  id: string;
  organizationId: string;
  policyId: string;
  type: string;
  description: string;
  effectiveDate: Date;
  previousVersionSnapshot: Record<string, unknown>;
  changes: Record<string, unknown>;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  policyNumber?: string;
}

export interface EndorsementFilters {
  organizationId: string;
  policyId?: string;
}

export interface CreateEndorsementInput {
  organizationId: string;
  policyId: string;
  type: string;
  description: string;
  effectiveDate: Date;
  previousVersionSnapshot: Record<string, unknown>;
  changes: Record<string, unknown>;
  createdBy?: string | null;
}

export interface EndorsementRepository {
  create(data: CreateEndorsementInput): Promise<EndorsementData>;
  findById(id: string, organizationId: string): Promise<EndorsementData | null>;
  findMany(filters: EndorsementFilters, page: CursorPage): Promise<Page<EndorsementData>>;
}
```

- [ ] **Step 2: Create endorsement-errors.ts**

```ts
// packages/core/src/modules/endorsement/domain/endorsement-errors.ts
export class EndorsementNotFoundError extends Error {
  readonly code = 'ENDORSEMENT_NOT_FOUND' as const;
  constructor(id: string) {
    super(`Endosso ${id} não encontrado`);
    this.name = 'EndorsementNotFoundError';
  }
}

export const EndorsementErrors = {
  notFound: (id: string) => new EndorsementNotFoundError(id),
};
```

- [ ] **Step 3: Create use cases (create, list, get)**

```ts
// packages/core/src/modules/endorsement/application/create-endorsement.ts
import { injectable, inject } from 'tsyringe';
import type {
  EndorsementRepository,
  EndorsementData,
  CreateEndorsementInput,
} from '../domain/endorsement-repository.js';

@injectable()
export class CreateEndorsement {
  constructor(
    @inject('EndorsementRepository') private readonly endorsementRepo: EndorsementRepository,
  ) {}

  async execute(dto: CreateEndorsementInput): Promise<EndorsementData> {
    return this.endorsementRepo.create(dto);
  }
}
```

```ts
// packages/core/src/modules/endorsement/application/get-endorsement.ts
import { injectable, inject } from 'tsyringe';
import type { EndorsementRepository, EndorsementData } from '../domain/endorsement-repository.js';
import { EndorsementErrors } from '../domain/endorsement-errors.js';

@injectable()
export class GetEndorsement {
  constructor(
    @inject('EndorsementRepository') private readonly endorsementRepo: EndorsementRepository,
  ) {}

  async execute(id: string, organizationId: string): Promise<EndorsementData> {
    const endorsement = await this.endorsementRepo.findById(id, organizationId);
    if (!endorsement) {
      throw EndorsementErrors.notFound(id);
    }
    return endorsement;
  }
}
```

```ts
// packages/core/src/modules/endorsement/application/list-endorsements.ts
import { injectable, inject } from 'tsyringe';
import type { CursorPage, Page } from '../../client/domain/client-repository.js';
import type {
  EndorsementRepository,
  EndorsementData,
  EndorsementFilters,
} from '../domain/endorsement-repository.js';

@injectable()
export class ListEndorsements {
  constructor(
    @inject('EndorsementRepository') private readonly endorsementRepo: EndorsementRepository,
  ) {}

  async execute(filters: EndorsementFilters, page: CursorPage): Promise<Page<EndorsementData>> {
    return this.endorsementRepo.findMany(filters, page);
  }
}
```

- [ ] **Step 4: Create mapper and repository**

```ts
// packages/core/src/modules/endorsement/infrastructure/endorsement-mapper.ts
import type { Endorsement as PrismaEndorsementRecord } from '@repo/db';
import type { EndorsementData } from '../domain/endorsement-repository.js';

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

interface EndorsementWithRelations extends PrismaEndorsementRecord {
  policy?: { policyNumber: string } | null;
}

export class EndorsementMapper {
  static toDomain(row: EndorsementWithRelations): EndorsementData {
    return {
      id: row.id,
      organizationId: row.organizationId,
      policyId: row.policyId,
      type: row.type,
      description: row.description,
      effectiveDate: row.effectiveDate,
      previousVersionSnapshot: isJsonObject(row.previousVersionSnapshot)
        ? row.previousVersionSnapshot
        : {},
      changes: isJsonObject(row.changes) ? row.changes : {},
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      policyNumber: row.policy?.policyNumber,
    };
  }
}
```

Repository follows `PrismaClaimRepository` pattern with `policy: { select: { policyNumber: true } }` in include.

- [ ] **Step 5: Create index.ts and add to core exports**

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/modules/endorsement/ packages/core/src/index.ts
git commit -m "feat: add endorsement module (policy modifications with before/after snapshots)"
```

---

## Task 6: Assistance Module (Backend)

**Files:**

- Create: `packages/core/src/modules/assistance/` (domain, application, infrastructure, index.ts)

- [ ] **Step 1: Create assistance-repository.ts**

```ts
// packages/core/src/modules/assistance/domain/assistance-repository.ts
import type { CursorPage, Page } from '../../client/domain/client-repository.js';

export type AssistanceStatus =
  | 'REQUESTED'
  | 'AWAITING_DOCUMENT'
  | 'PENDING_INSPECTION'
  | 'DISPATCHED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export interface AssistanceData {
  id: string;
  organizationId: string;
  policyId: string;
  clientId: string;
  claimId: string | null;
  type: string;
  status: AssistanceStatus;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  providerName: string | null;
  providerPhone: string | null;
  requestedAt: Date;
  scheduledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  policyNumber?: string;
  clientName?: string;
}

export interface AssistanceFilters {
  organizationId: string;
  status?: AssistanceStatus;
  policyId?: string;
  clientId?: string;
  type?: string;
}

export interface CreateAssistanceInput {
  organizationId: string;
  policyId: string;
  clientId: string;
  claimId?: string | null;
  type: string;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  providerName?: string | null;
  providerPhone?: string | null;
  scheduledAt?: Date | null;
}

export interface UpdateAssistanceStatusInput {
  status: AssistanceStatus;
  completedAt?: Date | null;
}

export interface AssistanceRepository {
  create(data: CreateAssistanceInput): Promise<AssistanceData>;
  findById(id: string, organizationId: string): Promise<AssistanceData | null>;
  findMany(filters: AssistanceFilters, page: CursorPage): Promise<Page<AssistanceData>>;
  updateStatus(
    id: string,
    organizationId: string,
    data: UpdateAssistanceStatusInput,
  ): Promise<AssistanceData>;
}
```

- [ ] **Step 2: Create assistance-errors.ts**

```ts
// packages/core/src/modules/assistance/domain/assistance-errors.ts
export class AssistanceNotFoundError extends Error {
  readonly code = 'ASSISTANCE_NOT_FOUND' as const;
  constructor(id: string) {
    super(`Assistência ${id} não encontrada`);
    this.name = 'AssistanceNotFoundError';
  }
}

export class InvalidAssistanceStatusTransitionError extends Error {
  readonly code = 'INVALID_ASSISTANCE_STATUS_TRANSITION' as const;
  constructor(from: string, to: string) {
    super(`Transição de status inválida: ${from} → ${to}`);
    this.name = 'InvalidAssistanceStatusTransitionError';
  }
}

export const AssistanceErrors = {
  notFound: (id: string) => new AssistanceNotFoundError(id),
  invalidTransition: (from: string, to: string) =>
    new InvalidAssistanceStatusTransitionError(from, to),
};
```

- [ ] **Step 3: Create update-assistance-status.ts with transition validation**

```ts
const VALID_TRANSITIONS: Record<AssistanceStatus, AssistanceStatus[]> = {
  REQUESTED: ['AWAITING_DOCUMENT', 'DISPATCHED'],
  AWAITING_DOCUMENT: ['PENDING_INSPECTION'],
  PENDING_INSPECTION: ['DISPATCHED'],
  DISPATCHED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
};
```

Sets `completedAt = new Date()` when transitioning to `COMPLETED`.

- [ ] **Step 4: Create remaining use cases (create, list, get)**

- [ ] **Step 5: Create mapper and repository**

Repository includes `policy: { select: { policyNumber: true } }` and `client: { select: { name: true } }`.

- [ ] **Step 6: Create index.ts and add to core exports**

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/modules/assistance/ packages/core/src/index.ts
git commit -m "feat: add assistance module with status workflow validation"
```

---

## Task 7: Document Module with Storage Provider (Backend)

**Files:**

- Create: `packages/core/src/modules/document/` (domain, application, infrastructure, index.ts)

- [ ] **Step 1: Create storage-provider.ts interface**

```ts
// packages/core/src/modules/document/domain/storage-provider.ts
export interface UploadResult {
  storageKey: string;
}

export interface StorageProvider {
  upload(key: string, buffer: Buffer, contentType: string): Promise<UploadResult>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
}
```

- [ ] **Step 2: Create document-repository.ts**

```ts
// packages/core/src/modules/document/domain/document-repository.ts
export type DocumentEntityType = 'CLIENT' | 'PROPOSAL' | 'POLICY' | 'CLAIM';
export type DocumentType =
  | 'DRIVER_LICENSE'
  | 'VEHICLE_REGISTRATION'
  | 'POLICY_PDF'
  | 'CLAIM_PHOTO'
  | 'CLAIM_REPORT'
  | 'PROOF_OF_PAYMENT'
  | 'CONTRACT'
  | 'OTHER';

export interface DocumentData {
  id: string;
  organizationId: string;
  entityType: DocumentEntityType;
  entityId: string;
  clientId: string | null;
  type: DocumentType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  url: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface DocumentFilters {
  organizationId: string;
  entityType?: DocumentEntityType;
  entityId?: string;
}

export interface CreateDocumentInput {
  organizationId: string;
  entityType: DocumentEntityType;
  entityId: string;
  clientId?: string | null;
  type?: DocumentType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  url?: string | null;
  createdBy?: string | null;
}

export interface DocumentRepository {
  create(data: CreateDocumentInput): Promise<DocumentData>;
  findById(id: string, organizationId: string): Promise<DocumentData | null>;
  findByEntity(filters: DocumentFilters): Promise<DocumentData[]>;
  delete(id: string, organizationId: string): Promise<DocumentData | null>;
}
```

- [ ] **Step 3: Create document-errors.ts**

```ts
// packages/core/src/modules/document/domain/document-errors.ts
export class DocumentNotFoundError extends Error {
  readonly code = 'DOCUMENT_NOT_FOUND' as const;
  constructor(id: string) {
    super(`Documento ${id} não encontrado`);
    this.name = 'DocumentNotFoundError';
  }
}

export const DocumentErrors = {
  notFound: (id: string) => new DocumentNotFoundError(id),
};
```

- [ ] **Step 4: Create R2StorageProvider (uses @repo/env)**

```ts
// packages/core/src/modules/document/infrastructure/r2-storage-provider.ts
import { injectable } from 'tsyringe';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@repo/env';
import type { StorageProvider, UploadResult } from '../domain/storage-provider.js';

@injectable()
export class R2StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
      throw new Error(
        'R2 credentials required when STORAGE_PROVIDER=r2. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.',
      );
    }

    this.bucket = env.R2_BUCKET_NAME;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<UploadResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return { storageKey: key };
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
```

- [ ] **Step 5: Create LocalStorageProvider (dev fallback)**

```ts
// packages/core/src/modules/document/infrastructure/local-storage-provider.ts
import { injectable } from 'tsyringe';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { StorageProvider, UploadResult } from '../domain/storage-provider.js';

const UPLOAD_DIR = resolve(process.cwd(), 'uploads');

@injectable()
export class LocalStorageProvider implements StorageProvider {
  async upload(key: string, buffer: Buffer, _contentType: string): Promise<UploadResult> {
    const filePath = resolve(UPLOAD_DIR, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    return { storageKey: key };
  }

  async getSignedUrl(key: string, _expiresIn?: number): Promise<string> {
    return `/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = resolve(UPLOAD_DIR, key);
    try {
      await unlink(filePath);
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return; // File already deleted, no-op
      }
      throw error;
    }
  }
}
```

- [ ] **Step 6: Create use cases (upload, list, get-url, delete)**

`UploadDocument`: generates `storageKey = {orgId}/{entityType}/{entityId}/{uuid}-{fileName}`, calls storage.upload, then repo.create.

`GetDocumentUrl`: finds doc by id, calls storage.getSignedUrl with the storageKey.

`DeleteDocument`: finds doc by id, calls storage.delete, then repo.delete. **Hard delete** (not soft).

`ListDocuments`: delegates to repo.findByEntity.

- [ ] **Step 7: Create mapper and repository**

- [ ] **Step 8: Create index.ts and add to core exports**

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/modules/document/ packages/core/src/index.ts
git commit -m "feat: add document module with R2 and local storage providers"
```

---

## Task 8: Server Routes and DI Registration

**Files:**

- Create: `apps/server/src/schemas/claim.schemas.ts`
- Create: `apps/server/src/schemas/endorsement.schemas.ts`
- Create: `apps/server/src/schemas/assistance.schemas.ts`
- Create: `apps/server/src/schemas/document.schemas.ts`
- Create: `apps/server/src/schemas/occurrence.schemas.ts`
- Create: `apps/server/src/schemas/insurer.schemas.ts`
- Create: `apps/server/src/routes/v1/claim-routes.ts`
- Create: `apps/server/src/routes/v1/endorsement-routes.ts`
- Create: `apps/server/src/routes/v1/assistance-routes.ts`
- Create: `apps/server/src/routes/v1/document-routes.ts`
- Create: `apps/server/src/routes/v1/insurer-routes.ts`
- Modify: `apps/server/src/container-registrations.ts`
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Create Zod schemas for all modules**

`claim.schemas.ts`:

```ts
import { z } from 'zod';

const emptyToUndefined = z.literal('').transform(() => undefined);
const optionalDate = z.union([emptyToUndefined, z.coerce.date()]).optional();
const optionalString = z.union([emptyToUndefined, z.string()]).optional();

export const createClaimBodySchema = z.object({
  policyId: z.string().min(1),
  clientId: z.string().min(1),
  insurerId: optionalString,
  assignedToId: optionalString,
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).optional(),
  description: z.string().min(1),
  incidentDate: optionalDate,
  incidentLocation: optionalString,
});

export const updateClaimStatusBodySchema = z.object({
  status: z.enum([
    'REGISTERED',
    'IN_ANALYSIS',
    'AWAITING_DOCUMENT',
    'PENDING_INSPECTION',
    'APPROVED',
    'REJECTED',
    'PAID',
    'COMPLETED',
  ]),
});

export const listClaimsQuerySchema = z.object({
  status: z
    .enum([
      'REGISTERED',
      'IN_ANALYSIS',
      'AWAITING_DOCUMENT',
      'PENDING_INSPECTION',
      'APPROVED',
      'REJECTED',
      'PAID',
      'COMPLETED',
    ])
    .optional(),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).optional(),
  policyId: z.string().optional(),
  clientId: z.string().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});
```

Similar schemas for endorsement, assistance, document, occurrence, insurer.

Document upload uses `@fastify/multipart` for file upload.

- [ ] **Step 2: Create claim-routes.ts**

Routes:

- `POST /api/v1/claims` — `requireAbility('create', 'Claim')`
- `GET /api/v1/claims` — `requireAbility('read', 'Claim')`
- `GET /api/v1/claims/:id` — `requireAbility('read', 'Claim')`
- `POST /api/v1/claims/:id/status` — `requireAbility('update', 'Claim')`
- `DELETE /api/v1/claims/:id` — `requireAbility('delete', 'Claim')` — soft delete
- `POST /api/v1/claims/:id/occurrences` — `requireAbility('update', 'Claim')`
- `GET /api/v1/claims/:id/occurrences` — `requireAbility('read', 'Claim')`

Follow exact pattern from `client-routes.ts`: `handleClaimError` function, `tenantMiddleware` hook, resolve use case from container.

- [ ] **Step 3: Create remaining route files**

`endorsement-routes.ts`:

- `POST /api/v1/endorsements` — `requireAbility('create', 'Endorsement')`
- `GET /api/v1/endorsements` — `requireAbility('read', 'Endorsement')`
- `GET /api/v1/endorsements/:id` — `requireAbility('read', 'Endorsement')`

`assistance-routes.ts`:

- `POST /api/v1/assistances` — `requireAbility('create', 'Assistance')`
- `GET /api/v1/assistances` — `requireAbility('read', 'Assistance')`
- `GET /api/v1/assistances/:id` — `requireAbility('read', 'Assistance')`
- `POST /api/v1/assistances/:id/status` — `requireAbility('update', 'Assistance')`

`document-routes.ts`:

- `POST /api/v1/documents/upload` — `requireAbility('create', 'Document')` — multipart
- `GET /api/v1/documents` — `requireAbility('read', 'Document')` — query by entityType + entityId
- `GET /api/v1/documents/:id/url` — `requireAbility('read', 'Document')`
- `DELETE /api/v1/documents/:id` — `requireAbility('delete', 'Document')`

`insurer-routes.ts`:

- `POST /api/v1/insurers` — `requireAbility('manage', 'all')` (admin only)
- `GET /api/v1/insurers` — `requireAbility('read', 'Policy')` (any authenticated user)

- [ ] **Step 4: Install @fastify/multipart**

```bash
cd apps/server && pnpm add @fastify/multipart
```

Register in `app.ts`:

```ts
import multipart from '@fastify/multipart';
// After helmet:
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB
```

- [ ] **Step 5: Update container-registrations.ts**

Register all new repositories, use cases, and the StorageProvider based on `STORAGE_PROVIDER` env var:

```ts
import { env } from '@repo/env';
// ... import all new modules from @repo/core

// Storage Provider (selected by env)
const storageProvider =
  env.STORAGE_PROVIDER === 'r2' ? new R2StorageProvider() : new LocalStorageProvider();
container.register('StorageProvider', { useValue: storageProvider });

// Repositories
const insurerRepo = new PrismaInsurerRepository(prisma);
const claimRepo = new PrismaClaimRepository(prisma);
const occurrenceRepo = new PrismaOccurrenceRepository(prisma);
const endorsementRepo = new PrismaEndorsementRepository(prisma);
const assistanceRepo = new PrismaAssistanceRepository(prisma);
const documentRepo = new PrismaDocumentRepository(prisma);

container.register('InsurerRepository', { useValue: insurerRepo });
container.register('ClaimRepository', { useValue: claimRepo });
container.register('OccurrenceRepository', { useValue: occurrenceRepo });
container.register('EndorsementRepository', { useValue: endorsementRepo });
container.register('AssistanceRepository', { useValue: assistanceRepo });
container.register('DocumentRepository', { useValue: documentRepo });

// Use cases (useFactory pattern)
container.register(CreateInsurer, { useFactory: () => new CreateInsurer(insurerRepo) });
container.register(ListInsurers, { useFactory: () => new ListInsurers(insurerRepo) });
container.register(GetInsurer, { useFactory: () => new GetInsurer(insurerRepo) });
container.register(CreateClaim, { useFactory: () => new CreateClaim(claimRepo) });
container.register(UpdateClaimStatus, { useFactory: () => new UpdateClaimStatus(claimRepo) });
container.register(ListClaims, { useFactory: () => new ListClaims(claimRepo) });
container.register(GetClaim, { useFactory: () => new GetClaim(claimRepo) });
container.register(CreateOccurrence, { useFactory: () => new CreateOccurrence(occurrenceRepo) });
container.register(ListOccurrences, { useFactory: () => new ListOccurrences(occurrenceRepo) });
container.register(CreateEndorsement, { useFactory: () => new CreateEndorsement(endorsementRepo) });
container.register(ListEndorsements, { useFactory: () => new ListEndorsements(endorsementRepo) });
container.register(GetEndorsement, { useFactory: () => new GetEndorsement(endorsementRepo) });
container.register(CreateAssistance, { useFactory: () => new CreateAssistance(assistanceRepo) });
container.register(UpdateAssistanceStatus, {
  useFactory: () => new UpdateAssistanceStatus(assistanceRepo),
});
container.register(ListAssistances, { useFactory: () => new ListAssistances(assistanceRepo) });
container.register(GetAssistance, { useFactory: () => new GetAssistance(assistanceRepo) });
container.register(UploadDocument, {
  useFactory: () => new UploadDocument(storageProvider, documentRepo),
});
container.register(ListDocuments, { useFactory: () => new ListDocuments(documentRepo) });
container.register(GetDocumentUrl, {
  useFactory: () => new GetDocumentUrl(documentRepo, storageProvider),
});
container.register(DeleteDocument, {
  useFactory: () => new DeleteDocument(documentRepo, storageProvider),
});
```

- [ ] **Step 6: Update app.ts to register new routes**

```ts
import { claimRoutes } from './routes/v1/claim-routes.js';
import { endorsementRoutes } from './routes/v1/endorsement-routes.js';
import { assistanceRoutes } from './routes/v1/assistance-routes.js';
import { documentRoutes } from './routes/v1/document-routes.js';
import { insurerRoutes } from './routes/v1/insurer-routes.js';

// Inside the authenticated app.register block:
await authenticatedApp.register(claimRoutes);
await authenticatedApp.register(endorsementRoutes);
await authenticatedApp.register(assistanceRoutes);
await authenticatedApp.register(documentRoutes);
await authenticatedApp.register(insurerRoutes);
```

- [ ] **Step 7: Commit**

```bash
git add apps/server/
git commit -m "feat: add API routes for claims, endorsements, assistances, documents, insurers

All routes follow existing patterns: Zod validation, DI resolution, error handling.
Document upload via @fastify/multipart. RBAC enforced on all endpoints."
```

---

## Task 9: Frontend — Types, Hooks, and API Client Updates

**Files:**

- Modify: `apps/web/src/lib/api-client.ts`
- Modify: `apps/web/src/lib/permissions.ts`
- Create: `apps/web/src/features/claims/types/index.ts`
- Create: `apps/web/src/features/claims/hooks/use-claims.ts`
- Create: `apps/web/src/features/claims/lib/constants.ts`
- Create: `apps/web/src/features/claims/lib/schemas.ts`
- Create: `apps/web/src/features/endorsements/types/index.ts`
- Create: `apps/web/src/features/endorsements/hooks/use-endorsements.ts`
- Create: `apps/web/src/features/endorsements/lib/constants.ts`
- Create: `apps/web/src/features/assistances/types/index.ts`
- Create: `apps/web/src/features/assistances/hooks/use-assistances.ts`
- Create: `apps/web/src/features/assistances/lib/constants.ts`
- Create: `apps/web/src/features/assistances/lib/schemas.ts`
- Create: `apps/web/src/features/documents/types/index.ts`
- Create: `apps/web/src/features/documents/hooks/use-documents.ts`

- [ ] **Step 1: Add `patch` method to api-client.ts**

```ts
patch: <TData>(path: string, data: unknown) =>
  request<TData>(path, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
```

- [ ] **Step 2: Update CASL abilities in packages/auth/src/abilities.ts**

Add `create` permission for Document to COMMERCIAL role:

```ts
// In the COMMERCIAL case, change:
can('read', ['Policy', 'Commission', 'Claim', 'Document']);
// To:
can('read', ['Policy', 'Commission', 'Claim']);
can(['read', 'create'], 'Document');
```

- [ ] **Step 3: Add new permissions to permissions.ts**

```ts
'claims:update': ['OWNER', 'ADMIN', 'MANAGER'],
'claims:delete': ['OWNER', 'ADMIN', 'MANAGER'],
'endorsements:read': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'],
'endorsements:create': ['OWNER', 'ADMIN', 'MANAGER'],
'assistances:read': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'],
'assistances:create': ['OWNER', 'ADMIN', 'MANAGER'],
'assistances:update': ['OWNER', 'ADMIN', 'MANAGER'],
'documents:read': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'],
'documents:create': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL'],
'documents:delete': ['OWNER', 'ADMIN', 'MANAGER'],
```

- [ ] **Step 4: Create claims types, constants, schemas, hooks**

Types follow `ClientData` pattern with `readonly` fields. Constants include:

```ts
export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  REGISTERED: 'Registrado',
  IN_ANALYSIS: 'Em Análise',
  AWAITING_DOCUMENT: 'Aguardando Documento',
  PENDING_INSPECTION: 'Pendente Vistoria',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  PAID: 'Pago',
  COMPLETED: 'Concluído',
};

export const CLAIM_PRIORITY_LABELS: Record<ClaimPriority, string> = {
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export const CLAIM_STATUS_COLORS: Record<ClaimStatus, string> = {
  REGISTERED: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  IN_ANALYSIS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  AWAITING_DOCUMENT: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  PENDING_INSPECTION: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  COMPLETED: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
};

export const CLAIM_PRIORITY_COLORS: Record<ClaimPriority, string> = {
  NORMAL: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function formatClaimNumber(claimNumber: number, createdAt: string | Date): string {
  const year = new Date(createdAt).getFullYear();
  return `SIN-${year}-${String(claimNumber).padStart(4, '0')}`;
}
```

Hooks follow `use-clients.ts` pattern: `useClaims`, `useClaim`, `useCreateClaim`, `useUpdateClaimStatus`, `useDeleteClaim`.

- [ ] **Step 5: Create endorsements, assistances, documents types/hooks/constants**

Same patterns. Assistances include status workflow constants like claims.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/ apps/web/src/features/claims/ apps/web/src/features/endorsements/ apps/web/src/features/assistances/ apps/web/src/features/documents/
git commit -m "feat: add frontend types, hooks, constants for insurance operation modules"
```

---

## Task 10: Frontend — Claims Pages

**Files:**

- Create: `apps/web/src/features/claims/components/claim-status-badge.tsx`
- Create: `apps/web/src/features/claims/components/claim-priority-badge.tsx`
- Create: `apps/web/src/features/claims/components/claims-table.tsx`
- Create: `apps/web/src/features/claims/components/claim-form.tsx`
- Create: `apps/web/src/features/claims/components/claim-detail.tsx`
- Create: `apps/web/src/features/claims/components/claim-status-actions.tsx`
- Create: `apps/web/src/features/claims/components/occurrence-list.tsx`
- Create: `apps/web/src/features/claims/components/occurrence-form.tsx`
- Create: `apps/web/src/app/(dashboard)/claims/page.tsx`
- Create: `apps/web/src/app/(dashboard)/claims/claims-content.tsx`
- Create: `apps/web/src/app/(dashboard)/claims/new/page.tsx`
- Create: `apps/web/src/app/(dashboard)/claims/new/new-claim-content.tsx`
- Create: `apps/web/src/app/(dashboard)/claims/[id]/page.tsx`
- Create: `apps/web/src/app/(dashboard)/claims/[id]/claim-detail-content.tsx`

- [ ] **Step 1: Create claim-status-badge.tsx and claim-priority-badge.tsx**

Small components using `CLAIM_STATUS_COLORS` and `CLAIM_PRIORITY_COLORS` constants. Badge component from shadcn/ui.

- [ ] **Step 2: Create claims-table.tsx**

Follow `clients-table.tsx` pattern. Columns: claimNumber (formatted), client name, policy number, status badge, priority badge, reportedAt, actions dropdown. Toolbar: search + status filter + priority filter + "Novo Sinistro" button. Row click → `/claims/[id]`.

- [ ] **Step 3: Create claim-form.tsx (dedicated page, not Sheet)**

Per UI-PATTERNS.md, claims are complex (8+ fields) → dedicated page with breadcrumb. Fields: policy (combobox), client (auto-filled from policy), insurer (optional combobox), priority, description, incident date, incident location. Uses React Hook Form + Zod.

- [ ] **Step 4: Create claim-detail.tsx**

Header: claim number, status badge, priority badge, client name, policy number. Info cards: dates, description, location. Status actions section. Tabs: Occurrences, Documents.

- [ ] **Step 5: Create claim-status-actions.tsx**

Shows allowed transitions based on current status. Each transition = button with confirmation dialog. Uses `useUpdateClaimStatus` hook.

- [ ] **Step 6: Create occurrence-list.tsx and occurrence-form.tsx**

Inline within claim detail (tab). Occurrence list = timeline view (newest first). Occurrence form = Sheet with fields: type (select), description (textarea).

- [ ] **Step 7: Create pages**

`claims/page.tsx` → `ClaimsContent` (client component with table). `claims/new/page.tsx` → `NewClaimContent`. `claims/[id]/page.tsx` → `ClaimDetailContent`.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/claims/ apps/web/src/app/\(dashboard\)/claims/
git commit -m "feat: add claims management pages with status workflow and occurrences"
```

---

## Task 11: Frontend — Document Components (Reusable)

**Files:**

- Create: `apps/web/src/features/documents/components/document-upload.tsx`
- Create: `apps/web/src/features/documents/components/document-list.tsx`
- Create: `apps/web/src/features/documents/components/document-type-badge.tsx`

- [ ] **Step 1: Create document-type-badge.tsx**

Maps `DocumentType` to pt-BR labels and colors.

- [ ] **Step 2: Create document-upload.tsx**

Drag-and-drop zone using native HTML5 drag events (no external lib). File validation: max 10MB, allowed MIME types. Shows progress indicator during upload. Props: `entityType`, `entityId`, `onUploadSuccess`.

- [ ] **Step 3: Create document-list.tsx**

Reusable component. Props: `entityType`, `entityId`. Shows file name, type badge, size (formatted), upload date, "Abrir" link (calls `getDocumentUrl` → opens presigned URL in new tab), delete button.

- [ ] **Step 4: Integrate into claim-detail.tsx Documents tab**

Already wired in Task 10 claim-detail as a tab — just pass `entityType="CLAIM"` and `entityId={claimId}`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/documents/
git commit -m "feat: add reusable document upload, list, and type badge components"
```

---

## Task 12: Frontend — Endorsements (Inline in Policy Detail)

**Files:**

- Create: `apps/web/src/features/endorsements/components/endorsement-list.tsx`
- Create: `apps/web/src/features/endorsements/components/endorsement-form.tsx`
- Modify: `apps/web/src/app/(dashboard)/policies/[id]/policy-detail-content.tsx`

- [ ] **Step 1: Create endorsement-list.tsx**

Table within policy detail showing: type, description, effective date, created date. No pagination (endorsements per policy are few).

- [ ] **Step 2: Create endorsement-form.tsx (Sheet)**

Per UI-PATTERNS.md: endorsement is simple (< 8 fields) → Sheet. Fields: type (select: coverage_change, premium_adjustment, data_correction, beneficiary_change, other), description, effective date. `previousVersionSnapshot` is auto-captured from current policy data. `changes` is a JSON textarea for now.

- [ ] **Step 3: Add Endorsements tab to policy-detail-content.tsx**

Add "Endossos" tab alongside existing content. Renders `EndorsementList` and "Novo Endosso" button → opens `EndorsementForm` Sheet.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/endorsements/ apps/web/src/app/\(dashboard\)/policies/
git commit -m "feat: add endorsement list and form within policy detail"
```

---

## Task 13: Frontend — Assistances Pages

**Files:**

- Create: `apps/web/src/features/assistances/components/assistance-status-badge.tsx`
- Create: `apps/web/src/features/assistances/components/assistances-table.tsx`
- Create: `apps/web/src/features/assistances/components/assistance-form.tsx`
- Create: `apps/web/src/features/assistances/components/assistance-detail.tsx`
- Create: `apps/web/src/app/(dashboard)/assistances/page.tsx`
- Create: `apps/web/src/app/(dashboard)/assistances/assistances-content.tsx`
- Create: `apps/web/src/app/(dashboard)/assistances/new/page.tsx`
- Create: `apps/web/src/app/(dashboard)/assistances/new/new-assistance-content.tsx`
- Create: `apps/web/src/app/(dashboard)/assistances/[id]/page.tsx`
- Create: `apps/web/src/app/(dashboard)/assistances/[id]/assistance-detail-content.tsx`
- Modify: `apps/web/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add Assistencias nav item to sidebar**

Add after Claims in `MAIN_NAV`:

```ts
{ href: '/assistances', label: 'Assistências', icon: LifeBuoy, permission: 'assistances:read' },
```

Import `LifeBuoy` from `lucide-react`.

- [ ] **Step 2: Create assistance-status-badge.tsx**

```ts
export const ASSISTANCE_STATUS_LABELS: Record<AssistanceStatus, string> = {
  REQUESTED: 'Solicitada',
  AWAITING_DOCUMENT: 'Aguardando Documento',
  PENDING_INSPECTION: 'Pendente Vistoria',
  DISPATCHED: 'Despachada',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluída',
};
```

- [ ] **Step 3: Create assistances-table.tsx**

Columns: type, client, policy, status badge, requested date, address, actions. Toolbar: search + status filter + "Nova Assistência" button.

- [ ] **Step 4: Create assistance-form.tsx (dedicated page)**

Complex form (8+ fields). Fields: policy (combobox), client (auto-filled), claim (optional combobox), type (select: towing, mechanic, lockout, glass, other), description, address, provider name, provider phone, scheduled date.

- [ ] **Step 5: Create assistance-detail.tsx**

Header: type, status badge, client, policy. Info: address (with "Abrir no Google Maps" link using lat/lng), provider info, dates. Status actions. Documents tab.

Google Maps link format: `https://www.google.com/maps?q=${latitude},${longitude}`

- [ ] **Step 6: Create pages**

Same pattern as claims pages.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/assistances/ apps/web/src/app/\(dashboard\)/assistances/ apps/web/src/components/layout/sidebar.tsx
git commit -m "feat: add assistance management pages with status workflow"
```

---

## Task 14: Integration — Wire Documents into Existing Detail Pages

**Files:**

- Modify: `apps/web/src/app/(dashboard)/proposals/[id]/proposal-detail-content.tsx`
- Modify: `apps/web/src/app/(dashboard)/policies/[id]/policy-detail-content.tsx`
- Modify: `apps/web/src/app/(dashboard)/clients/[id]/page.tsx`

- [ ] **Step 1: Add Documents tab to proposal-detail**

Add "Documentos" tab with `DocumentList` and `DocumentUpload` components, passing `entityType="PROPOSAL"` and `entityId={proposalId}`.

- [ ] **Step 2: Add Documents tab to policy-detail**

Same pattern: `entityType="POLICY"`, `entityId={policyId}`.

- [ ] **Step 3: Add Documents tab to client detail (if detail page exists)**

If client has a detail page, add documents tab with `entityType="CLIENT"`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/
git commit -m "feat: integrate document upload/list into proposal, policy, and client detail pages"
```

---

## Task 15: Quality Gates and Validation

- [ ] **Step 1: Run lint**

```bash
pnpm lint
```

Fix any errors.

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Fix any type errors.

- [ ] **Step 3: Run build**

```bash
pnpm build
```

Fix any build errors.

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Fix any test failures.

- [ ] **Step 5: Add `uploads/` to .gitignore**

```
# Local document uploads (dev)
uploads/
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: fix lint/type/build issues for insurance operations modules"
```

---

## Dependencies to Install

```bash
# In apps/server:
cd apps/server && pnpm add @fastify/multipart

# In packages/core (for R2 storage):
cd packages/core && pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

## RBAC Summary

| Module      | COMMERCIAL                    | MANAGER | ADMIN  | OWNER  |
| ----------- | ----------------------------- | ------- | ------ | ------ |
| Claim       | read                          | manage  | manage | manage |
| Endorsement | read                          | manage  | manage | manage |
| Assistance  | read                          | manage  | manage | manage |
| Document    | read + create (own proposals) | manage  | manage | manage |
| Insurer     | read (via policy)             | read    | manage | manage |
| Occurrence  | read (via claim)              | manage  | manage | manage |

---

## API Endpoints Summary

| Method | Endpoint                         | Description                       |
| ------ | -------------------------------- | --------------------------------- |
| POST   | `/api/v1/claims`                 | Create claim                      |
| GET    | `/api/v1/claims`                 | List claims (filtered, paginated) |
| GET    | `/api/v1/claims/:id`             | Get claim detail                  |
| POST   | `/api/v1/claims/:id/status`      | Update claim status               |
| DELETE | `/api/v1/claims/:id`             | Soft delete claim                 |
| POST   | `/api/v1/claims/:id/occurrences` | Add occurrence to claim           |
| GET    | `/api/v1/claims/:id/occurrences` | List claim occurrences            |
| POST   | `/api/v1/endorsements`           | Create endorsement                |
| GET    | `/api/v1/endorsements`           | List endorsements                 |
| GET    | `/api/v1/endorsements/:id`       | Get endorsement detail            |
| POST   | `/api/v1/assistances`            | Create assistance                 |
| GET    | `/api/v1/assistances`            | List assistances                  |
| GET    | `/api/v1/assistances/:id`        | Get assistance detail             |
| POST   | `/api/v1/assistances/:id/status` | Update assistance status          |
| POST   | `/api/v1/documents/upload`       | Upload document (multipart)       |
| GET    | `/api/v1/documents`              | List documents by entity          |
| GET    | `/api/v1/documents/:id/url`      | Get presigned URL                 |
| DELETE | `/api/v1/documents/:id`          | Delete document                   |
| POST   | `/api/v1/insurers`               | Create insurer                    |
| GET    | `/api/v1/insurers`               | List insurers                     |
