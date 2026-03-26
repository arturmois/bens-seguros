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
