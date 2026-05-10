import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ConversationAlreadyAssignedError } from '../domain/errors.js'
import type { ConversationRepository } from '../domain/ports/conversation-repository.js'
import type { ConversationData } from '../domain/types.js'

import { AssignConversation } from './assign-conversation.js'

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
    assignedToName: 'Agent Smith',
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

function createMockRepo(
  atomicAssignResult: ConversationData | null
): ConversationRepository {
  return {
    findById: vi.fn(),
    findOpenByContactAndChannel: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    atomicTransition: vi.fn(),
    atomicAssign: vi.fn().mockResolvedValue(atomicAssignResult),
    updateLastMessage: vi.fn(),
    findStaleConversations: vi.fn(),
  }
}

const BASE_INPUT = {
  conversationId: 'conv-1',
  tenantId: 'tenant-1',
  agentId: 'agent-1',
  agentName: 'Agent Smith',
}

describe('AssignConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('returns updated conversation on successful atomic assign', async () => {
    const assigned = makeConversationData({
      status: 'HUMAN_ACTIVE',
      assignedTo: 'agent-1',
      assignedToName: 'Agent Smith',
    })
    const repo = createMockRepo(assigned)
    const useCase = new AssignConversation(repo)
    const result = await useCase.execute(BASE_INPUT)
    expect(result.assignedTo).toBe('agent-1')
    expect(result.assignedToName).toBe('Agent Smith')
    expect(result.status).toBe('HUMAN_ACTIVE')
    expect(repo.atomicAssign).toHaveBeenCalledWith(
      'conv-1',
      'tenant-1',
      'agent-1',
      'Agent Smith'
    )
  })
  it('throws ConversationAlreadyAssignedError when atomic assign returns null (race condition)', async () => {
    const repo = createMockRepo(null)
    const useCase = new AssignConversation(repo)
    await expect(useCase.execute(BASE_INPUT)).rejects.toThrow(
      ConversationAlreadyAssignedError
    )
  })
})
