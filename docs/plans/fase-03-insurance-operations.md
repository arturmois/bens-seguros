# Fase 3: Insurance Operations - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar Claims (sinistros), Endorsements (endossos), Assistances (assistencias), Documents (documentos) e Occurrences (ocorrencias). Todos DDD Light.

**Architecture:** Todos modulos seguem DDD Light. Claims tem workflow de status (7 estagios) mas sem state machine em entity class (validacao via Zod + use case). Documents integram com Cloudflare R2 via presigned URLs.

**Tech Stack:** Prisma 7, tsyringe, Zod, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, Fastify 5.

**Spec:** `/home/artur/projects/ESPECIFICACAO-FINAL.md` (Secoes 8.4-8.8)

**Depends on:** Fase 2 completa

---

## File Structure

```
packages/
├── db/prisma/schema.prisma              # Add Claim, Endorsement, Assistance, Document, Occurrence, Insurer
├── core/src/modules/
│   ├── claim/
│   │   ├── domain/
│   │   │   ├── claim-repository.ts
│   │   │   └── claim-errors.ts
│   │   ├── application/
│   │   │   ├── create-claim.ts
│   │   │   ├── update-claim-status.ts
│   │   │   ├── list-claims.ts
│   │   │   └── get-claim.ts
│   │   └── infrastructure/
│   │       └── prisma-claim-repository.ts
│   ├── endorsement/
│   │   ├── domain/
│   │   ├── application/
│   │   │   ├── create-endorsement.ts
│   │   │   ├── list-endorsements.ts
│   │   │   └── get-endorsement.ts
│   │   └── infrastructure/
│   ├── assistance/
│   │   ├── domain/
│   │   ├── application/
│   │   │   ├── create-assistance.ts
│   │   │   ├── update-assistance-status.ts
│   │   │   ├── list-assistances.ts
│   │   │   └── get-assistance.ts
│   │   └── infrastructure/
│   ├── occurrence/
│   │   ├── domain/
│   │   ├── application/
│   │   │   ├── create-occurrence.ts
│   │   │   └── list-occurrences.ts
│   │   └── infrastructure/
│   └── document/
│       ├── domain/
│       │   ├── document-repository.ts
│       │   ├── storage-provider.ts         # Interface
│       │   └── document-errors.ts
│       ├── application/
│       │   ├── upload-document.ts
│       │   ├── list-documents.ts
│       │   ├── get-document-url.ts
│       │   └── delete-document.ts
│       └── infrastructure/
│           ├── prisma-document-repository.ts
│           └── r2-storage-provider.ts       # Cloudflare R2 implementation
apps/
├── server/src/
│   ├── routes/v1/
│   │   ├── claim-routes.ts
│   │   ├── endorsement-routes.ts
│   │   ├── assistance-routes.ts
│   │   ├── occurrence-routes.ts
│   │   └── document-routes.ts
│   ├── handlers/ (same pattern)
│   └── schemas/ (same pattern)
├── web/src/
│   ├── features/
│   │   ├── claims/
│   │   │   ├── components/ (claims-table, claim-form, claim-detail, claim-status-badge)
│   │   │   ├── hooks/
│   │   │   └── types/
│   │   ├── endorsements/
│   │   ├── assistance/
│   │   └── documents/
│   │       └── components/ (document-upload, document-list, document-viewer)
│   ├── app/(dashboard)/
│   │   ├── claims/ (page, new, [id])
│   │   ├── endorsements/
│   │   └── assistance/
```

---

## Task 1: Prisma Schema - Insurance Operation Models

**Files:**

- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add enums**

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

- [ ] **Step 2: Add Insurer reference model**

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

  @@unique([organizationId, name])
  @@index([organizationId])
}
```

- [ ] **Step 3: Add Claim + Occurrence models**

```prisma
model Claim {
  id              String        @id @default(cuid())
  organizationId  String
  policyId        String
  clientId        String
  insurerId       String?
  assignedToId    String?
  status          ClaimStatus   @default(REGISTERED)
  priority        ClaimPriority @default(NORMAL)
  description     String
  incidentDate    DateTime?
  incidentLocation String?
  reportedAt      DateTime      @default(now())
  resolvedAt      DateTime?
  closedAt        DateTime?
  deletedAt       DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  policy          Policy        @relation(fields: [policyId], references: [id])
  client          Client        @relation(fields: [clientId], references: [id])
  insurer         Insurer?      @relation(fields: [insurerId], references: [id])
  assignedTo      User?         @relation("ClaimAssignee", fields: [assignedToId], references: [id])
  occurrences     Occurrence[]

  @@index([organizationId, status])
  @@index([organizationId, policyId])
  @@index([organizationId, priority])
  @@index([organizationId, createdAt(sort: Desc)])
}

model Occurrence {
  id          String    @id @default(cuid())
  claimId     String
  type        String
  description String
  metadata    Json?
  createdBy   String?
  createdAt   DateTime  @default(now())

  claim       Claim     @relation(fields: [claimId], references: [id], onDelete: Cascade)

  @@index([claimId])
}
```

- [ ] **Step 4: Add Endorsement model**

```prisma
model Endorsement {
  id                      String    @id @default(cuid())
  organizationId          String
  policyId                String
  type                    String    // coverage_change, premium_adjustment, etc.
  description             String
  effectiveDate           DateTime
  previousVersionSnapshot Json
  changes                 Json
  createdBy               String?
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  policy                  Policy    @relation(fields: [policyId], references: [id])

  @@index([organizationId, policyId])
  @@index([organizationId, createdAt(sort: Desc)])
}
```

- [ ] **Step 5: Add Assistance model**

```prisma
model Assistance {
  id              String           @id @default(cuid())
  organizationId  String
  policyId        String
  clientId        String
  claimId         String?
  type            String           // towing, mechanic, lockout, etc.
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

  @@index([organizationId, status])
  @@index([organizationId, createdAt(sort: Desc)])
}
```

- [ ] **Step 6: Add Document model**

```prisma
model Document {
  id              String            @id @default(cuid())
  organizationId  String
  entityType      DocumentEntityType
  entityId        String
  clientId        String?
  type            DocumentType      @default(OTHER)
  fileName        String
  mimeType        String
  sizeBytes       Int
  storageKey      String            @unique
  url             String?
  createdBy       String?
  createdAt       DateTime          @default(now())

  @@index([organizationId, entityType, entityId])
  @@index([organizationId, createdAt(sort: Desc)])
}
```

- [ ] **Step 7: Add relations to Policy and Client**

Add to Policy:

```prisma
  claims          Claim[]
  endorsements    Endorsement[]
  assistances     Assistance[]
```

Add to Client:

```prisma
  claims          Claim[]
  assistances     Assistance[]
```

- [ ] **Step 8: Generate and push**

```bash
cd packages/db && pnpm db:generate && pnpm db:push
```

- [ ] **Step 9: Commit**

```bash
git add packages/db/
git commit -m "feat: add claim, endorsement, assistance, document, occurrence models"
```

---

## Task 2: Document Module with R2 Storage

**Files:**

- Create: `packages/core/src/modules/document/domain/storage-provider.ts`
- Create: `packages/core/src/modules/document/domain/document-repository.ts`
- Create: `packages/core/src/modules/document/domain/document-errors.ts`
- Create: `packages/core/src/modules/document/application/upload-document.ts`
- Create: `packages/core/src/modules/document/application/list-documents.ts`
- Create: `packages/core/src/modules/document/application/get-document-url.ts`
- Create: `packages/core/src/modules/document/application/delete-document.ts`
- Create: `packages/core/src/modules/document/infrastructure/r2-storage-provider.ts`
- Create: `packages/core/src/modules/document/infrastructure/prisma-document-repository.ts`

- [ ] **Step 1: Create StorageProvider interface**

```ts
export interface UploadResult {
  storageKey: string;
  url?: string;
}

export interface StorageProvider {
  upload(key: string, buffer: Buffer, contentType: string): Promise<UploadResult>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
}
```

- [ ] **Step 2: Implement R2StorageProvider**

```ts
import { injectable } from 'tsyringe';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageProvider, UploadResult } from '../domain/storage-provider.js';

@injectable()
export class R2StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.R2_BUCKET_NAME ?? 'bens-seguros';
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
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

- [ ] **Step 3: Create upload-document use case**

```ts
import { injectable, inject } from 'tsyringe';
import { randomUUID } from 'node:crypto';
import type { StorageProvider } from '../domain/storage-provider.js';
import type { DocumentRepository } from '../domain/document-repository.js';

interface UploadDocumentDTO {
  organizationId: string;
  entityType: string;
  entityId: string;
  clientId?: string;
  type?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
  createdBy?: string;
}

@injectable()
export class UploadDocument {
  constructor(
    @inject('StorageProvider') private storage: StorageProvider,
    @inject('DocumentRepository') private docRepo: DocumentRepository,
  ) {}

  async execute(dto: UploadDocumentDTO) {
    const storageKey = `${dto.organizationId}/${dto.entityType}/${dto.entityId}/${randomUUID()}-${dto.fileName}`;

    await this.storage.upload(storageKey, dto.buffer, dto.mimeType);

    return this.docRepo.create({
      organizationId: dto.organizationId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      clientId: dto.clientId ?? null,
      type: dto.type ?? 'OTHER',
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      storageKey,
      url: null,
      createdBy: dto.createdBy ?? null,
    });
  }
}
```

- [ ] **Step 4: Create delete-document (also deletes from R2)**

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/modules/document/
git commit -m "feat: add document module with R2 storage provider and presigned URLs"
```

---

## Task 3: Claim Module

- [ ] **Step 1: Create domain (repository interface, errors)**
- [ ] **Step 2: Create use cases (create, update-status, list, get)**

`update-claim-status.ts` validates transitions:

```ts
const VALID_TRANSITIONS: Record<string, string[]> = {
  REGISTERED: ['IN_ANALYSIS'],
  IN_ANALYSIS: ['AWAITING_DOCUMENT', 'PENDING_INSPECTION', 'APPROVED', 'REJECTED'],
  AWAITING_DOCUMENT: ['IN_ANALYSIS'],
  PENDING_INSPECTION: ['APPROVED', 'REJECTED'],
  APPROVED: ['PAID'],
  REJECTED: [],
  PAID: ['COMPLETED'],
  COMPLETED: [],
};
```

- [ ] **Step 3: Create infrastructure (prisma repository)**
- [ ] **Step 4: Commit**

```bash
git add packages/core/src/modules/claim/
git commit -m "feat: add claim module with status workflow validation"
```

---

## Task 4: Endorsement, Assistance, Occurrence Modules

- [ ] **Step 1: Create endorsement module (create, list, get)**
- [ ] **Step 2: Create assistance module (create, update-status, list, get)**

Assistance valid transitions:

```ts
const VALID_TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ['AWAITING_DOCUMENT', 'DISPATCHED'],
  AWAITING_DOCUMENT: ['PENDING_INSPECTION'],
  PENDING_INSPECTION: ['DISPATCHED'],
  DISPATCHED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
};
```

- [ ] **Step 3: Create occurrence module (create, list by claim)**
- [ ] **Step 4: Commit**

```bash
git add packages/core/src/modules/endorsement/ packages/core/src/modules/assistance/ packages/core/src/modules/occurrence/
git commit -m "feat: add endorsement, assistance, occurrence modules"
```

---

## Task 5: Server Routes for All Insurance Operations

- [ ] **Step 1: Create routes, handlers, schemas for claims**

Routes:

- `POST /api/v1/claims` - create
- `GET /api/v1/claims` - list
- `GET /api/v1/claims/:id` - get
- `PATCH /api/v1/claims/:id/status` - update status
- `POST /api/v1/claims/:id/occurrences` - add occurrence
- `GET /api/v1/claims/:id/occurrences` - list occurrences

- [ ] **Step 2: Create routes for endorsements, assistances, documents**

Document routes:

- `POST /api/v1/documents/upload` - multipart upload
- `GET /api/v1/documents` - list by entity
- `GET /api/v1/documents/:id/url` - get presigned URL
- `DELETE /api/v1/documents/:id` - delete

- [ ] **Step 3: Register all routes in app.ts**
- [ ] **Step 4: Register repositories in DI container**
- [ ] **Step 5: Commit**

```bash
git add apps/server/
git commit -m "feat: add API routes for claims, endorsements, assistances, documents"
```

---

## Task 6: Frontend - Claims Pages

- [ ] **Step 1: Create claims feature structure**
- [ ] **Step 2: Create claim-status-badge component with priority colors**
- [ ] **Step 3: Create claims-table with filters (status, priority)**
- [ ] **Step 4: Create claim-form**
- [ ] **Step 5: Create claim-detail with status update actions**
- [ ] **Step 6: Create occurrence-list and occurrence-form (inline in claim detail)**
- [ ] **Step 7: Create pages**
- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/claims/ apps/web/src/app/\(dashboard\)/claims/
git commit -m "feat: add claims management pages with status workflow and occurrences"
```

---

## Task 7: Frontend - Document Components (Reusable)

- [ ] **Step 1: Create document-upload component (drag-and-drop with file validation)**
- [ ] **Step 2: Create document-list component (shows files with presigned URL links)**
- [ ] **Step 3: Create document-viewer component (inline PDF/image preview)**
- [ ] **Step 4: Integrate into proposal-detail, policy-detail, claim-detail**
- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/documents/
git commit -m "feat: add reusable document upload, list, and viewer components"
```

---

## Task 8: Frontend - Endorsements and Assistances Pages

- [ ] **Step 1: Create endorsement pages (list within policy detail, create modal)**
- [ ] **Step 2: Create assistance pages (list, create, detail with map/location)**
- [ ] **Step 3: Commit**

```bash
git add apps/web/
git commit -m "feat: add endorsement and assistance management pages"
```

---

## Task 9: Validate and Quality Gates

- [ ] **Step 1: Run all quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

- [ ] **Step 2: Test all API endpoints**
- [ ] **Step 3: Verify document upload/download with R2**
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete insurance operations (claims, endorsements, assistances, documents)"
```
