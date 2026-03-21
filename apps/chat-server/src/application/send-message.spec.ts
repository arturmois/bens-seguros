import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ConversationNotFoundError } from '../domain/errors.js';
import type { ConversationRepository } from '../domain/ports/conversation-repository.js';
import type { MessageRepository } from '../domain/ports/message-repository.js';
import type { ConversationData } from '../domain/types.js';

import { SendMessage, type QueueProducer } from './send-message.js';

function makeConversationData(overrides: Partial<ConversationData> = {}): ConversationData {
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
  };
}

function createMockConversationRepo(
  findByIdResult: ConversationData | null,
): ConversationRepository {
  return {
    findById: vi.fn().mockResolvedValue(findByIdResult),
    findOpenByContactAndChannel: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    atomicAssign: vi.fn(),
    updateLastMessage: vi.fn().mockResolvedValue(undefined),
    findStaleConversations: vi.fn(),
  };
}

function createMockMessageRepo(): MessageRepository {
  return {
    create: vi.fn().mockImplementation(async (data) => data),
    findByConversation: vi.fn(),
    findByExternalId: vi.fn(),
    updateStatus: vi.fn(),
    findAfterTimestamp: vi.fn(),
  };
}

function createMockQueueProducer(): QueueProducer {
  return {
    enqueue: vi.fn().mockResolvedValue(undefined),
  };
}

const BASE_INPUT = {
  tenantId: 'tenant-1',
  conversationId: 'conv-1',
  senderId: 'agent-1',
  senderName: 'Agent',
  senderType: 'AGENT' as const,
  text: 'Hello, how can I help?',
};

describe('SendMessage', () => {
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;
  let queueProducer: QueueProducer;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates message with PENDING status and enqueues to send queue', async () => {
    const conversation = makeConversationData();
    conversationRepo = createMockConversationRepo(conversation);
    messageRepo = createMockMessageRepo();
    queueProducer = createMockQueueProducer();

    const useCase = new SendMessage(conversationRepo, messageRepo, queueProducer);
    const result = await useCase.execute(BASE_INPUT);

    expect(result.status).toBe('PENDING');
    expect(result.text).toBe('Hello, how can I help?');
    expect(result.senderType).toBe('AGENT');
    expect(messageRepo.create).toHaveBeenCalledTimes(1);
    expect(queueProducer.enqueue).toHaveBeenCalledWith(
      'chat:send',
      expect.objectContaining({
        messageId: result.id,
        conversationId: 'conv-1',
        channelId: 'channel-1',
        tenantId: 'tenant-1',
        text: 'Hello, how can I help?',
        whatsappPhone: '+5511999990000',
      }),
    );
  });

  it('updates conversation lastMessage after creating message', async () => {
    conversationRepo = createMockConversationRepo(makeConversationData());
    messageRepo = createMockMessageRepo();
    queueProducer = createMockQueueProducer();

    const useCase = new SendMessage(conversationRepo, messageRepo, queueProducer);
    await useCase.execute(BASE_INPUT);

    expect(conversationRepo.updateLastMessage).toHaveBeenCalledWith(
      'conv-1',
      'tenant-1',
      'Hello, how can I help?',
      expect.any(Date),
    );
  });

  it('throws ConversationNotFoundError when conversation does not exist', async () => {
    conversationRepo = createMockConversationRepo(null);
    messageRepo = createMockMessageRepo();
    queueProducer = createMockQueueProducer();

    const useCase = new SendMessage(conversationRepo, messageRepo, queueProducer);

    await expect(useCase.execute(BASE_INPUT)).rejects.toThrow(ConversationNotFoundError);
    expect(messageRepo.create).not.toHaveBeenCalled();
    expect(queueProducer.enqueue).not.toHaveBeenCalled();
  });
});
