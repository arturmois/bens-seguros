import { type Job, type Queue } from 'bullmq'
import type { CoreMessage } from 'ai'
import pino from 'pino'
import { generateWithTools } from '@repo/ai'
import type { AIProvider } from '@repo/ai'
import { AiAgent, Conversation, Message, Channel } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS, CHAT_LIMITS, CHAT_QUEUES } from '@repo/shared'
import type { PubsubClient } from '../types/pubsub-client.js'
import { createEscalarParaHumanoTool } from '../tools/escalar-para-humano.js'
import { createConsultarProdutosTool } from '../tools/consultar-produtos.js'
import { createCaptarLeadTool } from '../tools/captar-lead.js'

const logger = pino({ name: 'ai-bot-processor' })

const DEFAULT_SYSTEM_PROMPT =
  'Voce e um assistente de uma corretora de seguros. Responda de forma educada e profissional em portugues brasileiro. Se o cliente quiser falar com um atendente humano, diga que vai transferi-lo.'

const ESCALATION_TOOL_NAME = 'escalarParaHumano'

export interface AiBotJobData {
  readonly conversationId: string
  readonly tenantId: string
  readonly messageId: string
}

interface AiAgentConfig {
  systemPrompt: string
  provider: AIProvider
  temperature: number
  maxTokens: number
  maxResponsesPerConversation: number
}

function getAiAgentConfig(doc: Record<string, unknown>): AiAgentConfig {
  return {
    systemPrompt:
      typeof doc['systemPrompt'] === 'string'
        ? doc['systemPrompt']
        : DEFAULT_SYSTEM_PROMPT,
    provider: doc['provider'] === 'openai' ? 'openai' : 'claude',
    temperature:
      typeof doc['temperature'] === 'number' ? doc['temperature'] : 0.7,
    maxTokens: typeof doc['maxTokens'] === 'number' ? doc['maxTokens'] : 300,
    maxResponsesPerConversation:
      typeof doc['maxResponsesPerConversation'] === 'number'
        ? doc['maxResponsesPerConversation']
        : CHAT_LIMITS.MAX_AI_RESPONSES_PER_CONVERSATION,
  }
}

interface LeanMessage {
  readonly senderType?: string
  readonly text?: string | null
  readonly senderName?: string | null
}

function buildConversationMessages(
  recentMessages: ReadonlyArray<LeanMessage>
): CoreMessage[] {
  return recentMessages
    .filter((m) => m.senderType === 'CLIENT' || m.senderType === 'BOT')
    .map((m): CoreMessage => {
      if (m.senderType === 'BOT') {
        return { role: 'assistant', content: m.text ?? '' }
      }
      return { role: 'user', content: m.text ?? '' }
    })
}

function buildSystemPrompt(contactName: string, customPrompt?: string): string {
  const base = customPrompt ?? DEFAULT_SYSTEM_PROMPT
  return [
    base,
    '',
    'Contexto adicional:',
    `- Voce esta conversando com: ${contactName}`,
    '- Canal: WhatsApp',
    '- Se o cliente quiser falar com um humano, use a ferramenta escalarParaHumano',
    '- Se o cliente perguntar sobre seguros disponiveis, use consultarProdutos',
    '- Se o cliente demonstrar interesse em cotar/contratar, use captarLead',
    '- Responda de forma concisa e natural, como em uma conversa de WhatsApp',
  ].join('\n')
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
    text: 'Transferido para um atendente. Aguarde.',
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

    const chronologicalMessages = [...recentMessages].reverse()
    const lastMessage = chronologicalMessages.at(-1)
    const contactName =
      typeof lastMessage?.senderName === 'string'
        ? lastMessage.senderName
        : 'Cliente'

    const messages = buildConversationMessages(chronologicalMessages)
    const systemPrompt = buildSystemPrompt(contactName, config.systemPrompt)

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

    const channel = await Channel.findById(channelId).lean().exec()
    if (channel) {
      await sendMessageQueue.add(CHAT_QUEUES.SEND_MESSAGE, {
        messageId: String(savedMessage._id),
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
