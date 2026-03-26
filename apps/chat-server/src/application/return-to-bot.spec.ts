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
