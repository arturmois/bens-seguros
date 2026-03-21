import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { ContactRepository } from '../domain/ports/contact-repository.js';
import type { ConversationRepository } from '../domain/ports/conversation-repository.js';
import type { MessageRepository } from '../domain/ports/message-repository.js';
import type { ContactData, ConversationData, MessageData } from '../domain/types.js';

import { SaveIncomingMessage } from './save-incoming-message.js';

function makeConversationData(overrides: Partial<ConversationData> = {}): ConversationData {
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
  };
}

function makeContactData(overrides: Partial<ContactData> = {}): ContactData {
  return {
    id: 'contact-1',
    tenantId: 'tenant-1',
    whatsappPhone: '+5511999990000',
    pushName: 'John',
    profilePicUrl: null,
    clientId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeMessageData(overrides: Partial<MessageData> = {}): MessageData {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    tenantId: 'tenant-1',
    senderType: 'CLIENT',
    senderName: 'John',
    senderId: 'contact-1',
    text: 'Hello',
    type: 'TEXT',
    mediaUrl: null,
    mediaKey: null,
    status: 'DELIVERED',
    metadata: null,
    externalId: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function createMockConversationRepo(
  findByIdResult: ConversationData | null = null,
  findOpenResult: ConversationData | null = null,
): ConversationRepository {
  return {
    findById: vi.fn().mockResolvedValue(findByIdResult),
    findOpenByContactAndChannel: vi.fn().mockResolvedValue(findOpenResult),
    findMany: vi.fn(),
    create: vi.fn().mockImplementation(async (data) => data),
    updateStatus: vi.fn(),
    atomicAssign: vi.fn(),
    updateLastMessage: vi.fn().mockResolvedValue(undefined),
    findStaleConversations: vi.fn(),
  };
}

function createMockMessageRepo(
  findByExternalIdResult: MessageData | null = null,
): MessageRepository {
  return {
    create: vi.fn().mockImplementation(async (data) => data),
    findByConversation: vi.fn(),
    findByExternalId: vi.fn().mockResolvedValue(findByExternalIdResult),
    updateStatus: vi.fn(),
    findAfterTimestamp: vi.fn(),
  };
}

function createMockContactRepo(result: ContactData): ContactRepository {
  return {
    findById: vi.fn(),
    findByPhone: vi.fn(),
    upsertByPhone: vi.fn().mockResolvedValue(result),
  };
}

const BASE_INPUT = {
  tenantId: 'tenant-1',
  channelId: 'channel-1',
  whatsappPhone: '+5511999990000',
  pushName: 'John',
  text: 'Hello',
  type: 'TEXT' as const,
  mediaUrl: null,
  mediaKey: null,
  externalId: null,
  hasAi: false,
};

describe('SaveIncomingMessage', () => {
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;
  let contactRepo: ContactRepository;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates new conversation when none exists for the contact', async () => {
    const contact = makeContactData();
    conversationRepo = createMockConversationRepo(null, null);
    messageRepo = createMockMessageRepo(null);
    contactRepo = createMockContactRepo(contact);

    const useCase = new SaveIncomingMessage(conversationRepo, messageRepo, contactRepo);
    const result = await useCase.execute(BASE_INPUT);

    expect(result.isNewConversation).toBe(true);
    expect(result.isDuplicate).toBe(false);
    expect(conversationRepo.create).toHaveBeenCalledTimes(1);
    expect(messageRepo.create).toHaveBeenCalledTimes(1);
    expect(conversationRepo.updateLastMessage).toHaveBeenCalledTimes(1);
  });

  it('appends message to existing open conversation', async () => {
    const contact = makeContactData();
    const existingConversation = makeConversationData();
    conversationRepo = createMockConversationRepo(null, existingConversation);
    messageRepo = createMockMessageRepo(null);
    contactRepo = createMockContactRepo(contact);

    const useCase = new SaveIncomingMessage(conversationRepo, messageRepo, contactRepo);
    const result = await useCase.execute(BASE_INPUT);

    expect(result.isNewConversation).toBe(false);
    expect(result.isDuplicate).toBe(false);
    expect(result.conversation.id).toBe('conv-1');
    expect(conversationRepo.create).not.toHaveBeenCalled();
    expect(messageRepo.create).toHaveBeenCalledTimes(1);
  });

  it('deduplicates message by externalId', async () => {
    const existingMessage = makeMessageData({ externalId: 'ext-123' });
    const existingConversation = makeConversationData();

    conversationRepo = createMockConversationRepo(existingConversation, null);
    messageRepo = createMockMessageRepo(existingMessage);
    contactRepo = createMockContactRepo(makeContactData());

    const useCase = new SaveIncomingMessage(conversationRepo, messageRepo, contactRepo);
    const result = await useCase.execute({ ...BASE_INPUT, externalId: 'ext-123' });

    expect(result.isDuplicate).toBe(true);
    expect(result.isNewConversation).toBe(false);
    expect(result.message.id).toBe('msg-1');
    expect(contactRepo.upsertByPhone).not.toHaveBeenCalled();
    expect(vi.mocked(messageRepo.create)).not.toHaveBeenCalled();
  });

  it('upserts contact with pushName before finding conversation', async () => {
    const contact = makeContactData({ pushName: 'Updated Name' });
    conversationRepo = createMockConversationRepo(null, makeConversationData());
    messageRepo = createMockMessageRepo(null);
    contactRepo = createMockContactRepo(contact);

    const useCase = new SaveIncomingMessage(conversationRepo, messageRepo, contactRepo);
    await useCase.execute({ ...BASE_INPUT, pushName: 'Updated Name' });

    expect(contactRepo.upsertByPhone).toHaveBeenCalledWith(
      'tenant-1',
      '+5511999990000',
      'Updated Name',
    );
  });

  it('creates BOT_ACTIVE conversation when hasAi is true', async () => {
    const contact = makeContactData();
    conversationRepo = createMockConversationRepo(null, null);
    messageRepo = createMockMessageRepo(null);
    contactRepo = createMockContactRepo(contact);

    const useCase = new SaveIncomingMessage(conversationRepo, messageRepo, contactRepo);
    await useCase.execute({ ...BASE_INPUT, hasAi: true });

    const createdData = vi.mocked(conversationRepo.create).mock.calls[0]?.[0];
    expect(createdData?.status).toBe('BOT_ACTIVE');
  });
});
