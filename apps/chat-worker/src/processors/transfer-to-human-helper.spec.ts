import { beforeEach, describe, expect, it, vi } from 'vitest'

const updateOneMock = vi.fn()
const messageCreateMock = vi.fn()

vi.mock('@repo/db-chat', () => ({
  Conversation: {
    updateOne: (...args: unknown[]) => updateOneMock(...args),
  },
  Message: {
    create: (...args: unknown[]) => messageCreateMock(...args),
  },
}))

vi.mock('@repo/shared', () => ({
  CHAT_PUBSUB_CHANNELS: {
    INCOMING_MESSAGE: 'chat:incoming-message',
    CONVERSATION_UPDATE: 'chat:conversation-update',
  },
}))

import { transferConversationToHuman } from './transfer-to-human-helper.js'

describe('transferConversationToHuman', () => {
  const conversationId = 'conv-123'
  const tenantId = 'tenant-abc'
  const reason = 'Cotação registrada'
  const systemMessage = 'Transferindo para atendente humano'

  let publishMock: ReturnType<typeof vi.fn>
  let pubsubClient: { publish: typeof publishMock }

  beforeEach(() => {
    updateOneMock.mockReset()
    messageCreateMock.mockReset()
    publishMock = vi.fn().mockResolvedValue(undefined)
    pubsubClient = { publish: publishMock }
  })

  it('transfere conversa BOT_ACTIVE para WAITING_HUMAN com message + pubsub', async () => {
    updateOneMock.mockReturnValue({
      exec: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    })
    messageCreateMock.mockResolvedValue({
      _id: 'msg-1',
      createdAt: new Date('2026-01-01T10:00:00Z'),
    })

    const result = await transferConversationToHuman(
      conversationId,
      tenantId,
      pubsubClient,
      { reason, systemMessage }
    )

    expect(result).toEqual({ transferred: true, reason })
    expect(updateOneMock).toHaveBeenCalledWith(
      { _id: conversationId, tenantId, status: 'BOT_ACTIVE' },
      { $set: { status: 'WAITING_HUMAN' } }
    )
    expect(messageCreateMock).toHaveBeenCalledWith({
      conversationId,
      tenantId,
      senderType: 'SYSTEM',
      text: systemMessage,
      type: 'TEXT',
      status: 'DELIVERED',
    })
    expect(publishMock).toHaveBeenCalledTimes(2)
    expect(publishMock).toHaveBeenNthCalledWith(
      1,
      'chat:incoming-message',
      expect.stringContaining('"senderType":"SYSTEM"')
    )
    expect(publishMock).toHaveBeenNthCalledWith(
      2,
      'chat:conversation-update',
      expect.stringContaining('"status":"WAITING_HUMAN"')
    )
  })

  it('retorna transferred=false quando conversa não está BOT_ACTIVE (idempotência)', async () => {
    updateOneMock.mockReturnValue({
      exec: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    })

    const result = await transferConversationToHuman(
      conversationId,
      tenantId,
      pubsubClient,
      { reason, systemMessage }
    )

    expect(result).toEqual({ transferred: false, reason })
    expect(messageCreateMock).not.toHaveBeenCalled()
    expect(publishMock).not.toHaveBeenCalled()
  })

  it('usa fallback de createdAt quando Message.create retorna doc sem timestamp', async () => {
    updateOneMock.mockReturnValue({
      exec: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    })
    messageCreateMock.mockResolvedValue({ _id: 'msg-no-date' })

    const result = await transferConversationToHuman(
      conversationId,
      tenantId,
      pubsubClient,
      { reason, systemMessage }
    )

    expect(result).toEqual({ transferred: true, reason })
    const firstPublishPayload = publishMock.mock.calls[0]?.[1]
    expect(firstPublishPayload).toContain('"createdAt"')
  })

  it('retorna transferred=true mas suprime erro quando Message.create falha pós-updateOne', async () => {
    updateOneMock.mockReturnValue({
      exec: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    })
    messageCreateMock.mockRejectedValue(new Error('mongo down'))

    const result = await transferConversationToHuman(
      conversationId,
      tenantId,
      pubsubClient,
      { reason, systemMessage }
    )

    expect(result).toEqual({ transferred: true, reason })
    expect(publishMock).not.toHaveBeenCalled()
  })
})
