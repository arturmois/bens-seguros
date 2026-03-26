# H4 — Test Coverage (Business-Critical First) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add unit tests for 23 high/medium risk use cases, bringing coverage from 23% to 56%.

**Architecture:** Each test file lives next to its use case. Tests follow existing Arrange-Act-Assert pattern with `vi.fn()` mocks. No shared test utilities — factories are local to each file (matches project convention).

**Tech Stack:** Vitest, vi.fn() mocks, TypeScript

**Run commands:**

- Single package: `cd packages/core && pnpm vitest run`
- Chat server: `cd apps/chat-server && pnpm vitest run`
- All: `pnpm test` (from root)

---

## File Structure

All files are **new test files** — no production code changes.

**packages/core/src/modules/claim/application/**

- Create: `update-claim-status.spec.ts`

**packages/core/src/modules/assistance/application/**

- Create: `update-assistance-status.spec.ts`

**apps/chat-server/src/application/**

- Create: `close-conversation.spec.ts`
- Create: `transfer-conversation.spec.ts`
- Create: `return-to-queue.spec.ts`
- Create: `return-to-bot.spec.ts`

**packages/core/src/modules/proposal/application/**

- Create: `mark-proposal-lost.spec.ts`
- Create: `create-proposal.spec.ts`
- Create: `complete-checklist-by-attachment.spec.ts`

**packages/core/src/modules/commission/application/**

- Create: `on-policy-issued.spec.ts`
- Create: `pay-commission.spec.ts`
- Create: `create-commission.spec.ts`

**packages/core/src/modules/policy/application/**

- Create: `cancel-policy.spec.ts`
- Create: `parse-policy-import.spec.ts`

**packages/core/src/modules/client/application/**

- Create: `parse-client-import.spec.ts`

**packages/core/src/modules/document/application/**

- Create: `upload-document.spec.ts`
- Create: `delete-document.spec.ts`

**packages/core/src/modules/insurer/application/**

- Create: `create-insurer.spec.ts`

**packages/core/src/modules/notification/application/**

- Create: `mark-as-read.spec.ts`
- Create: `count-alerts-by-entity-type.spec.ts`
- Create: `count-unread-notifications.spec.ts`
- Create: `create-notification.spec.ts`

---

## Task 1: Claim — UpdateClaimStatus (Tier 1)

**Files:**

- Create: `packages/core/src/modules/claim/application/update-claim-status.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/core/src/modules/claim/application/update-claim-status.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type {
  ClaimData,
  ClaimRepository,
  ClaimStatus,
} from '../domain/claim-repository.js'
import {
  ClaimNotFoundError,
  InvalidClaimStatusTransitionError,
} from '../domain/claim-errors.js'
import { UpdateClaimStatus } from './update-claim-status.js'

function makeClaimData(overrides: Partial<ClaimData> = {}): ClaimData {
  return {
    id: 'claim-1',
    organizationId: 'org-1',
    claimNumber: 1,
    policyId: 'pol-1',
    clientId: 'c-1',
    insurerId: null,
    assignedToId: null,
    status: 'REGISTERED',
    priority: 'NORMAL',
    description: 'Vehicle collision',
    incidentDate: new Date('2024-06-15'),
    incidentLocation: 'BR-101 km 42',
    reportedAt: new Date(),
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockRepo(data: ClaimData | null): ClaimRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(data),
    findMany: vi.fn(),
    updateStatus: vi.fn().mockImplementation(async (_id, _orgId, input) => ({
      ...makeClaimData(),
      ...input,
    })),
    softDelete: vi.fn(),
  }
}

describe('UpdateClaimStatus', () => {
  // Valid transitions
  it('transitions REGISTERED to IN_ANALYSIS', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'REGISTERED' }))
    const useCase = new UpdateClaimStatus(repo)

    await useCase.execute('claim-1', 'org-1', 'IN_ANALYSIS')

    expect(repo.updateStatus).toHaveBeenCalledWith('claim-1', 'org-1', {
      status: 'IN_ANALYSIS',
      resolvedAt: undefined,
      closedAt: undefined,
    })
  })

  it('transitions IN_ANALYSIS to AWAITING_DOCUMENT', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'IN_ANALYSIS' }))
    const useCase = new UpdateClaimStatus(repo)

    await useCase.execute('claim-1', 'org-1', 'AWAITING_DOCUMENT')

    expect(repo.updateStatus).toHaveBeenCalledWith('claim-1', 'org-1', {
      status: 'AWAITING_DOCUMENT',
      resolvedAt: undefined,
      closedAt: undefined,
    })
  })

  it('transitions IN_ANALYSIS to PENDING_INSPECTION', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'IN_ANALYSIS' }))
    const useCase = new UpdateClaimStatus(repo)

    await useCase.execute('claim-1', 'org-1', 'PENDING_INSPECTION')

    expect(repo.updateStatus).toHaveBeenCalledWith('claim-1', 'org-1', {
      status: 'PENDING_INSPECTION',
      resolvedAt: undefined,
      closedAt: undefined,
    })
  })

  it('transitions IN_ANALYSIS to APPROVED and sets resolvedAt', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'IN_ANALYSIS' }))
    const useCase = new UpdateClaimStatus(repo)

    await useCase.execute('claim-1', 'org-1', 'APPROVED')

    expect(repo.updateStatus).toHaveBeenCalledWith('claim-1', 'org-1', {
      status: 'APPROVED',
      resolvedAt: expect.any(Date),
      closedAt: undefined,
    })
  })

  it('transitions IN_ANALYSIS to REJECTED and sets resolvedAt', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'IN_ANALYSIS' }))
    const useCase = new UpdateClaimStatus(repo)

    await useCase.execute('claim-1', 'org-1', 'REJECTED')

    expect(repo.updateStatus).toHaveBeenCalledWith('claim-1', 'org-1', {
      status: 'REJECTED',
      resolvedAt: expect.any(Date),
      closedAt: undefined,
    })
  })

  it('transitions AWAITING_DOCUMENT back to IN_ANALYSIS', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'AWAITING_DOCUMENT' }))
    const useCase = new UpdateClaimStatus(repo)

    await useCase.execute('claim-1', 'org-1', 'IN_ANALYSIS')

    expect(repo.updateStatus).toHaveBeenCalledWith('claim-1', 'org-1', {
      status: 'IN_ANALYSIS',
      resolvedAt: undefined,
      closedAt: undefined,
    })
  })

  it('transitions PENDING_INSPECTION to APPROVED and sets resolvedAt', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'PENDING_INSPECTION' }))
    const useCase = new UpdateClaimStatus(repo)

    await useCase.execute('claim-1', 'org-1', 'APPROVED')

    expect(repo.updateStatus).toHaveBeenCalledWith('claim-1', 'org-1', {
      status: 'APPROVED',
      resolvedAt: expect.any(Date),
      closedAt: undefined,
    })
  })

  it('transitions APPROVED to PAID', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'APPROVED' }))
    const useCase = new UpdateClaimStatus(repo)

    await useCase.execute('claim-1', 'org-1', 'PAID')

    expect(repo.updateStatus).toHaveBeenCalledWith('claim-1', 'org-1', {
      status: 'PAID',
      resolvedAt: undefined,
      closedAt: undefined,
    })
  })

  it('transitions PAID to COMPLETED and sets closedAt', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'PAID' }))
    const useCase = new UpdateClaimStatus(repo)

    await useCase.execute('claim-1', 'org-1', 'COMPLETED')

    expect(repo.updateStatus).toHaveBeenCalledWith('claim-1', 'org-1', {
      status: 'COMPLETED',
      resolvedAt: undefined,
      closedAt: expect.any(Date),
    })
  })

  // Invalid transitions
  it('rejects REGISTERED to APPROVED', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'REGISTERED' }))
    const useCase = new UpdateClaimStatus(repo)

    await expect(
      useCase.execute('claim-1', 'org-1', 'APPROVED')
    ).rejects.toThrow(InvalidClaimStatusTransitionError)
  })

  it('rejects COMPLETED to any status', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'COMPLETED' }))
    const useCase = new UpdateClaimStatus(repo)

    await expect(
      useCase.execute('claim-1', 'org-1', 'IN_ANALYSIS')
    ).rejects.toThrow(InvalidClaimStatusTransitionError)
  })

  it('rejects REJECTED to any status', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'REJECTED' }))
    const useCase = new UpdateClaimStatus(repo)

    await expect(
      useCase.execute('claim-1', 'org-1', 'IN_ANALYSIS')
    ).rejects.toThrow(InvalidClaimStatusTransitionError)
  })

  // Not found
  it('throws ClaimNotFoundError when claim does not exist', async () => {
    const repo = createMockRepo(null)
    const useCase = new UpdateClaimStatus(repo)

    await expect(
      useCase.execute('missing', 'org-1', 'IN_ANALYSIS')
    ).rejects.toThrow(ClaimNotFoundError)
    expect(repo.updateStatus).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && pnpm vitest run src/modules/claim/application/update-claim-status.spec.ts`
Expected: All 13 tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/claim/application/update-claim-status.spec.ts
git commit -m "test(claim): add UpdateClaimStatus unit tests — all state transitions"
```

---

## Task 2: Assistance — UpdateAssistanceStatus (Tier 1)

**Files:**

- Create: `packages/core/src/modules/assistance/application/update-assistance-status.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/core/src/modules/assistance/application/update-assistance-status.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type {
  AssistanceData,
  AssistanceRepository,
} from '../domain/assistance-repository.js'
import {
  AssistanceNotFoundError,
  InvalidAssistanceStatusTransitionError,
} from '../domain/assistance-errors.js'
import { UpdateAssistanceStatus } from './update-assistance-status.js'

function makeAssistanceData(
  overrides: Partial<AssistanceData> = {}
): AssistanceData {
  return {
    id: 'assist-1',
    organizationId: 'org-1',
    policyId: 'pol-1',
    clientId: 'c-1',
    claimId: null,
    type: 'TOWING',
    status: 'REQUESTED',
    description: 'Vehicle breakdown',
    address: 'Rua X, 123',
    latitude: null,
    longitude: null,
    providerName: null,
    providerPhone: null,
    requestedAt: new Date(),
    scheduledAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockRepo(data: AssistanceData | null): AssistanceRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(data),
    findMany: vi.fn(),
    updateStatus: vi.fn().mockImplementation(async (_id, _orgId, input) => ({
      ...makeAssistanceData(),
      ...input,
    })),
  }
}

describe('UpdateAssistanceStatus', () => {
  // Valid transitions
  it('transitions REQUESTED to AWAITING_DOCUMENT', async () => {
    const repo = createMockRepo(makeAssistanceData({ status: 'REQUESTED' }))
    const useCase = new UpdateAssistanceStatus(repo)

    await useCase.execute('assist-1', 'org-1', 'AWAITING_DOCUMENT')

    expect(repo.updateStatus).toHaveBeenCalledWith('assist-1', 'org-1', {
      status: 'AWAITING_DOCUMENT',
      completedAt: undefined,
    })
  })

  it('transitions REQUESTED to DISPATCHED', async () => {
    const repo = createMockRepo(makeAssistanceData({ status: 'REQUESTED' }))
    const useCase = new UpdateAssistanceStatus(repo)

    await useCase.execute('assist-1', 'org-1', 'DISPATCHED')

    expect(repo.updateStatus).toHaveBeenCalledWith('assist-1', 'org-1', {
      status: 'DISPATCHED',
      completedAt: undefined,
    })
  })

  it('transitions AWAITING_DOCUMENT to PENDING_INSPECTION', async () => {
    const repo = createMockRepo(
      makeAssistanceData({ status: 'AWAITING_DOCUMENT' })
    )
    const useCase = new UpdateAssistanceStatus(repo)

    await useCase.execute('assist-1', 'org-1', 'PENDING_INSPECTION')

    expect(repo.updateStatus).toHaveBeenCalledWith('assist-1', 'org-1', {
      status: 'PENDING_INSPECTION',
      completedAt: undefined,
    })
  })

  it('transitions PENDING_INSPECTION to DISPATCHED', async () => {
    const repo = createMockRepo(
      makeAssistanceData({ status: 'PENDING_INSPECTION' })
    )
    const useCase = new UpdateAssistanceStatus(repo)

    await useCase.execute('assist-1', 'org-1', 'DISPATCHED')

    expect(repo.updateStatus).toHaveBeenCalledWith('assist-1', 'org-1', {
      status: 'DISPATCHED',
      completedAt: undefined,
    })
  })

  it('transitions DISPATCHED to IN_PROGRESS', async () => {
    const repo = createMockRepo(makeAssistanceData({ status: 'DISPATCHED' }))
    const useCase = new UpdateAssistanceStatus(repo)

    await useCase.execute('assist-1', 'org-1', 'IN_PROGRESS')

    expect(repo.updateStatus).toHaveBeenCalledWith('assist-1', 'org-1', {
      status: 'IN_PROGRESS',
      completedAt: undefined,
    })
  })

  it('transitions IN_PROGRESS to COMPLETED and sets completedAt', async () => {
    const repo = createMockRepo(makeAssistanceData({ status: 'IN_PROGRESS' }))
    const useCase = new UpdateAssistanceStatus(repo)

    await useCase.execute('assist-1', 'org-1', 'COMPLETED')

    expect(repo.updateStatus).toHaveBeenCalledWith('assist-1', 'org-1', {
      status: 'COMPLETED',
      completedAt: expect.any(Date),
    })
  })

  // Invalid transitions
  it('rejects REQUESTED to COMPLETED', async () => {
    const repo = createMockRepo(makeAssistanceData({ status: 'REQUESTED' }))
    const useCase = new UpdateAssistanceStatus(repo)

    await expect(
      useCase.execute('assist-1', 'org-1', 'COMPLETED')
    ).rejects.toThrow(InvalidAssistanceStatusTransitionError)
  })

  it('rejects COMPLETED to any status', async () => {
    const repo = createMockRepo(makeAssistanceData({ status: 'COMPLETED' }))
    const useCase = new UpdateAssistanceStatus(repo)

    await expect(
      useCase.execute('assist-1', 'org-1', 'REQUESTED')
    ).rejects.toThrow(InvalidAssistanceStatusTransitionError)
  })

  it('rejects IN_PROGRESS to DISPATCHED', async () => {
    const repo = createMockRepo(makeAssistanceData({ status: 'IN_PROGRESS' }))
    const useCase = new UpdateAssistanceStatus(repo)

    await expect(
      useCase.execute('assist-1', 'org-1', 'DISPATCHED')
    ).rejects.toThrow(InvalidAssistanceStatusTransitionError)
  })

  // Not found
  it('throws AssistanceNotFoundError when assistance does not exist', async () => {
    const repo = createMockRepo(null)
    const useCase = new UpdateAssistanceStatus(repo)

    await expect(
      useCase.execute('missing', 'org-1', 'DISPATCHED')
    ).rejects.toThrow(AssistanceNotFoundError)
    expect(repo.updateStatus).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && pnpm vitest run src/modules/assistance/application/update-assistance-status.spec.ts`
Expected: All 10 tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/assistance/application/update-assistance-status.spec.ts
git commit -m "test(assistance): add UpdateAssistanceStatus unit tests — all state transitions"
```

---

## Task 3: Chat — CloseConversation (Tier 1)

**Files:**

- Create: `apps/chat-server/src/application/close-conversation.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// apps/chat-server/src/application/close-conversation.spec.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InvalidConversationTransitionError } from '../domain/errors.js'
import type { ConversationRepository } from '../domain/ports/conversation-repository.js'
import type { MessageRepository } from '../domain/ports/message-repository.js'
import type { ConversationData } from '../domain/types.js'
import { CloseConversation } from './close-conversation.js'

function makeConversationData(
  overrides: Partial<ConversationData> = {}
): ConversationData {
  return {
    id: 'conv-1',
    tenantId: 'tenant-1',
    channelId: 'channel-1',
    contactId: 'contact-1',
    status: 'HUMAN_ACTIVE',
    assignedTo: 'agent-1',
    assignedToName: 'Agent',
    subject: null,
    lastMessageText: null,
    lastMessageAt: null,
    whatsappPhone: '+5511999990000',
    closedAt: null,
    closedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockConversationRepo(
  atomicResult: ConversationData | null
): ConversationRepository {
  return {
    findById: vi.fn(),
    findOpenByContactAndChannel: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    atomicTransition: vi.fn().mockResolvedValue(atomicResult),
    atomicAssign: vi.fn(),
    updateLastMessage: vi.fn(),
    findStaleConversations: vi.fn(),
  }
}

function createMockMessageRepo(): MessageRepository {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    findByConversation: vi.fn(),
    findByExternalId: vi.fn(),
    updateStatus: vi.fn(),
    findAfterTimestamp: vi.fn(),
  }
}

const BASE_INPUT = {
  conversationId: 'conv-1',
  tenantId: 'tenant-1',
  closedBy: 'agent-1',
  closedByName: 'Agent Smith',
}

describe('CloseConversation', () => {
  let conversationRepo: ConversationRepository
  let messageRepo: MessageRepository

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('closes conversation via atomicTransition from valid states', async () => {
    const closed = makeConversationData({ status: 'CLOSED' })
    conversationRepo = createMockConversationRepo(closed)
    messageRepo = createMockMessageRepo()
    const useCase = new CloseConversation(conversationRepo, messageRepo)

    const result = await useCase.execute(BASE_INPUT)

    expect(result.status).toBe('CLOSED')
    expect(conversationRepo.atomicTransition).toHaveBeenCalledWith(
      'conv-1',
      'tenant-1',
      ['BOT_ACTIVE', 'WAITING_HUMAN', 'HUMAN_ACTIVE'],
      'CLOSED',
      { closedAt: expect.any(Date), closedBy: 'agent-1' }
    )
  })

  it('creates system message after closing', async () => {
    conversationRepo = createMockConversationRepo(
      makeConversationData({ status: 'CLOSED' })
    )
    messageRepo = createMockMessageRepo()
    const useCase = new CloseConversation(conversationRepo, messageRepo)

    await useCase.execute(BASE_INPUT)

    expect(messageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv-1',
        tenantId: 'tenant-1',
        senderType: 'SYSTEM',
        text: 'Atendimento finalizado por Agent Smith',
        type: 'TEXT',
        status: 'DELIVERED',
      })
    )
  })

  it('throws when atomicTransition returns null (already closed or concurrent change)', async () => {
    conversationRepo = createMockConversationRepo(null)
    messageRepo = createMockMessageRepo()
    const useCase = new CloseConversation(conversationRepo, messageRepo)

    await expect(useCase.execute(BASE_INPUT)).rejects.toThrow(
      InvalidConversationTransitionError
    )
    expect(messageRepo.create).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd apps/chat-server && pnpm vitest run src/application/close-conversation.spec.ts`
Expected: All 3 tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/chat-server/src/application/close-conversation.spec.ts
git commit -m "test(chat): add CloseConversation unit tests"
```

---

## Task 4: Chat — TransferConversation (Tier 1)

**Files:**

- Create: `apps/chat-server/src/application/transfer-conversation.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// apps/chat-server/src/application/transfer-conversation.spec.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InvalidConversationTransitionError } from '../domain/errors.js'
import type { ConversationRepository } from '../domain/ports/conversation-repository.js'
import type { MessageRepository } from '../domain/ports/message-repository.js'
import type { ConversationData } from '../domain/types.js'
import { TransferConversation } from './transfer-conversation.js'

function makeConversationData(
  overrides: Partial<ConversationData> = {}
): ConversationData {
  return {
    id: 'conv-1',
    tenantId: 'tenant-1',
    channelId: 'channel-1',
    contactId: 'contact-1',
    status: 'HUMAN_ACTIVE',
    assignedTo: 'agent-1',
    assignedToName: 'Agent',
    subject: null,
    lastMessageText: null,
    lastMessageAt: null,
    whatsappPhone: '+5511999990000',
    closedAt: null,
    closedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockConversationRepo(
  atomicResult: ConversationData | null
): ConversationRepository {
  return {
    findById: vi.fn(),
    findOpenByContactAndChannel: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    atomicTransition: vi.fn().mockResolvedValue(atomicResult),
    atomicAssign: vi.fn(),
    updateLastMessage: vi.fn(),
    findStaleConversations: vi.fn(),
  }
}

function createMockMessageRepo(): MessageRepository {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    findByConversation: vi.fn(),
    findByExternalId: vi.fn(),
    updateStatus: vi.fn(),
    findAfterTimestamp: vi.fn(),
  }
}

describe('TransferConversation', () => {
  let conversationRepo: ConversationRepository
  let messageRepo: MessageRepository

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('transfers conversation to target agent', async () => {
    const transferred = makeConversationData({
      assignedTo: 'agent-2',
      assignedToName: 'Agent Two',
    })
    conversationRepo = createMockConversationRepo(transferred)
    messageRepo = createMockMessageRepo()
    const useCase = new TransferConversation(conversationRepo, messageRepo)

    const result = await useCase.execute({
      conversationId: 'conv-1',
      tenantId: 'tenant-1',
      targetAgentId: 'agent-2',
      targetAgentName: 'Agent Two',
    })

    expect(result.assignedTo).toBe('agent-2')
    expect(conversationRepo.atomicTransition).toHaveBeenCalledWith(
      'conv-1',
      'tenant-1',
      'HUMAN_ACTIVE',
      'HUMAN_ACTIVE',
      { assignedTo: 'agent-2', assignedToName: 'Agent Two' }
    )
  })

  it('creates system message with target agent name', async () => {
    conversationRepo = createMockConversationRepo(makeConversationData())
    messageRepo = createMockMessageRepo()
    const useCase = new TransferConversation(conversationRepo, messageRepo)

    await useCase.execute({
      conversationId: 'conv-1',
      tenantId: 'tenant-1',
      targetAgentId: 'agent-2',
      targetAgentName: 'Agent Two',
    })

    expect(messageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        senderType: 'SYSTEM',
        text: 'Transferido para Agent Two',
      })
    )
  })

  it('rejects transfer without target agent', async () => {
    conversationRepo = createMockConversationRepo(makeConversationData())
    messageRepo = createMockMessageRepo()
    const useCase = new TransferConversation(conversationRepo, messageRepo)

    await expect(
      useCase.execute({
        conversationId: 'conv-1',
        tenantId: 'tenant-1',
        targetAgentId: '',
        targetAgentName: '',
      })
    ).rejects.toThrow(InvalidConversationTransitionError)
  })

  it('throws when atomicTransition returns null', async () => {
    conversationRepo = createMockConversationRepo(null)
    messageRepo = createMockMessageRepo()
    const useCase = new TransferConversation(conversationRepo, messageRepo)

    await expect(
      useCase.execute({
        conversationId: 'conv-1',
        tenantId: 'tenant-1',
        targetAgentId: 'agent-2',
        targetAgentName: 'Agent Two',
      })
    ).rejects.toThrow(InvalidConversationTransitionError)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd apps/chat-server && pnpm vitest run src/application/transfer-conversation.spec.ts`
Expected: All 4 tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/chat-server/src/application/transfer-conversation.spec.ts
git commit -m "test(chat): add TransferConversation unit tests"
```

---

## Task 5: Chat — ReturnToQueue (Tier 1)

**Files:**

- Create: `apps/chat-server/src/application/return-to-queue.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// apps/chat-server/src/application/return-to-queue.spec.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InvalidConversationTransitionError } from '../domain/errors.js'
import type { ConversationRepository } from '../domain/ports/conversation-repository.js'
import type { MessageRepository } from '../domain/ports/message-repository.js'
import type { ConversationData } from '../domain/types.js'
import { ReturnToQueue } from './return-to-queue.js'

function makeConversationData(
  overrides: Partial<ConversationData> = {}
): ConversationData {
  return {
    id: 'conv-1',
    tenantId: 'tenant-1',
    channelId: 'channel-1',
    contactId: 'contact-1',
    status: 'WAITING_HUMAN',
    assignedTo: null,
    assignedToName: null,
    subject: null,
    lastMessageText: null,
    lastMessageAt: null,
    whatsappPhone: '+5511999990000',
    closedAt: null,
    closedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockConversationRepo(
  atomicResult: ConversationData | null
): ConversationRepository {
  return {
    findById: vi.fn(),
    findOpenByContactAndChannel: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    atomicTransition: vi.fn().mockResolvedValue(atomicResult),
    atomicAssign: vi.fn(),
    updateLastMessage: vi.fn(),
    findStaleConversations: vi.fn(),
  }
}

function createMockMessageRepo(): MessageRepository {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    findByConversation: vi.fn(),
    findByExternalId: vi.fn(),
    updateStatus: vi.fn(),
    findAfterTimestamp: vi.fn(),
  }
}

describe('ReturnToQueue', () => {
  let conversationRepo: ConversationRepository
  let messageRepo: MessageRepository

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns conversation to queue clearing assignment', async () => {
    const returned = makeConversationData({ status: 'WAITING_HUMAN' })
    conversationRepo = createMockConversationRepo(returned)
    messageRepo = createMockMessageRepo()
    const useCase = new ReturnToQueue(conversationRepo, messageRepo)

    const result = await useCase.execute({
      conversationId: 'conv-1',
      tenantId: 'tenant-1',
    })

    expect(result.status).toBe('WAITING_HUMAN')
    expect(conversationRepo.atomicTransition).toHaveBeenCalledWith(
      'conv-1',
      'tenant-1',
      'HUMAN_ACTIVE',
      'WAITING_HUMAN',
      { assignedTo: null, assignedToName: null }
    )
  })

  it('creates system message', async () => {
    conversationRepo = createMockConversationRepo(makeConversationData())
    messageRepo = createMockMessageRepo()
    const useCase = new ReturnToQueue(conversationRepo, messageRepo)

    await useCase.execute({ conversationId: 'conv-1', tenantId: 'tenant-1' })

    expect(messageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        senderType: 'SYSTEM',
        text: 'Devolvido para fila',
      })
    )
  })

  it('throws when atomicTransition returns null', async () => {
    conversationRepo = createMockConversationRepo(null)
    messageRepo = createMockMessageRepo()
    const useCase = new ReturnToQueue(conversationRepo, messageRepo)

    await expect(
      useCase.execute({ conversationId: 'conv-1', tenantId: 'tenant-1' })
    ).rejects.toThrow(InvalidConversationTransitionError)
    expect(messageRepo.create).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd apps/chat-server && pnpm vitest run src/application/return-to-queue.spec.ts`
Expected: All 3 tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/chat-server/src/application/return-to-queue.spec.ts
git commit -m "test(chat): add ReturnToQueue unit tests"
```

---

## Task 6: Chat — ReturnToBot (Tier 1)

**Files:**

- Create: `apps/chat-server/src/application/return-to-bot.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// apps/chat-server/src/application/return-to-bot.spec.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InvalidConversationTransitionError } from '../domain/errors.js'
import type { ConversationRepository } from '../domain/ports/conversation-repository.js'
import type { ConversationData } from '../domain/types.js'
import { ReturnToBot } from './return-to-bot.js'

function makeConversationData(
  overrides: Partial<ConversationData> = {}
): ConversationData {
  return {
    id: 'conv-1',
    tenantId: 'tenant-1',
    channelId: 'channel-1',
    contactId: 'contact-1',
    status: 'BOT_ACTIVE',
    assignedTo: null,
    assignedToName: null,
    subject: null,
    lastMessageText: null,
    lastMessageAt: null,
    whatsappPhone: '+5511999990000',
    closedAt: null,
    closedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockConversationRepo(
  atomicResult: ConversationData | null
): ConversationRepository {
  return {
    findById: vi.fn(),
    findOpenByContactAndChannel: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    atomicTransition: vi.fn().mockResolvedValue(atomicResult),
    atomicAssign: vi.fn(),
    updateLastMessage: vi.fn(),
    findStaleConversations: vi.fn(),
  }
}

describe('ReturnToBot', () => {
  let conversationRepo: ConversationRepository

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns conversation to bot clearing assignment', async () => {
    const returned = makeConversationData({ status: 'BOT_ACTIVE' })
    conversationRepo = createMockConversationRepo(returned)
    const useCase = new ReturnToBot(conversationRepo)

    const result = await useCase.execute({
      conversationId: 'conv-1',
      tenantId: 'tenant-1',
    })

    expect(result.status).toBe('BOT_ACTIVE')
    expect(conversationRepo.atomicTransition).toHaveBeenCalledWith(
      'conv-1',
      'tenant-1',
      ['HUMAN_ACTIVE', 'WAITING_HUMAN'],
      'BOT_ACTIVE',
      { assignedTo: null, assignedToName: null }
    )
  })

  it('throws when atomicTransition returns null', async () => {
    conversationRepo = createMockConversationRepo(null)
    const useCase = new ReturnToBot(conversationRepo)

    await expect(
      useCase.execute({ conversationId: 'conv-1', tenantId: 'tenant-1' })
    ).rejects.toThrow(InvalidConversationTransitionError)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd apps/chat-server && pnpm vitest run src/application/return-to-bot.spec.ts`
Expected: All 2 tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/chat-server/src/application/return-to-bot.spec.ts
git commit -m "test(chat): add ReturnToBot unit tests"
```

---

## Task 7: Proposal — MarkProposalLost (Tier 1)

**Files:**

- Create: `packages/core/src/modules/proposal/application/mark-proposal-lost.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/core/src/modules/proposal/application/mark-proposal-lost.spec.ts
import { describe, expect, it, vi } from 'vitest'
import { Proposal } from '../domain/proposal.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import {
  ProposalNotFoundError,
  InvalidStageTransitionError,
} from '../domain/proposal-errors.js'
import { MarkProposalLost } from './mark-proposal-lost.js'

function createMockRepo(proposal: Proposal | null): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(proposal),
    findMany: vi.fn(),
  }
}

function makeProposal(
  stage:
    | 'CAPTURE'
    | 'QUOTE'
    | 'PROTOCOL'
    | 'INSPECTION'
    | 'PAYMENT'
    | 'POLICY_ISSUED'
    | 'LOST' = 'CAPTURE'
): Proposal {
  const proposal = Proposal.create({
    organizationId: 'org-1',
    clientId: 'c-1',
    salespersonId: 'u-1',
    branch: 'AUTO',
    boardType: 'NEW_INSURANCE',
  })
  // Advance to desired stage
  const stages = [
    'CAPTURE',
    'QUOTE',
    'PROTOCOL',
    'INSPECTION',
    'PAYMENT',
    'POLICY_ISSUED',
  ]
  const targetIndex = stages.indexOf(stage)
  for (let i = 0; i < targetIndex; i++) {
    proposal.advance()
  }
  return proposal
}

describe('MarkProposalLost', () => {
  it('marks CAPTURE proposal as lost with reason', async () => {
    const proposal = makeProposal('CAPTURE')
    const repo = createMockRepo(proposal)
    const useCase = new MarkProposalLost(repo)

    const result = await useCase.execute(
      proposal.id,
      'org-1',
      'Cliente desistiu'
    )

    expect(result.stage).toBe('LOST')
    expect(result.lostReason).toBe('Cliente desistiu')
    expect(repo.save).toHaveBeenCalledWith(proposal)
  })

  it('marks QUOTE proposal as lost', async () => {
    const proposal = makeProposal('QUOTE')
    const repo = createMockRepo(proposal)
    const useCase = new MarkProposalLost(repo)

    const result = await useCase.execute(proposal.id, 'org-1', 'Preco alto')

    expect(result.stage).toBe('LOST')
  })

  it('rejects marking POLICY_ISSUED as lost', async () => {
    const proposal = makeProposal('POLICY_ISSUED')
    const repo = createMockRepo(proposal)
    const useCase = new MarkProposalLost(repo)

    await expect(
      useCase.execute(proposal.id, 'org-1', 'reason')
    ).rejects.toThrow(InvalidStageTransitionError)
  })

  it('throws ProposalNotFoundError when proposal does not exist', async () => {
    const repo = createMockRepo(null)
    const useCase = new MarkProposalLost(repo)

    await expect(useCase.execute('missing', 'org-1', 'reason')).rejects.toThrow(
      ProposalNotFoundError
    )
    expect(repo.save).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && pnpm vitest run src/modules/proposal/application/mark-proposal-lost.spec.ts`
Expected: All 4 tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/proposal/application/mark-proposal-lost.spec.ts
git commit -m "test(proposal): add MarkProposalLost unit tests"
```

---

## Task 8: Commission — OnPolicyIssued (Tier 2)

**Files:**

- Create: `packages/core/src/modules/commission/application/on-policy-issued.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/core/src/modules/commission/application/on-policy-issued.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { CommissionRepository } from '../domain/commission-repository.js'
import { OnPolicyIssued } from './on-policy-issued.js'

function createMockRepo(): CommissionRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  }
}

describe('OnPolicyIssued', () => {
  it('creates commission from policy data', async () => {
    const repo = createMockRepo()
    const useCase = new OnPolicyIssued(repo)

    await useCase.execute({
      organizationId: 'org-1',
      policyId: 'pol-1',
      salespersonId: 'user-1',
      premiumValueInCents: 100000,
      commissionPercentageInBasisPoints: 1500,
    })

    expect(repo.save).toHaveBeenCalledTimes(1)
    const saved = vi.mocked(repo.save).mock.calls[0]?.[0]
    expect(saved?.organizationId).toBe('org-1')
    expect(saved?.policyId).toBe('pol-1')
    expect(saved?.salespersonId).toBe('user-1')
    expect(saved?.status).toBe('PENDING_COMMERCIAL')
  })

  it('skips commission creation when percentage is zero', async () => {
    const repo = createMockRepo()
    const useCase = new OnPolicyIssued(repo)

    await useCase.execute({
      organizationId: 'org-1',
      policyId: 'pol-1',
      salespersonId: 'user-1',
      premiumValueInCents: 100000,
      commissionPercentageInBasisPoints: 0,
    })

    expect(repo.save).not.toHaveBeenCalled()
  })

  it('skips commission creation when percentage is negative', async () => {
    const repo = createMockRepo()
    const useCase = new OnPolicyIssued(repo)

    await useCase.execute({
      organizationId: 'org-1',
      policyId: 'pol-1',
      salespersonId: 'user-1',
      premiumValueInCents: 100000,
      commissionPercentageInBasisPoints: -100,
    })

    expect(repo.save).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && pnpm vitest run src/modules/commission/application/on-policy-issued.spec.ts`
Expected: All 3 tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/commission/application/on-policy-issued.spec.ts
git commit -m "test(commission): add OnPolicyIssued unit tests"
```

---

## Task 9: Commission — PayCommission (Tier 2)

**Files:**

- Create: `packages/core/src/modules/commission/application/pay-commission.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/core/src/modules/commission/application/pay-commission.spec.ts
import { describe, expect, it, vi } from 'vitest'
import {
  CommissionNotFoundError,
  InvalidCommissionTransitionError,
} from '../domain/commission-errors.js'
import type {
  CommissionData,
  CommissionRepository,
} from '../domain/commission-repository.js'
import { PayCommission } from './pay-commission.js'

function makeCommissionData(
  overrides: Partial<CommissionData> = {}
): CommissionData {
  return {
    id: 'comm-1',
    organizationId: 'org-1',
    policyId: 'pol-1',
    salespersonId: 'user-1',
    status: 'APPROVED',
    commissionValueInCents: 15000,
    premiumValueInCents: 100000,
    percentageInBasisPoints: 1500,
    splitPercentage: 10000,
    approvedBy: 'admin-1',
    approvedAt: new Date(),
    paidAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    isReversal: false,
    originalCommissionId: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockRepo(data: CommissionData | null): CommissionRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(data),
    findMany: vi.fn(),
    update: vi.fn().mockImplementation(async (commission) => {
      const json = commission.toJSON()
      return {
        ...json,
        splitPercentage: json.splitPercentage,
      } satisfies CommissionData
    }),
  }
}

describe('PayCommission', () => {
  it('marks APPROVED commission as PAID with paidAt', async () => {
    const data = makeCommissionData({ status: 'APPROVED' })
    const repo = createMockRepo(data)
    const useCase = new PayCommission(repo)

    const result = await useCase.execute('comm-1', 'org-1')

    expect(repo.update).toHaveBeenCalledTimes(1)
    const saved = vi.mocked(repo.update).mock.calls[0]?.[0]
    expect(saved?.status).toBe('PAID')
    expect(saved?.paidAt).toBeInstanceOf(Date)
  })

  it('rejects payment from PENDING_COMMERCIAL status', async () => {
    const data = makeCommissionData({ status: 'PENDING_COMMERCIAL' })
    const repo = createMockRepo(data)
    const useCase = new PayCommission(repo)

    await expect(useCase.execute('comm-1', 'org-1')).rejects.toThrow(
      InvalidCommissionTransitionError
    )
  })

  it('throws CommissionNotFoundError when commission does not exist', async () => {
    const repo = createMockRepo(null)
    const useCase = new PayCommission(repo)

    await expect(useCase.execute('missing', 'org-1')).rejects.toThrow(
      CommissionNotFoundError
    )
    expect(repo.update).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && pnpm vitest run src/modules/commission/application/pay-commission.spec.ts`
Expected: All 3 tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/commission/application/pay-commission.spec.ts
git commit -m "test(commission): add PayCommission unit tests"
```

---

## Task 10: Commission — CreateCommission (Tier 2)

**Files:**

- Create: `packages/core/src/modules/commission/application/create-commission.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/core/src/modules/commission/application/create-commission.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { CommissionRepository } from '../domain/commission-repository.js'
import { CreateCommission } from './create-commission.js'

function createMockRepo(): CommissionRepository {
  return {
    save: vi.fn().mockImplementation(async (commission) => commission.toJSON()),
    findById: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  }
}

describe('CreateCommission', () => {
  it('creates commission with correct financial values', async () => {
    const repo = createMockRepo()
    const useCase = new CreateCommission(repo)

    const result = await useCase.execute({
      organizationId: 'org-1',
      policyId: 'pol-1',
      salespersonId: 'user-1',
      premiumValueInCents: 100000,
      percentageInBasisPoints: 1500,
    })

    expect(repo.save).toHaveBeenCalledTimes(1)
    expect(result.organizationId).toBe('org-1')
    expect(result.status).toBe('PENDING_COMMERCIAL')
  })

  it('creates commission with default split percentage of 10000 (100%)', async () => {
    const repo = createMockRepo()
    const useCase = new CreateCommission(repo)

    await useCase.execute({
      organizationId: 'org-1',
      policyId: 'pol-1',
      salespersonId: 'user-1',
      premiumValueInCents: 50000,
      percentageInBasisPoints: 2000,
    })

    const saved = vi.mocked(repo.save).mock.calls[0]?.[0]
    expect(saved?.splitPercentage).toBe(10000)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && pnpm vitest run src/modules/commission/application/create-commission.spec.ts`
Expected: All 2 tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/commission/application/create-commission.spec.ts
git commit -m "test(commission): add CreateCommission unit tests"
```

---

## Task 11: Policy — CancelPolicy (Tier 2)

**Files:**

- Create: `packages/core/src/modules/policy/application/cancel-policy.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/core/src/modules/policy/application/cancel-policy.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type {
  PolicyData,
  PolicyRepository,
} from '../domain/policy-repository.js'
import {
  PolicyNotFoundError,
  PolicyAlreadyCancelledError,
} from '../domain/policy-errors.js'
import { CancelPolicy } from './cancel-policy.js'

function makePolicyData(overrides: Partial<PolicyData> = {}): PolicyData {
  return {
    id: 'pol-1',
    organizationId: 'org-1',
    proposalId: 'prop-1',
    clientId: 'c-1',
    insurerId: 'ins-1',
    salespersonId: 'user-1',
    policyNumber: 'POL-001',
    branch: 'AUTO',
    status: 'ACTIVE',
    premiumValueInCents: 100000,
    commissionPercentageInBasisPoints: 1500,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-01-01'),
    cancelledAt: null,
    cancellationReason: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockRepo(data: PolicyData | null): PolicyRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(data),
    findMany: vi.fn(),
    cancel: vi.fn().mockImplementation(async (id, orgId, reason) => ({
      ...makePolicyData(),
      id,
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: reason,
    })),
  }
}

describe('CancelPolicy', () => {
  it('cancels an active policy', async () => {
    const repo = createMockRepo(makePolicyData({ status: 'ACTIVE' }))
    const useCase = new CancelPolicy(repo)

    const result = await useCase.execute('pol-1', 'org-1', 'Cliente solicitou')

    expect(repo.cancel).toHaveBeenCalledWith(
      'pol-1',
      'org-1',
      'Cliente solicitou'
    )
    expect(result.status).toBe('CANCELLED')
  })

  it('throws PolicyAlreadyCancelledError when policy is already cancelled', async () => {
    const repo = createMockRepo(makePolicyData({ status: 'CANCELLED' }))
    const useCase = new CancelPolicy(repo)

    await expect(useCase.execute('pol-1', 'org-1', 'reason')).rejects.toThrow(
      PolicyAlreadyCancelledError
    )
    expect(repo.cancel).not.toHaveBeenCalled()
  })

  it('throws PolicyNotFoundError when policy does not exist', async () => {
    const repo = createMockRepo(null)
    const useCase = new CancelPolicy(repo)

    await expect(useCase.execute('missing', 'org-1', 'reason')).rejects.toThrow(
      PolicyNotFoundError
    )
    expect(repo.cancel).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && pnpm vitest run src/modules/policy/application/cancel-policy.spec.ts`
Expected: All 3 tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/policy/application/cancel-policy.spec.ts
git commit -m "test(policy): add CancelPolicy unit tests"
```

---

## Task 12: Proposal — CreateProposal (Tier 2)

**Files:**

- Create: `packages/core/src/modules/proposal/application/create-proposal.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/core/src/modules/proposal/application/create-proposal.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import type { ChecklistRepository } from '../domain/checklist-repository.js'
import type { ChecklistConfigProvider } from '../domain/checklist-config.js'
import { CreateProposal } from './create-proposal.js'

function createMockRepo(): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
  }
}

function createMockChecklistRepo(): ChecklistRepository {
  return {
    createMany: vi.fn(),
    findByProposal: vi.fn(),
    findById: vi.fn(),
    complete: vi.fn(),
    getSummary: vi.fn(),
  }
}

function createMockChecklistConfig(
  items: Array<{ itemKey: string; label: string; isRequired: boolean }> = []
): ChecklistConfigProvider {
  return {
    getItems: vi.fn().mockReturnValue(items),
  }
}

describe('CreateProposal', () => {
  it('creates proposal in CAPTURE stage and saves it', async () => {
    const repo = createMockRepo()
    const checklistRepo = createMockChecklistRepo()
    const checklistConfig = createMockChecklistConfig()
    const useCase = new CreateProposal(repo, checklistRepo, checklistConfig)

    const result = await useCase.execute({
      organizationId: 'org-1',
      clientId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })

    expect(result.stage).toBe('CAPTURE')
    expect(result.organizationId).toBe('org-1')
    expect(result.branch).toBe('AUTO')
    expect(repo.save).toHaveBeenCalledTimes(1)
  })

  it('creates checklist items when config returns items for stage/branch', async () => {
    const repo = createMockRepo()
    const checklistRepo = createMockChecklistRepo()
    const checklistConfig = createMockChecklistConfig([
      { itemKey: 'CNH', label: 'CNH do segurado', isRequired: true },
      { itemKey: 'CRLV', label: 'CRLV do veiculo', isRequired: true },
    ])
    const useCase = new CreateProposal(repo, checklistRepo, checklistConfig)

    await useCase.execute({
      organizationId: 'org-1',
      clientId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })

    expect(checklistConfig.getItems).toHaveBeenCalledWith('CAPTURE', 'AUTO')
    expect(checklistRepo.createMany).toHaveBeenCalledWith(expect.any(String), [
      { itemKey: 'CNH', label: 'CNH do segurado', isRequired: true },
      { itemKey: 'CRLV', label: 'CRLV do veiculo', isRequired: true },
    ])
  })

  it('skips checklist creation when config returns no items', async () => {
    const repo = createMockRepo()
    const checklistRepo = createMockChecklistRepo()
    const checklistConfig = createMockChecklistConfig([])
    const useCase = new CreateProposal(repo, checklistRepo, checklistConfig)

    await useCase.execute({
      organizationId: 'org-1',
      clientId: 'c-1',
      salespersonId: 'u-1',
      branch: 'LIFE',
      boardType: 'NEW_INSURANCE',
    })

    expect(checklistRepo.createMany).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && pnpm vitest run src/modules/proposal/application/create-proposal.spec.ts`
Expected: All 3 tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/proposal/application/create-proposal.spec.ts
git commit -m "test(proposal): add CreateProposal unit tests"
```

---

## Task 13: Proposal — CompleteChecklistByAttachment (Tier 3)

**Files:**

- Create: `packages/core/src/modules/proposal/application/complete-checklist-by-attachment.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/core/src/modules/proposal/application/complete-checklist-by-attachment.spec.ts
import { describe, expect, it, vi } from 'vitest'
import { Proposal } from '../domain/proposal.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import type {
  ChecklistRepository,
  ChecklistItemData,
} from '../domain/checklist-repository.js'
import { ProposalNotFoundError } from '../domain/proposal-errors.js'
import { CompleteChecklistByAttachment } from './complete-checklist-by-attachment.js'

function createMockProposalRepo(proposal: Proposal | null): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(proposal),
    findMany: vi.fn(),
  }
}

function createMockChecklistRepo(): ChecklistRepository {
  const completedItem: ChecklistItemData = {
    id: 'item-1',
    proposalId: 'prop-1',
    itemKey: 'CNH',
    label: 'CNH do segurado',
    isRequired: true,
    isCompleted: true,
    completedBy: 'user-1',
    completedAt: new Date(),
    createdAt: new Date(),
  }
  return {
    createMany: vi.fn(),
    findByProposal: vi.fn(),
    findById: vi.fn(),
    complete: vi.fn().mockResolvedValue(completedItem),
    getSummary: vi.fn(),
  }
}

describe('CompleteChecklistByAttachment', () => {
  it('completes checklist item for existing proposal', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      clientId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    const proposalRepo = createMockProposalRepo(proposal)
    const checklistRepo = createMockChecklistRepo()
    const useCase = new CompleteChecklistByAttachment(
      checklistRepo,
      proposalRepo
    )

    const result = await useCase.execute(
      'item-1',
      proposal.id,
      'org-1',
      'user-1'
    )

    expect(result.isCompleted).toBe(true)
    expect(checklistRepo.complete).toHaveBeenCalledWith(
      'item-1',
      proposal.id,
      'user-1'
    )
  })

  it('throws ProposalNotFoundError when proposal does not exist', async () => {
    const proposalRepo = createMockProposalRepo(null)
    const checklistRepo = createMockChecklistRepo()
    const useCase = new CompleteChecklistByAttachment(
      checklistRepo,
      proposalRepo
    )

    await expect(
      useCase.execute('item-1', 'missing', 'org-1', 'user-1')
    ).rejects.toThrow(ProposalNotFoundError)
    expect(checklistRepo.complete).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && pnpm vitest run src/modules/proposal/application/complete-checklist-by-attachment.spec.ts`
Expected: All 2 tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/proposal/application/complete-checklist-by-attachment.spec.ts
git commit -m "test(proposal): add CompleteChecklistByAttachment unit tests"
```

---

## Task 14: Policy — ParsePolicyImport (Tier 3)

**Files:**

- Create: `packages/core/src/modules/policy/application/parse-policy-import.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/core/src/modules/policy/application/parse-policy-import.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { PolicyRepository } from '../domain/policy-repository.js'
import { CsvImportError } from '../../../shared/csv-import-types.js'
import { ParsePolicyImport } from './parse-policy-import.js'

function createMockRepo(): PolicyRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    cancel: vi.fn(),
  }
}

describe('ParsePolicyImport', () => {
  it('parses valid CSV and returns validation summary', async () => {
    const repo = createMockRepo()
    const useCase = new ParsePolicyImport(repo)
    const csv = [
      'numero,ramo,premio,inicio,fim,cliente_documento',
      'POL-001,AUTO,100000,2024-01-01,2025-01-01,12345678900',
      'POL-002,LIFE,50000,2024-06-01,2025-06-01,98765432100',
    ].join('\n')

    const result = await useCase.execute(csv, 'org-1')

    expect(result.jobId).toBeDefined()
    expect(result.validationSummary.total).toBe(2)
    expect(result.validationSummary.valid).toBeGreaterThan(0)
  })

  it('throws NO_VALID_ROWS when CSV is empty', async () => {
    const repo = createMockRepo()
    const useCase = new ParsePolicyImport(repo)
    const csv = 'numero,ramo,premio\n'

    await expect(useCase.execute(csv, 'org-1')).rejects.toThrow(CsvImportError)
  })

  it('throws TOO_MANY_ERRORS when more than 50% rows are invalid', async () => {
    const repo = createMockRepo()
    const useCase = new ParsePolicyImport(repo)
    // Generate mostly invalid rows
    const header = 'numero,ramo,premio,inicio,fim,cliente_documento'
    const invalidRows = Array.from({ length: 8 }, () => ',,,,,').join('\n')
    const validRow = 'POL-001,AUTO,100000,2024-01-01,2025-01-01,12345678900'
    const csv = [header, invalidRows, validRow].join('\n')

    await expect(useCase.execute(csv, 'org-1')).rejects.toThrow(CsvImportError)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && pnpm vitest run src/modules/policy/application/parse-policy-import.spec.ts`
Expected: All 3 tests PASS (may need CSV field adjustments based on schema — fix if needed)

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/policy/application/parse-policy-import.spec.ts
git commit -m "test(policy): add ParsePolicyImport unit tests"
```

---

## Task 15: Client — ParseClientImport (Tier 3)

**Files:**

- Create: `packages/core/src/modules/client/application/parse-client-import.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/core/src/modules/client/application/parse-client-import.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { ClientRepository } from '../domain/client-repository.js'
import { CsvImportError } from '../../../shared/csv-import-types.js'
import { ParseClientImport } from './parse-client-import.js'

function createMockRepo(): ClientRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    findByDocument: vi.fn(),
  }
}

describe('ParseClientImport', () => {
  it('parses valid CSV and returns validation summary', async () => {
    const repo = createMockRepo()
    const useCase = new ParseClientImport(repo)
    const csv = [
      'nome,documento,tipo,email,telefone',
      'Joao Silva,12345678900,PF,joao@test.com,11999990000',
      'Maria Santos,98765432100,PF,maria@test.com,11888880000',
    ].join('\n')

    const result = await useCase.execute(csv, 'org-1')

    expect(result.jobId).toBeDefined()
    expect(result.validationSummary.total).toBe(2)
    expect(result.validationSummary.valid).toBeGreaterThan(0)
  })

  it('throws NO_VALID_ROWS when CSV is empty', async () => {
    const repo = createMockRepo()
    const useCase = new ParseClientImport(repo)
    const csv = 'nome,documento,tipo\n'

    await expect(useCase.execute(csv, 'org-1')).rejects.toThrow(CsvImportError)
  })

  it('throws TOO_MANY_ERRORS when more than 50% rows are invalid', async () => {
    const repo = createMockRepo()
    const useCase = new ParseClientImport(repo)
    const header = 'nome,documento,tipo,email,telefone'
    const invalidRows = Array.from({ length: 8 }, () => ',,,,').join('\n')
    const validRow = 'Joao,12345678900,PF,j@test.com,11999990000'
    const csv = [header, invalidRows, validRow].join('\n')

    await expect(useCase.execute(csv, 'org-1')).rejects.toThrow(CsvImportError)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && pnpm vitest run src/modules/client/application/parse-client-import.spec.ts`
Expected: All 3 tests PASS (may need CSV field adjustments based on schema — fix if needed)

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/client/application/parse-client-import.spec.ts
git commit -m "test(client): add ParseClientImport unit tests"
```

---

## Task 16: Document — UploadDocument (Tier 3)

**Files:**

- Create: `packages/core/src/modules/document/application/upload-document.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/core/src/modules/document/application/upload-document.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type {
  DocumentRepository,
  DocumentData,
} from '../domain/document-repository.js'
import type { StorageProvider } from '../domain/storage-provider.js'
import { UploadDocument } from './upload-document.js'

// Mock validateFileContent to avoid real file-type detection
vi.mock('./validate-file-content.js', () => ({
  validateFileContent: vi.fn().mockResolvedValue(undefined),
}))

function createMockStorage(): StorageProvider {
  return {
    upload: vi.fn().mockResolvedValue(undefined),
    getSignedUrl: vi.fn(),
    delete: vi.fn(),
  }
}

function createMockDocRepo(): DocumentRepository {
  return {
    create: vi.fn().mockImplementation(async (input) => ({
      id: 'doc-1',
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    findById: vi.fn(),
    findByEntity: vi.fn(),
    delete: vi.fn(),
  }
}

describe('UploadDocument', () => {
  it('uploads file to storage and creates document record', async () => {
    const storage = createMockStorage()
    const docRepo = createMockDocRepo()
    const useCase = new UploadDocument(storage, docRepo)
    const buffer = Buffer.from('fake-pdf-content')

    const result = await useCase.execute({
      organizationId: 'org-1',
      entityType: 'PROPOSAL',
      entityId: 'prop-1',
      fileName: 'document.pdf',
      mimeType: 'application/pdf',
      buffer,
    })

    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringContaining('org-1/PROPOSAL/prop-1/'),
      buffer,
      'application/pdf'
    )
    expect(docRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        entityType: 'PROPOSAL',
        entityId: 'prop-1',
        fileName: 'document.pdf',
        mimeType: 'application/pdf',
        sizeBytes: buffer.length,
      })
    )
    expect(result.id).toBe('doc-1')
  })

  it('generates unique storage key with org/entity path', async () => {
    const storage = createMockStorage()
    const docRepo = createMockDocRepo()
    const useCase = new UploadDocument(storage, docRepo)

    await useCase.execute({
      organizationId: 'org-1',
      entityType: 'CLIENT',
      entityId: 'client-1',
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('jpg'),
    })

    const storageKey = vi.mocked(storage.upload).mock.calls[0]?.[0] as string
    expect(storageKey).toMatch(/^org-1\/CLIENT\/client-1\//)
    expect(storageKey).toContain('photo.jpg')
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && pnpm vitest run src/modules/document/application/upload-document.spec.ts`
Expected: All 2 tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/document/application/upload-document.spec.ts
git commit -m "test(document): add UploadDocument unit tests"
```

---

## Task 17: Document — DeleteDocument (Tier 3)

**Files:**

- Create: `packages/core/src/modules/document/application/delete-document.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/core/src/modules/document/application/delete-document.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type {
  DocumentRepository,
  DocumentData,
} from '../domain/document-repository.js'
import type { StorageProvider } from '../domain/storage-provider.js'
import { DocumentNotFoundError } from '../domain/document-errors.js'
import { DeleteDocument } from './delete-document.js'

function makeDocumentData(overrides: Partial<DocumentData> = {}): DocumentData {
  return {
    id: 'doc-1',
    organizationId: 'org-1',
    entityType: 'PROPOSAL',
    entityId: 'prop-1',
    clientId: null,
    type: null,
    fileName: 'contract.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    storageKey: 'org-1/PROPOSAL/prop-1/abc-contract.pdf',
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockDocRepo(data: DocumentData | null): DocumentRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(data),
    findByEntity: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

function createMockStorage(): StorageProvider {
  return {
    upload: vi.fn(),
    getSignedUrl: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

describe('DeleteDocument', () => {
  it('deletes document from database and storage', async () => {
    const doc = makeDocumentData()
    const docRepo = createMockDocRepo(doc)
    const storage = createMockStorage()
    const useCase = new DeleteDocument(docRepo, storage)

    await useCase.execute('doc-1', 'org-1')

    expect(docRepo.delete).toHaveBeenCalledWith('doc-1', 'org-1')
    expect(storage.delete).toHaveBeenCalledWith(
      'org-1/PROPOSAL/prop-1/abc-contract.pdf'
    )
  })

  it('throws DocumentNotFoundError when document does not exist', async () => {
    const docRepo = createMockDocRepo(null)
    const storage = createMockStorage()
    const useCase = new DeleteDocument(docRepo, storage)

    await expect(useCase.execute('missing', 'org-1')).rejects.toThrow(
      DocumentNotFoundError
    )
    expect(docRepo.delete).not.toHaveBeenCalled()
    expect(storage.delete).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && pnpm vitest run src/modules/document/application/delete-document.spec.ts`
Expected: All 2 tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/document/application/delete-document.spec.ts
git commit -m "test(document): add DeleteDocument unit tests"
```

---

## Task 18: Insurer — CreateInsurer (Tier 4)

**Files:**

- Create: `packages/core/src/modules/insurer/application/create-insurer.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/core/src/modules/insurer/application/create-insurer.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type {
  InsurerRepository,
  InsurerData,
} from '../domain/insurer-repository.js'
import { InsurerAlreadyExistsError } from '../domain/insurer-errors.js'
import { CreateInsurer } from './create-insurer.js'

function makeInsurerData(overrides: Partial<InsurerData> = {}): InsurerData {
  return {
    id: 'ins-1',
    organizationId: 'org-1',
    name: 'Porto Seguro',
    cnpj: '12345678000100',
    email: null,
    phone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockRepo(existingByName: InsurerData | null): InsurerRepository {
  return {
    create: vi.fn().mockImplementation(async (dto) => ({
      id: 'ins-new',
      ...dto,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    findById: vi.fn(),
    findByName: vi.fn().mockResolvedValue(existingByName),
    findMany: vi.fn(),
  }
}

describe('CreateInsurer', () => {
  it('creates insurer when name is unique', async () => {
    const repo = createMockRepo(null)
    const useCase = new CreateInsurer(repo)

    const result = await useCase.execute({
      organizationId: 'org-1',
      name: 'Allianz',
    })

    expect(repo.findByName).toHaveBeenCalledWith('Allianz', 'org-1')
    expect(repo.create).toHaveBeenCalledWith({
      organizationId: 'org-1',
      name: 'Allianz',
    })
    expect(result.name).toBe('Allianz')
  })

  it('throws InsurerAlreadyExistsError when name already exists', async () => {
    const existing = makeInsurerData({ name: 'Porto Seguro' })
    const repo = createMockRepo(existing)
    const useCase = new CreateInsurer(repo)

    await expect(
      useCase.execute({ organizationId: 'org-1', name: 'Porto Seguro' })
    ).rejects.toThrow(InsurerAlreadyExistsError)
    expect(repo.create).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && pnpm vitest run src/modules/insurer/application/create-insurer.spec.ts`
Expected: All 2 tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/insurer/application/create-insurer.spec.ts
git commit -m "test(insurer): add CreateInsurer unit tests"
```

---

## Task 19: Notification — MarkAsRead (Tier 4)

**Files:**

- Create: `packages/core/src/modules/notification/application/mark-as-read.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/core/src/modules/notification/application/mark-as-read.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { NotificationRepository } from '../domain/notification-repository.js'
import {
  MarkNotificationAsRead,
  MarkAllNotificationsAsRead,
} from './mark-as-read.js'

function createMockRepo(): NotificationRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    markAllAsRead: vi.fn().mockResolvedValue(5),
    countUnread: vi.fn(),
    countAlertsByEntityType: vi.fn(),
  }
}

describe('MarkNotificationAsRead', () => {
  it('marks single notification as read', async () => {
    const repo = createMockRepo()
    const useCase = new MarkNotificationAsRead(repo)

    await useCase.execute('notif-1', 'org-1', 'user-1')

    expect(repo.markAsRead).toHaveBeenCalledWith('notif-1', 'org-1', 'user-1')
  })
})

describe('MarkAllNotificationsAsRead', () => {
  it('marks all notifications as read and returns count', async () => {
    const repo = createMockRepo()
    const useCase = new MarkAllNotificationsAsRead(repo)

    const result = await useCase.execute('org-1', 'user-1')

    expect(repo.markAllAsRead).toHaveBeenCalledWith('org-1', 'user-1')
    expect(result.count).toBe(5)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && pnpm vitest run src/modules/notification/application/mark-as-read.spec.ts`
Expected: All 2 tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/notification/application/mark-as-read.spec.ts
git commit -m "test(notification): add MarkAsRead unit tests"
```

---

## Task 20: Notification — CountAlertsByEntityType (Tier 4)

**Files:**

- Create: `packages/core/src/modules/notification/application/count-alerts-by-entity-type.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/core/src/modules/notification/application/count-alerts-by-entity-type.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { NotificationRepository } from '../domain/notification-repository.js'
import { CountAlertsByEntityType } from './count-alerts-by-entity-type.js'

function createMockRepo(): NotificationRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    countUnread: vi.fn(),
    countAlertsByEntityType: vi.fn().mockResolvedValue({
      Policy: 3,
      Claim: 1,
      Commission: 0,
      Proposal: 2,
    }),
  }
}

describe('CountAlertsByEntityType', () => {
  it('returns alert counts grouped by entity type', async () => {
    const repo = createMockRepo()
    const useCase = new CountAlertsByEntityType(repo)

    const result = await useCase.execute('org-1', 'user-1')

    expect(result).toEqual({
      Policy: 3,
      Claim: 1,
      Commission: 0,
      Proposal: 2,
    })
    expect(repo.countAlertsByEntityType).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      [
        'POLICY_EXPIRING',
        'CLAIM_STALLED',
        'COMMISSION_PENDING',
        'PROPOSAL_STAGNANT',
      ]
    )
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && pnpm vitest run src/modules/notification/application/count-alerts-by-entity-type.spec.ts`
Expected: All 1 test PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/notification/application/count-alerts-by-entity-type.spec.ts
git commit -m "test(notification): add CountAlertsByEntityType unit tests"
```

---

## Task 21: Notification — CountUnreadNotifications (Tier 4)

**Files:**

- Create: `packages/core/src/modules/notification/application/count-unread-notifications.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/core/src/modules/notification/application/count-unread-notifications.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { NotificationRepository } from '../domain/notification-repository.js'
import { CountUnreadNotifications } from './count-unread-notifications.js'

function createMockRepo(): NotificationRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    countUnread: vi.fn().mockResolvedValue(7),
    countAlertsByEntityType: vi.fn(),
  }
}

describe('CountUnreadNotifications', () => {
  it('returns unread notification count', async () => {
    const repo = createMockRepo()
    const useCase = new CountUnreadNotifications(repo)

    const result = await useCase.execute('org-1', 'user-1')

    expect(result).toEqual({ count: 7 })
    expect(repo.countUnread).toHaveBeenCalledWith('org-1', 'user-1')
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && pnpm vitest run src/modules/notification/application/count-unread-notifications.spec.ts`
Expected: All 1 test PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/notification/application/count-unread-notifications.spec.ts
git commit -m "test(notification): add CountUnreadNotifications unit tests"
```

---

## Task 22: Notification — CreateNotification (Tier 4)

**Files:**

- Create: `packages/core/src/modules/notification/application/create-notification.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/core/src/modules/notification/application/create-notification.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { NotificationRepository } from '../domain/notification-repository.js'
import { CreateNotification } from './create-notification.js'

function createMockRepo(): NotificationRepository {
  return {
    create: vi.fn().mockImplementation(async (input) => ({
      id: 'notif-1',
      ...input,
      isRead: false,
      createdAt: new Date(),
    })),
    findById: vi.fn(),
    findMany: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    countUnread: vi.fn(),
    countAlertsByEntityType: vi.fn(),
  }
}

describe('CreateNotification', () => {
  it('creates notification with correct data', async () => {
    const repo = createMockRepo()
    const useCase = new CreateNotification(repo)

    const result = await useCase.execute({
      organizationId: 'org-1',
      userId: 'user-1',
      type: 'POLICY_EXPIRING',
      title: 'Apolice vence em 7 dias',
      entityType: 'Policy',
      entityId: 'pol-1',
    })

    expect(repo.create).toHaveBeenCalledWith({
      organizationId: 'org-1',
      userId: 'user-1',
      type: 'POLICY_EXPIRING',
      title: 'Apolice vence em 7 dias',
      entityType: 'Policy',
      entityId: 'pol-1',
    })
    expect(result.id).toBe('notif-1')
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/core && pnpm vitest run src/modules/notification/application/create-notification.spec.ts`
Expected: All 1 test PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/notification/application/create-notification.spec.ts
git commit -m "test(notification): add CreateNotification unit tests"
```

---

## Task 23: Final — Run All Tests and Verify

- [ ] **Step 1: Run all tests across the monorepo**

Run: `cd /home/artur/projects && pnpm test`
Expected: All tests PASS (existing 25 + new ~70 = ~95 total)

- [ ] **Step 2: Verify no lint errors in test files**

Run: `cd /home/artur/projects && pnpm lint`
Expected: Zero errors

- [ ] **Step 3: Final commit with updated backlog**

Update `docs/plans/fix/README.md` to mark H4 as resolved, then commit:

```bash
git add docs/plans/fix/README.md
git commit -m "docs: mark H4 test coverage as resolved — 23 use cases covered"
```
