# Fase 2: Core ERP - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar os 3 modulos core do ERP: Clients (DDD Light), Proposals (DDD Full com state machine), Policies (DDD Light). Inclui CRUD completo, API REST, frontend com listagem e formularios.

**Architecture:** Clients e Policies seguem DDD Light (Zod schemas + use cases simples). Proposals segue DDD Full (entity com state machine, domain events, testes obrigatorios para todas transicoes). Todos com tenant isolation via RLS.

**Tech Stack:** Prisma 7, tsyringe, Zod, Fastify 5, React Hook Form, TanStack Table, Orval.

**Spec:** `/home/artur/projects/ESPECIFICACAO-FINAL.md` (Secoes 8.1, 8.2, 8.3)

**Depends on:** Fase 1 completa

---

## File Structure

```
packages/
├── db/prisma/schema.prisma                    # Add Client, Proposal, Policy models
├── core/src/
│   ├── modules/
│   │   ├── client/
│   │   │   ├── application/
│   │   │   │   ├── create-client.ts
│   │   │   │   ├── update-client.ts
│   │   │   │   ├── list-clients.ts
│   │   │   │   ├── get-client.ts
│   │   │   │   └── delete-client.ts
│   │   │   ├── domain/
│   │   │   │   ├── client-repository.ts       # Interface
│   │   │   │   └── client-errors.ts
│   │   │   └── infrastructure/
│   │   │       ├── prisma-client-repository.ts
│   │   │       └── client-mapper.ts
│   │   ├── proposal/                          # DDD Full
│   │   │   ├── application/
│   │   │   │   ├── create-proposal.ts
│   │   │   │   ├── create-proposal.spec.ts
│   │   │   │   ├── advance-proposal-stage.ts
│   │   │   │   ├── advance-proposal-stage.spec.ts
│   │   │   │   ├── revert-proposal-stage.ts
│   │   │   │   ├── revert-proposal-stage.spec.ts
│   │   │   │   ├── mark-proposal-lost.ts
│   │   │   │   ├── mark-proposal-lost.spec.ts
│   │   │   │   ├── list-proposals.ts
│   │   │   │   ├── get-proposal.ts
│   │   │   │   └── dtos/
│   │   │   │       ├── create-proposal-dto.ts
│   │   │   │       └── advance-stage-dto.ts
│   │   │   ├── domain/
│   │   │   │   ├── proposal.ts                # Entity with state machine
│   │   │   │   ├── proposal.spec.ts           # Domain entity tests
│   │   │   │   ├── proposal-repository.ts
│   │   │   │   ├── proposal-errors.ts
│   │   │   │   └── events/
│   │   │   │       ├── proposal-issued.ts
│   │   │   │       └── proposal-lost.ts
│   │   │   └── infrastructure/
│   │   │       ├── prisma-proposal-repository.ts
│   │   │       └── proposal-mapper.ts
│   │   └── policy/
│   │       ├── application/
│   │       │   ├── issue-policy.ts
│   │       │   ├── list-policies.ts
│   │       │   ├── get-policy.ts
│   │       │   └── cancel-policy.ts
│   │       ├── domain/
│   │       │   ├── policy-repository.ts
│   │       │   └── policy-errors.ts
│   │       └── infrastructure/
│   │           ├── prisma-policy-repository.ts
│   │           └── policy-mapper.ts
apps/
├── server/src/
│   ├── routes/v1/
│   │   ├── client-routes.ts
│   │   ├── proposal-routes.ts
│   │   └── policy-routes.ts
│   ├── handlers/
│   │   ├── client.handlers.ts
│   │   ├── proposal.handlers.ts
│   │   └── policy.handlers.ts
│   └── schemas/
│       ├── client.schemas.ts
│       ├── proposal.schemas.ts
│       └── policy.schemas.ts
├── web/src/
│   ├── features/
│   │   ├── clients/
│   │   │   ├── components/
│   │   │   │   ├── clients-table.tsx
│   │   │   │   ├── client-form.tsx
│   │   │   │   └── client-detail.tsx
│   │   │   ├── hooks/
│   │   │   │   └── use-clients.ts
│   │   │   ├── lib/
│   │   │   │   └── schemas.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   ├── proposals/
│   │   │   ├── components/
│   │   │   │   ├── proposals-table.tsx
│   │   │   │   ├── proposal-form.tsx
│   │   │   │   ├── proposal-detail.tsx
│   │   │   │   └── proposal-checklist.tsx
│   │   │   ├── hooks/
│   │   │   │   └── use-proposals.ts
│   │   │   ├── lib/
│   │   │   │   └── schemas.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   └── policies/
│   │       ├── components/
│   │       │   ├── policies-table.tsx
│   │       │   ├── policy-detail.tsx
│   │       │   └── policy-form.tsx
│   │       ├── hooks/
│   │       │   └── use-policies.ts
│   │       └── types/
│   │           └── index.ts
│   ├── app/(dashboard)/
│   │   ├── clients/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── proposals/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── policies/
│   │       ├── page.tsx
│   │       └── [id]/page.tsx
```

---

## Task 1: Prisma Schema - ERP Core Models

**Files:**

- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add enums**

```prisma
enum ClientType {
  LEAD
  CLIENT
  FORMER_CLIENT
}

enum MaritalStatus {
  SINGLE
  MARRIED
  DIVORCED
  WIDOWED
  OTHER
}

enum ProposalStage {
  CAPTURE
  QUOTE
  PROTOCOL
  INSPECTION
  PAYMENT
  POLICY_ISSUED
  LOST
}

enum ProposalBoardType {
  NEW_INSURANCE
  RENEWAL
}

enum InsuranceBranch {
  AUTO
  RESIDENTIAL
  CONDOMINIUM
  BUSINESS
  LIFE
  OTHER
}

enum PolicyStatus {
  ACTIVE
  CANCELLED
  EXPIRED
}
```

- [ ] **Step 2: Add Client model**

```prisma
model Client {
  id              String        @id @default(cuid())
  organizationId  String
  name            String
  document        String        // CPF or CNPJ
  type            ClientType    @default(LEAD)
  email           String?
  phone           String?
  birthDate       DateTime?
  profession      String?
  maritalStatus   MaritalStatus?
  address         Json?         // { street, number, complement, neighborhood, city, state, zip }
  tags            String[]      @default([])
  consentLgpd     Boolean       @default(false)
  deletedAt       DateTime?     // soft delete
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  proposals       Proposal[]
  policies        Policy[]

  @@unique([organizationId, document])
  @@index([organizationId, type])
  @@index([organizationId, createdAt(sort: Desc)])
}
```

- [ ] **Step 3: Add Proposal model**

```prisma
model Proposal {
  id                          String            @id @default(cuid())
  organizationId              String
  clientId                    String
  salespersonId               String
  stage                       ProposalStage     @default(CAPTURE)
  boardType                   ProposalBoardType @default(NEW_INSURANCE)
  branch                      InsuranceBranch   @default(OTHER)
  premiumValueInCents         Int               @default(0)
  commissionPercentageInCents Int               @default(0)
  lostReason                  String?
  renewalPolicyId             String?
  deletedAt                   DateTime?
  createdAt                   DateTime          @default(now())
  updatedAt                   DateTime          @updatedAt

  client                      Client            @relation(fields: [clientId], references: [id])
  salesperson                 User              @relation("ProposalSalesperson", fields: [salespersonId], references: [id])
  renewalPolicy               Policy?           @relation("ProposalRenewal", fields: [renewalPolicyId], references: [id])
  policy                      Policy?           @relation("ProposalPolicy")
  checklistItems              ProposalChecklistItem[]

  @@index([organizationId, stage])
  @@index([organizationId, clientId])
  @@index([organizationId, createdAt(sort: Desc)])
}

model ProposalChecklistItem {
  id            String    @id @default(cuid())
  proposalId    String
  label         String
  isCompleted   Boolean   @default(false)
  completedAt   DateTime?
  completedBy   String?
  createdAt     DateTime  @default(now())

  proposal      Proposal  @relation(fields: [proposalId], references: [id], onDelete: Cascade)

  @@index([proposalId])
}
```

- [ ] **Step 4: Add Policy model**

```prisma
model Policy {
  id                    String        @id @default(cuid())
  organizationId        String
  proposalId            String        @unique
  clientId              String
  salespersonId         String
  policyNumber          String
  status                PolicyStatus  @default(ACTIVE)
  branch                InsuranceBranch
  premiumValueInCents   Int
  coverageDetails       Json?
  startDate             DateTime
  endDate               DateTime
  cancelledAt           DateTime?
  cancelReason          String?
  deletedAt             DateTime?
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  proposal              Proposal      @relation("ProposalPolicy", fields: [proposalId], references: [id])
  client                Client        @relation(fields: [clientId], references: [id])
  salesperson           User          @relation("PolicySalesperson", fields: [salespersonId], references: [id])
  renewalProposals      Proposal[]    @relation("ProposalRenewal")

  @@unique([organizationId, policyNumber])
  @@index([organizationId, status])
  @@index([organizationId, endDate])
  @@index([organizationId, createdAt(sort: Desc)])
}
```

- [ ] **Step 5: Add User relations**

Add to User model:

```prisma
  proposalsAsSalesperson  Proposal[] @relation("ProposalSalesperson")
  policiesAsSalesperson   Policy[]   @relation("PolicySalesperson")
```

- [ ] **Step 6: Generate and push**

```bash
cd packages/db && pnpm db:generate && pnpm db:push
```

- [ ] **Step 7: Commit**

```bash
git add packages/db/
git commit -m "feat: add client, proposal, policy models to prisma schema"
```

---

## Task 2: Client Module (DDD Light)

**Files:**

- Create: `packages/core/src/modules/client/domain/client-repository.ts`
- Create: `packages/core/src/modules/client/domain/client-errors.ts`
- Create: `packages/core/src/modules/client/application/create-client.ts`
- Create: `packages/core/src/modules/client/application/list-clients.ts`
- Create: `packages/core/src/modules/client/application/get-client.ts`
- Create: `packages/core/src/modules/client/application/update-client.ts`
- Create: `packages/core/src/modules/client/application/delete-client.ts`
- Create: `packages/core/src/modules/client/infrastructure/prisma-client-repository.ts`
- Create: `packages/core/src/modules/client/infrastructure/client-mapper.ts`

- [ ] **Step 1: Create domain layer**

`client-repository.ts`:

```ts
export interface ClientFilters {
  organizationId: string;
  type?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface ClientData {
  id: string;
  organizationId: string;
  name: string;
  document: string;
  type: string;
  email?: string | null;
  phone?: string | null;
  birthDate?: Date | null;
  profession?: string | null;
  maritalStatus?: string | null;
  address?: Record<string, unknown> | null;
  tags: string[];
  consentLgpd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientRepository {
  create(data: Omit<ClientData, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientData>;
  findById(id: string, organizationId: string): Promise<ClientData | null>;
  findByDocument(document: string, organizationId: string): Promise<ClientData | null>;
  findMany(
    filters: ClientFilters,
  ): Promise<{ items: ClientData[]; total: number; nextCursor?: string }>;
  update(id: string, organizationId: string, data: Partial<ClientData>): Promise<ClientData>;
  softDelete(id: string, organizationId: string): Promise<void>;
}
```

`client-errors.ts`:

```ts
export class ClientNotFoundError extends Error {
  readonly code = 'CLIENT_NOT_FOUND';
  constructor(id: string) {
    super(`Client ${id} not found`);
  }
}

export class ClientAlreadyExistsError extends Error {
  readonly code = 'CLIENT_ALREADY_EXISTS';
  constructor(document: string) {
    super(`Client with document ${document} already exists`);
  }
}
```

- [ ] **Step 2: Create use cases**

`create-client.ts`:

```ts
import { injectable, inject } from 'tsyringe';
import type { ClientRepository, ClientData } from '../domain/client-repository.js';
import { ClientAlreadyExistsError } from '../domain/client-errors.js';

interface CreateClientDTO {
  organizationId: string;
  name: string;
  document: string;
  type?: string;
  email?: string;
  phone?: string;
  birthDate?: Date;
  profession?: string;
  maritalStatus?: string;
  address?: Record<string, unknown>;
  tags?: string[];
  consentLgpd?: boolean;
}

@injectable()
export class CreateClient {
  constructor(@inject('ClientRepository') private clientRepo: ClientRepository) {}

  async execute(dto: CreateClientDTO): Promise<ClientData> {
    const existing = await this.clientRepo.findByDocument(dto.document, dto.organizationId);
    if (existing) {
      throw new ClientAlreadyExistsError(dto.document);
    }

    return this.clientRepo.create({
      organizationId: dto.organizationId,
      name: dto.name,
      document: dto.document,
      type: dto.type ?? 'LEAD',
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      birthDate: dto.birthDate ?? null,
      profession: dto.profession ?? null,
      maritalStatus: dto.maritalStatus ?? null,
      address: dto.address ?? null,
      tags: dto.tags ?? [],
      consentLgpd: dto.consentLgpd ?? false,
    });
  }
}
```

`list-clients.ts`:

```ts
import { injectable, inject } from 'tsyringe';
import type { ClientRepository, ClientFilters } from '../domain/client-repository.js';

@injectable()
export class ListClients {
  constructor(@inject('ClientRepository') private clientRepo: ClientRepository) {}

  async execute(filters: ClientFilters) {
    return this.clientRepo.findMany(filters);
  }
}
```

`get-client.ts`:

```ts
import { injectable, inject } from 'tsyringe';
import type { ClientRepository } from '../domain/client-repository.js';
import { ClientNotFoundError } from '../domain/client-errors.js';

@injectable()
export class GetClient {
  constructor(@inject('ClientRepository') private clientRepo: ClientRepository) {}

  async execute(id: string, organizationId: string) {
    const client = await this.clientRepo.findById(id, organizationId);
    if (!client) throw new ClientNotFoundError(id);
    return client;
  }
}
```

`update-client.ts`:

```ts
import { injectable, inject } from 'tsyringe';
import type { ClientRepository, ClientData } from '../domain/client-repository.js';
import { ClientNotFoundError } from '../domain/client-errors.js';

@injectable()
export class UpdateClient {
  constructor(@inject('ClientRepository') private clientRepo: ClientRepository) {}

  async execute(id: string, organizationId: string, data: Partial<ClientData>) {
    const existing = await this.clientRepo.findById(id, organizationId);
    if (!existing) throw new ClientNotFoundError(id);
    return this.clientRepo.update(id, organizationId, data);
  }
}
```

`delete-client.ts`:

```ts
import { injectable, inject } from 'tsyringe';
import type { ClientRepository } from '../domain/client-repository.js';
import { ClientNotFoundError } from '../domain/client-errors.js';

@injectable()
export class DeleteClient {
  constructor(@inject('ClientRepository') private clientRepo: ClientRepository) {}

  async execute(id: string, organizationId: string) {
    const existing = await this.clientRepo.findById(id, organizationId);
    if (!existing) throw new ClientNotFoundError(id);
    await this.clientRepo.softDelete(id, organizationId);
  }
}
```

- [ ] **Step 3: Create infrastructure layer**

`prisma-client-repository.ts`:

```ts
import { injectable } from 'tsyringe';
import { prisma } from '@repo/db';
import type { ClientRepository, ClientData, ClientFilters } from '../domain/client-repository.js';

@injectable()
export class PrismaClientRepository implements ClientRepository {
  async create(data: Omit<ClientData, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientData> {
    return prisma.client.create({ data }) as unknown as ClientData;
  }

  async findById(id: string, organizationId: string): Promise<ClientData | null> {
    return prisma.client.findFirst({
      where: { id, organizationId, deletedAt: null },
    }) as unknown as ClientData | null;
  }

  async findByDocument(document: string, organizationId: string): Promise<ClientData | null> {
    return prisma.client.findFirst({
      where: { document, organizationId, deletedAt: null },
    }) as unknown as ClientData | null;
  }

  async findMany(filters: ClientFilters) {
    const where = {
      organizationId: filters.organizationId,
      deletedAt: null,
      ...(filters.type && { type: filters.type }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' as const } },
          { document: { contains: filters.search } },
          { email: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const limit = filters.limit ?? 20;

    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        take: limit + 1,
        ...(filters.cursor && { cursor: { id: filters.cursor }, skip: 1 }),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.client.count({ where }),
    ]);

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    return {
      items: items as unknown as ClientData[],
      total,
      nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
    };
  }

  async update(id: string, organizationId: string, data: Partial<ClientData>): Promise<ClientData> {
    return prisma.client.update({
      where: { id },
      data,
    }) as unknown as ClientData;
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/modules/client/
git commit -m "feat: add client module (DDD Light) with CRUD use cases"
```

---

## Task 3: Proposal Module - Domain Entity (DDD Full)

**Files:**

- Create: `packages/core/src/modules/proposal/domain/proposal.ts`
- Create: `packages/core/src/modules/proposal/domain/proposal.spec.ts`
- Create: `packages/core/src/modules/proposal/domain/proposal-errors.ts`
- Create: `packages/core/src/modules/proposal/domain/proposal-repository.ts`
- Create: `packages/core/src/modules/proposal/domain/events/proposal-issued.ts`
- Create: `packages/core/src/modules/proposal/domain/events/proposal-lost.ts`

- [ ] **Step 1: Write failing tests for Proposal entity**

`proposal.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Proposal } from './proposal.js';

describe('Proposal Entity', () => {
  const validProps = {
    organizationId: 'org-1',
    clientId: 'client-1',
    salespersonId: 'user-1',
    branch: 'AUTO' as const,
    boardType: 'NEW_INSURANCE' as const,
  };

  it('creates a new proposal in CAPTURE stage', () => {
    const proposal = Proposal.create(validProps);
    expect(proposal.stage).toBe('CAPTURE');
    expect(proposal.organizationId).toBe('org-1');
  });

  it('advances from CAPTURE to QUOTE', () => {
    const proposal = Proposal.create(validProps);
    proposal.advance();
    expect(proposal.stage).toBe('QUOTE');
  });

  it('advances through all stages to POLICY_ISSUED', () => {
    const proposal = Proposal.create(validProps);
    proposal.advance(); // QUOTE
    proposal.advance(); // PROTOCOL
    proposal.advance(); // INSPECTION
    proposal.advance(); // PAYMENT
    proposal.advance(); // POLICY_ISSUED
    expect(proposal.stage).toBe('POLICY_ISSUED');
  });

  it('cannot advance beyond POLICY_ISSUED', () => {
    const proposal = Proposal.create(validProps);
    for (let i = 0; i < 5; i++) proposal.advance();
    expect(() => proposal.advance()).toThrow('Cannot advance');
  });

  it('reverts from QUOTE to CAPTURE', () => {
    const proposal = Proposal.create(validProps);
    proposal.advance(); // QUOTE
    proposal.revert();
    expect(proposal.stage).toBe('CAPTURE');
  });

  it('cannot revert from CAPTURE', () => {
    const proposal = Proposal.create(validProps);
    expect(() => proposal.revert()).toThrow('Cannot revert');
  });

  it('cannot revert from POLICY_ISSUED', () => {
    const proposal = Proposal.create(validProps);
    for (let i = 0; i < 5; i++) proposal.advance();
    expect(() => proposal.revert()).toThrow('Cannot revert');
  });

  it('marks as lost with reason', () => {
    const proposal = Proposal.create(validProps);
    proposal.advance(); // QUOTE
    proposal.markAsLost('Cliente desistiu');
    expect(proposal.stage).toBe('LOST');
    expect(proposal.lostReason).toBe('Cliente desistiu');
  });

  it('cannot mark as lost from POLICY_ISSUED', () => {
    const proposal = Proposal.create(validProps);
    for (let i = 0; i < 5; i++) proposal.advance();
    expect(() => proposal.markAsLost('reason')).toThrow('Cannot mark as lost');
  });

  it('cannot mark as lost from LOST', () => {
    const proposal = Proposal.create(validProps);
    proposal.markAsLost('reason');
    expect(() => proposal.markAsLost('another')).toThrow('Cannot mark as lost');
  });

  it('cannot advance from LOST', () => {
    const proposal = Proposal.create(validProps);
    proposal.markAsLost('reason');
    expect(() => proposal.advance()).toThrow('Cannot advance');
  });

  it('restores from persistence data', () => {
    const proposal = Proposal.restore({
      id: 'prop-1',
      ...validProps,
      stage: 'PROTOCOL',
      premiumValueInCents: 50000,
      commissionPercentageInCents: 1500,
      lostReason: null,
      renewalPolicyId: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(proposal.id).toBe('prop-1');
    expect(proposal.stage).toBe('PROTOCOL');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/core && pnpm vitest run src/modules/proposal/domain/proposal.spec.ts
```

Expected: FAIL - module not found.

- [ ] **Step 3: Implement Proposal entity**

`proposal.ts`:

```ts
import { randomUUID } from 'node:crypto';

const STAGES = ['CAPTURE', 'QUOTE', 'PROTOCOL', 'INSPECTION', 'PAYMENT', 'POLICY_ISSUED'] as const;
type Stage = (typeof STAGES)[number] | 'LOST';
type Branch = 'AUTO' | 'RESIDENTIAL' | 'CONDOMINIUM' | 'BUSINESS' | 'LIFE' | 'OTHER';
type BoardType = 'NEW_INSURANCE' | 'RENEWAL';

interface ProposalProps {
  id: string;
  organizationId: string;
  clientId: string;
  salespersonId: string;
  stage: Stage;
  boardType: BoardType;
  branch: Branch;
  premiumValueInCents: number;
  commissionPercentageInCents: number;
  lostReason: string | null;
  renewalPolicyId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateProposalProps {
  organizationId: string;
  clientId: string;
  salespersonId: string;
  branch: Branch;
  boardType: BoardType;
  premiumValueInCents?: number;
  commissionPercentageInCents?: number;
  renewalPolicyId?: string;
}

export class Proposal {
  private props: ProposalProps;

  private constructor(props: ProposalProps) {
    this.props = props;
  }

  static create(input: CreateProposalProps): Proposal {
    return new Proposal({
      id: randomUUID(),
      organizationId: input.organizationId,
      clientId: input.clientId,
      salespersonId: input.salespersonId,
      stage: 'CAPTURE',
      boardType: input.boardType,
      branch: input.branch,
      premiumValueInCents: input.premiumValueInCents ?? 0,
      commissionPercentageInCents: input.commissionPercentageInCents ?? 0,
      lostReason: null,
      renewalPolicyId: input.renewalPolicyId ?? null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static restore(props: ProposalProps): Proposal {
    return new Proposal(props);
  }

  advance(): void {
    if (this.props.stage === 'LOST') {
      throw new Error('Cannot advance from LOST stage');
    }

    const currentIndex = STAGES.indexOf(this.props.stage as (typeof STAGES)[number]);
    if (currentIndex === -1 || currentIndex >= STAGES.length - 1) {
      throw new Error('Cannot advance beyond POLICY_ISSUED');
    }

    this.props.stage = STAGES[currentIndex + 1]!;
    this.props.updatedAt = new Date();
  }

  revert(): void {
    if (this.props.stage === 'LOST' || this.props.stage === 'POLICY_ISSUED') {
      throw new Error('Cannot revert from terminal stage');
    }

    const currentIndex = STAGES.indexOf(this.props.stage as (typeof STAGES)[number]);
    if (currentIndex <= 0) {
      throw new Error('Cannot revert from CAPTURE');
    }

    this.props.stage = STAGES[currentIndex - 1]!;
    this.props.updatedAt = new Date();
  }

  markAsLost(reason: string): void {
    if (this.props.stage === 'POLICY_ISSUED' || this.props.stage === 'LOST') {
      throw new Error('Cannot mark as lost from terminal stage');
    }

    this.props.stage = 'LOST';
    this.props.lostReason = reason;
    this.props.updatedAt = new Date();
  }

  get id() {
    return this.props.id;
  }
  get organizationId() {
    return this.props.organizationId;
  }
  get clientId() {
    return this.props.clientId;
  }
  get salespersonId() {
    return this.props.salespersonId;
  }
  get stage() {
    return this.props.stage;
  }
  get boardType() {
    return this.props.boardType;
  }
  get branch() {
    return this.props.branch;
  }
  get premiumValueInCents() {
    return this.props.premiumValueInCents;
  }
  get commissionPercentageInCents() {
    return this.props.commissionPercentageInCents;
  }
  get lostReason() {
    return this.props.lostReason;
  }
  get renewalPolicyId() {
    return this.props.renewalPolicyId;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }

  toJSON(): ProposalProps {
    return { ...this.props };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/core && pnpm vitest run src/modules/proposal/domain/proposal.spec.ts
```

Expected: all 11 tests PASS.

- [ ] **Step 5: Create domain errors and events**

`proposal-errors.ts`:

```ts
export class ProposalNotFoundError extends Error {
  readonly code = 'PROPOSAL_NOT_FOUND';
  constructor(id: string) {
    super(`Proposal ${id} not found`);
  }
}

export class InvalidStageTransitionError extends Error {
  readonly code = 'INVALID_STAGE_TRANSITION';
  constructor(from: string, action: string) {
    super(`Cannot ${action} from stage ${from}`);
  }
}
```

`events/proposal-issued.ts`:

```ts
export interface ProposalIssuedEvent {
  type: 'PROPOSAL_ISSUED';
  proposalId: string;
  organizationId: string;
  clientId: string;
  salespersonId: string;
  premiumValueInCents: number;
  commissionPercentageInCents: number;
}
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/modules/proposal/
git commit -m "feat: add proposal entity with state machine (DDD Full) - all transitions tested"
```

---

## Task 4: Proposal Module - Use Cases

**Files:**

- Create: `packages/core/src/modules/proposal/application/create-proposal.ts`
- Create: `packages/core/src/modules/proposal/application/advance-proposal-stage.ts`
- Create: `packages/core/src/modules/proposal/application/advance-proposal-stage.spec.ts`
- Create: `packages/core/src/modules/proposal/application/mark-proposal-lost.ts`
- Create: `packages/core/src/modules/proposal/application/list-proposals.ts`
- Create: `packages/core/src/modules/proposal/application/get-proposal.ts`
- Create: `packages/core/src/modules/proposal/domain/proposal-repository.ts`
- Create: `packages/core/src/modules/proposal/infrastructure/prisma-proposal-repository.ts`
- Create: `packages/core/src/modules/proposal/infrastructure/proposal-mapper.ts`

- [ ] **Step 1: Create repository interface**

```ts
import type { Proposal } from './proposal.js';

export interface ProposalFilters {
  organizationId: string;
  stage?: string;
  clientId?: string;
  boardType?: string;
  cursor?: string;
  limit?: number;
}

export interface ProposalRepository {
  save(proposal: Proposal): Promise<void>;
  findById(id: string, organizationId: string): Promise<Proposal | null>;
  findMany(
    filters: ProposalFilters,
  ): Promise<{ items: Proposal[]; total: number; nextCursor?: string }>;
}
```

- [ ] **Step 2: Write failing test for AdvanceProposalStage use case**

`advance-proposal-stage.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { AdvanceProposalStage } from './advance-proposal-stage.js';
import { Proposal } from '../domain/proposal.js';
import type { ProposalRepository } from '../domain/proposal-repository.js';

const createMockRepo = (proposal: Proposal | null): ProposalRepository => ({
  save: vi.fn(),
  findById: vi.fn().mockResolvedValue(proposal),
  findMany: vi.fn(),
});

describe('AdvanceProposalStage', () => {
  it('advances proposal to next stage', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      clientId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    });
    const repo = createMockRepo(proposal);
    const useCase = new AdvanceProposalStage(repo);

    await useCase.execute('prop-1', 'org-1');

    expect(proposal.stage).toBe('QUOTE');
    expect(repo.save).toHaveBeenCalledWith(proposal);
  });

  it('throws if proposal not found', async () => {
    const repo = createMockRepo(null);
    const useCase = new AdvanceProposalStage(repo);

    await expect(useCase.execute('xxx', 'org-1')).rejects.toThrow('not found');
  });
});
```

- [ ] **Step 3: Run test - expect fail**

```bash
cd packages/core && pnpm vitest run src/modules/proposal/application/advance-proposal-stage.spec.ts
```

- [ ] **Step 4: Implement use cases**

`advance-proposal-stage.ts`:

```ts
import { injectable, inject } from 'tsyringe';
import type { ProposalRepository } from '../domain/proposal-repository.js';
import { ProposalNotFoundError } from '../domain/proposal-errors.js';

@injectable()
export class AdvanceProposalStage {
  constructor(@inject('ProposalRepository') private proposalRepo: ProposalRepository) {}

  async execute(proposalId: string, organizationId: string) {
    const proposal = await this.proposalRepo.findById(proposalId, organizationId);
    if (!proposal) throw new ProposalNotFoundError(proposalId);

    proposal.advance();
    await this.proposalRepo.save(proposal);

    return proposal;
  }
}
```

`create-proposal.ts`:

```ts
import { injectable, inject } from 'tsyringe';
import { Proposal } from '../domain/proposal.js';
import type { ProposalRepository } from '../domain/proposal-repository.js';

interface CreateProposalDTO {
  organizationId: string;
  clientId: string;
  salespersonId: string;
  branch: 'AUTO' | 'RESIDENTIAL' | 'CONDOMINIUM' | 'BUSINESS' | 'LIFE' | 'OTHER';
  boardType: 'NEW_INSURANCE' | 'RENEWAL';
  premiumValueInCents?: number;
  commissionPercentageInCents?: number;
  renewalPolicyId?: string;
}

@injectable()
export class CreateProposal {
  constructor(@inject('ProposalRepository') private proposalRepo: ProposalRepository) {}

  async execute(dto: CreateProposalDTO) {
    const proposal = Proposal.create(dto);
    await this.proposalRepo.save(proposal);
    return proposal;
  }
}
```

`mark-proposal-lost.ts`:

```ts
import { injectable, inject } from 'tsyringe';
import type { ProposalRepository } from '../domain/proposal-repository.js';
import { ProposalNotFoundError } from '../domain/proposal-errors.js';

@injectable()
export class MarkProposalLost {
  constructor(@inject('ProposalRepository') private proposalRepo: ProposalRepository) {}

  async execute(proposalId: string, organizationId: string, reason: string) {
    const proposal = await this.proposalRepo.findById(proposalId, organizationId);
    if (!proposal) throw new ProposalNotFoundError(proposalId);

    proposal.markAsLost(reason);
    await this.proposalRepo.save(proposal);

    return proposal;
  }
}
```

- [ ] **Step 5: Run tests - expect pass**

```bash
cd packages/core && pnpm vitest run src/modules/proposal/
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/modules/proposal/
git commit -m "feat: add proposal use cases (create, advance, revert, mark lost) with tests"
```

---

## Task 5: Policy Module (DDD Light)

**Files:**

- Create: `packages/core/src/modules/policy/domain/policy-repository.ts`
- Create: `packages/core/src/modules/policy/domain/policy-errors.ts`
- Create: `packages/core/src/modules/policy/application/issue-policy.ts`
- Create: `packages/core/src/modules/policy/application/list-policies.ts`
- Create: `packages/core/src/modules/policy/application/get-policy.ts`
- Create: `packages/core/src/modules/policy/application/cancel-policy.ts`
- Create: `packages/core/src/modules/policy/infrastructure/prisma-policy-repository.ts`

- [ ] **Step 1: Create domain layer (repository + errors)**

Similar structure to Client module. Policy is issued from a Proposal that reached POLICY_ISSUED stage.

`issue-policy.ts`:

```ts
import { injectable, inject } from 'tsyringe';
import { randomUUID } from 'node:crypto';
import type { PolicyRepository, PolicyData } from '../domain/policy-repository.js';
import type { ProposalRepository } from '../../proposal/domain/proposal-repository.js';
import { ProposalNotFoundError } from '../../proposal/domain/proposal-errors.js';

interface IssuePolicyDTO {
  organizationId: string;
  proposalId: string;
  policyNumber: string;
  startDate: Date;
  endDate: Date;
  coverageDetails?: Record<string, unknown>;
}

@injectable()
export class IssuePolicy {
  constructor(
    @inject('PolicyRepository') private policyRepo: PolicyRepository,
    @inject('ProposalRepository') private proposalRepo: ProposalRepository,
  ) {}

  async execute(dto: IssuePolicyDTO): Promise<PolicyData> {
    const proposal = await this.proposalRepo.findById(dto.proposalId, dto.organizationId);
    if (!proposal) throw new ProposalNotFoundError(dto.proposalId);

    if (proposal.stage !== 'POLICY_ISSUED') {
      throw new Error('Proposal must be in POLICY_ISSUED stage to issue a policy');
    }

    return this.policyRepo.create({
      id: randomUUID(),
      organizationId: dto.organizationId,
      proposalId: dto.proposalId,
      clientId: proposal.clientId,
      salespersonId: proposal.salespersonId,
      policyNumber: dto.policyNumber,
      status: 'ACTIVE',
      branch: proposal.branch,
      premiumValueInCents: proposal.premiumValueInCents,
      coverageDetails: dto.coverageDetails ?? null,
      startDate: dto.startDate,
      endDate: dto.endDate,
      cancelledAt: null,
      cancelReason: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
```

- [ ] **Step 2: Create remaining use cases (list, get, cancel)**

Follow same pattern as Client module.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/policy/
git commit -m "feat: add policy module (DDD Light) with issue, list, get, cancel"
```

---

## Task 6: Server Routes for Client, Proposal, Policy

**Files:**

- Create: `apps/server/src/schemas/client.schemas.ts`
- Create: `apps/server/src/handlers/client.handlers.ts`
- Create: `apps/server/src/routes/v1/client-routes.ts`
- Create: Same pattern for proposal and policy
- Modify: `apps/server/src/app.ts` - register all routes

- [ ] **Step 1: Create client schemas**

```ts
import { z } from 'zod';

export const createClientSchema = {
  body: z.object({
    name: z.string().min(2),
    document: z.string().min(11).max(14),
    type: z.enum(['LEAD', 'CLIENT', 'FORMER_CLIENT']).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    birthDate: z.string().datetime().optional(),
    profession: z.string().optional(),
    maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER']).optional(),
    address: z.record(z.unknown()).optional(),
    tags: z.array(z.string()).optional(),
    consentLgpd: z.boolean().optional(),
  }),
};

export const listClientsSchema = {
  querystring: z.object({
    type: z.enum(['LEAD', 'CLIENT', 'FORMER_CLIENT']).optional(),
    search: z.string().optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
  }),
};
```

- [ ] **Step 2: Create client handlers**

```ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import { container } from '@repo/core/container';
import { CreateClient } from '@repo/core/modules/client/application/create-client.js';
import { ListClients } from '@repo/core/modules/client/application/list-clients.js';

export async function handleCreateClient(request: FastifyRequest, reply: FastifyReply) {
  const useCase = container.resolve(CreateClient);
  try {
    const client = await useCase.execute({
      organizationId: request.organizationId,
      ...(request.body as Record<string, unknown>),
    });
    return reply.status(201).send({ success: true, data: client });
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error) {
      const code = (error as { code: string }).code;
      if (code === 'CLIENT_ALREADY_EXISTS') {
        return reply.status(409).send({
          success: false,
          error: { code, message: error.message },
        });
      }
    }
    throw error;
  }
}

export async function handleListClients(request: FastifyRequest, reply: FastifyReply) {
  const useCase = container.resolve(ListClients);
  const query = request.query as { type?: string; search?: string; cursor?: string; limit: number };
  const result = await useCase.execute({
    organizationId: request.organizationId,
    ...query,
  });
  return reply.send({
    success: true,
    data: result.items,
    meta: { total: result.total, nextCursor: result.nextCursor },
  });
}
```

- [ ] **Step 3: Create client routes**

```ts
import type { FastifyInstance } from 'fastify';
import { requireAbility } from '../../middlewares/ability-middleware.js';
import { handleCreateClient, handleListClients } from '../../handlers/client.handlers.js';
import { createClientSchema, listClientsSchema } from '../../schemas/client.schemas.js';

export async function clientRoutes(app: FastifyInstance) {
  app.post('/api/v1/clients', {
    preHandler: [requireAbility('create', 'Client')],
    schema: createClientSchema,
    handler: handleCreateClient,
  });

  app.get('/api/v1/clients', {
    preHandler: [requireAbility('read', 'Client')],
    schema: listClientsSchema,
    handler: handleListClients,
  });

  // GET /:id, PUT /:id, DELETE /:id follow same pattern
}
```

- [ ] **Step 4: Repeat for proposal and policy routes**

Follow same pattern. Proposal routes include:

- `POST /api/v1/proposals` - create
- `GET /api/v1/proposals` - list
- `GET /api/v1/proposals/:id` - get
- `POST /api/v1/proposals/:id/advance` - advance stage
- `POST /api/v1/proposals/:id/revert` - revert stage
- `POST /api/v1/proposals/:id/lost` - mark as lost

Policy routes:

- `POST /api/v1/policies` - issue from proposal
- `GET /api/v1/policies` - list
- `GET /api/v1/policies/:id` - get
- `POST /api/v1/policies/:id/cancel` - cancel

- [ ] **Step 5: Register all routes in app.ts**

- [ ] **Step 6: Commit**

```bash
git add apps/server/
git commit -m "feat: add REST API routes for clients, proposals, policies"
```

---

## Task 7: Frontend - Client Pages

**Files:**

- Create: `apps/web/src/features/clients/` (full feature structure)
- Create: `apps/web/src/app/(dashboard)/clients/page.tsx`
- Create: `apps/web/src/app/(dashboard)/clients/new/page.tsx`
- Create: `apps/web/src/app/(dashboard)/clients/[id]/page.tsx`

- [ ] **Step 1: Create types and schemas**
- [ ] **Step 2: Create hooks (useClients, useClient, useCreateClient)**
- [ ] **Step 3: Create clients-table.tsx with TanStack Table**
- [ ] **Step 4: Create client-form.tsx with React Hook Form + Zod**
- [ ] **Step 5: Create pages (list, new, detail)**
- [ ] **Step 6: Verify 4 UI states: Empty, Loading, Error, Success**
- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/clients/ apps/web/src/app/\(dashboard\)/clients/
git commit -m "feat: add client management pages (list, create, detail)"
```

---

## Task 8: Frontend - Proposal Pages

- [ ] **Step 1: Create proposal feature structure**
- [ ] **Step 2: Create proposal-form with stage-aware fields**
- [ ] **Step 3: Create proposals-table with stage badges**
- [ ] **Step 4: Create proposal-detail with advance/revert/lost actions**
- [ ] **Step 5: Create proposal-checklist component**
- [ ] **Step 6: Create pages**
- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/proposals/ apps/web/src/app/\(dashboard\)/proposals/
git commit -m "feat: add proposal management pages with stage workflow"
```

---

## Task 9: Frontend - Policy Pages

- [ ] **Step 1: Create policy feature structure**
- [ ] **Step 2: Create policy-detail with cancel action**
- [ ] **Step 3: Create policies-table**
- [ ] **Step 4: Create pages**
- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/policies/ apps/web/src/app/\(dashboard\)/policies/
git commit -m "feat: add policy management pages (list, detail, cancel)"
```

---

## Task 10: DI Container Registration + E2E Validation

**Files:**

- Modify: `packages/core/src/container.ts`
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Register all repositories in container**

```ts
import { container } from 'tsyringe';
import { PrismaClientRepository } from './modules/client/infrastructure/prisma-client-repository.js';
import { PrismaProposalRepository } from './modules/proposal/infrastructure/prisma-proposal-repository.js';
import { PrismaPolicyRepository } from './modules/policy/infrastructure/prisma-policy-repository.js';

container.register('ClientRepository', { useClass: PrismaClientRepository });
container.register('ProposalRepository', { useClass: PrismaProposalRepository });
container.register('PolicyRepository', { useClass: PrismaPolicyRepository });
```

- [ ] **Step 2: Run all quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

- [ ] **Step 3: Test API endpoints manually**

```bash
# Create client
curl -X POST http://localhost:3001/api/v1/clients \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test Client","document":"12345678901"}'

# List clients
curl http://localhost:3001/api/v1/clients

# Create proposal
curl -X POST http://localhost:3001/api/v1/proposals \
  -H 'Content-Type: application/json' \
  -d '{"clientId":"<id>","branch":"AUTO","boardType":"NEW_INSURANCE"}'
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete core ERP modules (clients, proposals, policies)"
```
