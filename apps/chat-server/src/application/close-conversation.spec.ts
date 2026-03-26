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
