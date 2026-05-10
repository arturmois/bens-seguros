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
