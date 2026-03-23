import { type Job, type Queue } from 'bullmq'
import pino from 'pino'
import { generateWithTools } from '@repo/ai'
import { AiAgent, Conversation, Message, Channel } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS, CHAT_QUEUES } from '@repo/shared'
import type { PubsubClient } from '../types/pubsub-client.js'
import { createEscalarParaHumanoTool } from '../tools/escalar-para-humano.js'
import { createConsultarProdutosTool } from '../tools/consultar-produtos.js'
import { createCaptarLeadTool } from '../tools/captar-lead.js'
import {
  type AiBotJobData,
  ESCALATION_TOOL_NAME,
  buildConversationMessages,
  buildSystemPrompt,
  escalateToHuman,
  getAiAgentConfig,
} from './ai-bot-helpers.js'

const logger = pino({ name: 'ai-bot-processor' })
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

    // Step 1: Get channel to find aiAgentId
    const channel = await Channel.findOne({ _id: channelId, tenantId })
      .lean()
      .exec()
    if (!channel?.aiAgentId) {
      await escalateToHuman(conversationId, tenantId, pubsubClient)
      logger.info(
        { conversationId, tenantId },
        'No AI agent configured for channel, escalated to human'
      )
      return
    }

    // Step 2: Get agent by id
    const aiAgent = await AiAgent.findOne({
      _id: channel.aiAgentId,
      tenantId,
    })
      .lean()
      .exec()
    if (!aiAgent || !aiAgent.isActive) {
      await escalateToHuman(conversationId, tenantId, pubsubClient)
      logger.info(
        { conversationId, tenantId },
        'No active AI agent, escalated to human'
      )
      return
    }

    const config = getAiAgentConfig(aiAgent as Record<string, unknown>)

    const botMessageCount = await Message.countDocuments({
      conversationId,
      tenantId,
      senderType: 'BOT',
    }).exec()

    if (botMessageCount >= config.maxResponsesPerConversation) {
      await escalateToHuman(conversationId, tenantId, pubsubClient)
      logger.info(
        {
          conversationId,
          tenantId,
          botMessageCount,
          maxResponses: config.maxResponsesPerConversation,
        },
        'Max AI responses reached, escalated to human'
      )
      return
    }

    const recentMessages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
      .exec()

    const channelName =
      typeof channel?.name === 'string' ? channel.name : 'WhatsApp'

    const chronologicalMessages = [...recentMessages].reverse()
    const lastMessage = chronologicalMessages.at(-1)
    const contactName =
      typeof lastMessage?.senderName === 'string'
        ? lastMessage.senderName
        : 'Cliente'

    const messages = buildConversationMessages(chronologicalMessages)
    const systemPrompt = buildSystemPrompt(
      contactName,
      channelName,
      config.systemPrompt
    )

    const tools = {
      [ESCALATION_TOOL_NAME]: createEscalarParaHumanoTool(
        conversationId,
        tenantId,
        pubsubClient
      ),
      consultarProdutos: createConsultarProdutosTool(),
      captarLead: createCaptarLeadTool(
        tenantId,
        typeof conversation.whatsappPhone === 'string'
          ? conversation.whatsappPhone
          : ''
      ),
    }

    const result = await generateWithTools({
      systemPrompt,
      messages,
      tools,
      provider: config.provider,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      maxSteps: 3,
    })

    const wasEscalated = result.toolResults.some(
      (tr) => tr.toolName === ESCALATION_TOOL_NAME
    )

    if (wasEscalated) {
      logger.info(
        { conversationId, tenantId },
        'AI triggered escalation via tool'
      )
      return
    }

    const responseText = result.text
    if (!responseText) {
      logger.warn(
        { conversationId, tenantId, steps: result.steps },
        'AI returned empty response'
      )
      return
    }

    const savedMessage = await Message.create({
      conversationId,
      tenantId,
      senderType: 'BOT',
      senderName: 'Assistente Virtual',
      text: responseText,
      type: 'TEXT',
      status: 'PENDING',
    })

    await Conversation.updateOne(
      { _id: conversationId, tenantId },
      {
        $set: {
          lastMessageText: responseText,
          lastMessageAt: savedMessage.createdAt,
          updatedAt: savedMessage.createdAt,
        },
      }
    ).exec()

    await pubsubClient.publish(
      CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE,
      JSON.stringify({
        id: String(savedMessage._id),
        conversationId,
        tenantId,
        senderType: 'BOT',
        senderName: 'Assistente Virtual',
        senderId: null,
        text: responseText,
        type: 'TEXT',
        status: 'PENDING',
        externalId: null,
        createdAt:
          savedMessage.createdAt?.toISOString() ?? new Date().toISOString(),
      })
    )

    if (channel) {
      await sendMessageQueue.add(CHAT_QUEUES.SEND_MESSAGE, {
        messageId: String(savedMessage._id),
        conversationId,
        channelId,
        tenantId,
        to: conversation.whatsappPhone,
        text: responseText,
        type: 'TEXT',
      })
    }

    logger.info(
      {
        conversationId,
        tenantId,
        responseLength: responseText.length,
        steps: result.steps,
        toolsCalled: result.toolResults.map((tr) => tr.toolName),
      },
      'AI bot response generated and enqueued'
    )
  }
}
