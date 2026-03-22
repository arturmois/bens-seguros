import { type Job, type Queue } from 'bullmq'
import pino from 'pino'
import { generate } from '@repo/ai'
import type { AIProvider } from '@repo/ai'
import { AiAgent, Conversation, Message, Channel } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS, CHAT_LIMITS, CHAT_QUEUES } from '@repo/shared'
import type { PubsubClient } from '../types/pubsub-client.js'

const logger = pino({ name: 'ai-bot-processor' })

const DEFAULT_SYSTEM_PROMPT =
  'Voce e um assistente de uma corretora de seguros. Responda de forma educada e profissional em portugues brasileiro. Se o cliente quiser falar com um atendente humano, diga que vai transferi-lo.'

const ESCALATION_MESSAGE = 'Transferido para um atendente. Aguarde.'

export interface AiBotJobData {
  readonly conversationId: string
  readonly tenantId: string
  readonly messageId: string
}

async function escalateToHuman(
  conversationId: string,
  tenantId: string,
  pubsubClient: PubsubClient
): Promise<void> {
  await Conversation.updateOne(
    { _id: conversationId, tenantId },
    { $set: { status: 'WAITING_HUMAN' } }
  ).exec()

  await Message.create({
    conversationId,
    tenantId,
    senderType: 'SYSTEM',
    text: ESCALATION_MESSAGE,
    type: 'TEXT',
    status: 'DELIVERED',
  })

  await pubsubClient.publish(
    CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE,
    JSON.stringify({ tenantId, conversationId, status: 'WAITING_HUMAN' })
  )
}

export function createAiBotProcessor(
  pubsubClient: PubsubClient,
  sendMessageQueue: Queue
) {
  return async function processAiBot(job: Job<AiBotJobData>): Promise<void> {
    const { conversationId, tenantId } = job.data

    const conversation = await Conversation.findById(conversationId)
      .lean()
      .exec()
    if (!conversation || conversation.status !== 'BOT_ACTIVE') return

    const channelId = String(conversation.channelId)

    const aiAgent = await AiAgent.findOne({ tenantId, channelId }).lean().exec()
    if (!aiAgent || !aiAgent.isActive) {
      await escalateToHuman(conversationId, tenantId, pubsubClient)
      logger.info(
        { conversationId, tenantId },
        'No active AI agent, escalated to human'
      )
      return
    }

    // Check max responses per conversation
    const botMessageCount = await Message.countDocuments({
      conversationId,
      tenantId,
      senderType: 'BOT',
    }).exec()

    const maxResponses =
      (aiAgent.maxResponsesPerConversation as number | undefined) ??
      CHAT_LIMITS.MAX_AI_RESPONSES_PER_CONVERSATION

    if (botMessageCount >= maxResponses) {
      await escalateToHuman(conversationId, tenantId, pubsubClient)
      logger.info(
        { conversationId, tenantId, botMessageCount, maxResponses },
        'Max AI responses reached, escalated to human'
      )
      return
    }

    // Get recent messages for context
    const recentMessages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
      .exec()

    const context = recentMessages
      .reverse()
      .map((m) => {
        const role =
          m.senderType === 'CLIENT'
            ? 'Cliente'
            : m.senderType === 'BOT'
              ? 'Assistente'
              : 'Sistema'
        return `${role}: ${m.text ?? ''}`
      })
      .join('\n')

    const systemPrompt =
      (aiAgent.systemPrompt as string | undefined) ?? DEFAULT_SYSTEM_PROMPT

    const lastMessage = recentMessages.at(-1)
    const contactName = lastMessage?.senderName ?? 'Cliente'
    const userMessage = `Contexto da conversa:\n${context}\n\nNova mensagem de ${contactName}: ${lastMessage?.text ?? ''}`

    const response = await generate({
      systemPrompt,
      userMessage,
      provider: ((aiAgent.provider as string | undefined) ??
        'claude') as AIProvider,
      maxTokens: (aiAgent.maxTokens as number | undefined) ?? 300,
      temperature: (aiAgent.temperature as number | undefined) ?? 0.7,
    })

    // Save bot response
    const savedMessage = await Message.create({
      conversationId,
      tenantId,
      senderType: 'BOT',
      senderName: 'Assistente Virtual',
      text: response,
      type: 'TEXT',
      status: 'PENDING',
    })

    // Update conversation lastMessage
    await Conversation.updateOne(
      { _id: conversationId, tenantId },
      {
        $set: {
          lastMessageText: response,
          lastMessageAt: savedMessage.createdAt,
          updatedAt: savedMessage.createdAt,
        },
      }
    ).exec()

    // Publish to Socket.IO
    await pubsubClient.publish(
      CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE,
      JSON.stringify({
        id: String(savedMessage._id),
        conversationId,
        tenantId,
        senderType: 'BOT',
        senderName: 'Assistente Virtual',
        senderId: null,
        text: response,
        type: 'TEXT',
        status: 'PENDING',
        externalId: null,
        createdAt:
          savedMessage.createdAt?.toISOString() ?? new Date().toISOString(),
      })
    )

    // Enqueue for sending via WhatsApp
    const channel = await Channel.findById(channelId).lean().exec()
    if (channel) {
      await sendMessageQueue.add(CHAT_QUEUES.SEND_MESSAGE, {
        messageId: String(savedMessage._id),
        channelId,
        tenantId,
        to: conversation.whatsappPhone,
        text: response,
        type: 'TEXT',
      })
    }

    logger.info(
      { conversationId, tenantId, responseLength: response.length },
      'AI bot response generated and enqueued'
    )
  }
}
