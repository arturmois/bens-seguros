import { generateWithTools } from '@repo/ai'
import type { ContactSource } from '@repo/db'
import {
  AiAgent,
  Channel,
  type ChannelType,
  Contact,
  Conversation,
  Message,
} from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS, CHAT_QUEUES } from '@repo/shared'
import { type Job, type Queue } from 'bullmq'
import pino from 'pino'
import { createCaptureLeadTool } from '../tools/capture-lead.js'
import { createCollectInsuredAssetDataTool } from '../tools/collect-insured-asset-data.js'
import { createEscalateToHumanTool } from '../tools/escalate-to-human.js'
import { createListProductsTool } from '../tools/list-products.js'
import { createSearchClientTool } from '../tools/search-client.js'
import {
  CONFIGURABLE_TOOL_NAMES,
  MANDATORY_TOOLS,
} from '../tools/tool-registry.js'
import type { PubsubClient } from '../types/pubsub-client.js'
import {
  type AiBotJobData,
  ESCALATION_TOOL_NAME,
  buildConversationMessages,
  buildSystemPrompt,
  escalateToHuman,
  findUnknownToolReferences,
  getAiAgentConfig,
  isProviderConfigured,
} from './ai-bot-helpers.js'

const logger = pino({ name: 'ai-bot-processor' })

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 86_400 },
}

function channelTypeToContactSource(channelType: ChannelType): ContactSource {
  switch (channelType) {
    case 'WEB_CHAT':
      return 'CHAT_WIDGET'
    case 'WHATSAPP':
      return 'CHAT_WHATSAPP'
    case 'MESSENGER':
    case 'INSTAGRAM':
      logger.warn(
        { channelType },
        'Meta channel mapped to MANUAL source — CHAT_MESSENGER/CHAT_INSTAGRAM enum not yet wired'
      )
      return 'MANUAL'
    default:
      throw new Error(
        `Unsupported channel type: ${channelType satisfies never}`
      )
  }
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
    const unknownToolReferences = findUnknownToolReferences(
      config.systemPrompt,
      [...MANDATORY_TOOLS, ...CONFIGURABLE_TOOL_NAMES]
    )
    if (unknownToolReferences.length > 0) {
      logger.warn(
        {
          conversationId,
          tenantId,
          agentId: String(channel.aiAgentId),
          unknownToolReferences,
        },
        'AI agent system prompt references tool names that are not registered — model will not be able to call them'
      )
    }
    if (!isProviderConfigured(config.provider)) {
      logger.error(
        { conversationId, tenantId, provider: config.provider },
        'AI provider API key not configured — all bot conversations will escalate. Check ANTHROPIC_API_KEY / OPENAI_API_KEY in .env'
      )
      await escalateToHuman(conversationId, tenantId, pubsubClient)
      return
    }
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
    const contactDoc = await Contact.findById(conversation.contactId)
      .lean()
      .exec()
    const contactName =
      typeof contactDoc?.name === 'string' && contactDoc.name.length > 0
        ? contactDoc.name
        : typeof lastMessage?.senderName === 'string'
          ? lastMessage.senderName
          : 'Cliente'
    const messages = buildConversationMessages(chronologicalMessages)
    const contactPhone =
      typeof conversation.whatsappPhone === 'string'
        ? conversation.whatsappPhone
        : ''
    const tools = {
      [ESCALATION_TOOL_NAME]: createEscalateToHumanTool(
        conversationId,
        tenantId,
        pubsubClient
      ),
      listProducts: createListProductsTool(),
      captureLead: createCaptureLeadTool(
        tenantId,
        contactPhone,
        channelTypeToContactSource(channel.type)
      ),
      searchClient: createSearchClientTool(tenantId),
      collectInsuredAssetData: createCollectInsuredAssetDataTool(tenantId),
    }
    const filteredTools = Object.fromEntries(
      Object.entries(tools).filter(
        ([name]) =>
          MANDATORY_TOOLS.includes(name as (typeof MANDATORY_TOOLS)[number]) ||
          config.enabledTools.includes(name)
      )
    )
    const systemPrompt = buildSystemPrompt(
      contactName,
      channelName,
      config.systemPrompt,
      config.enabledTools
    )
    let result: Awaited<ReturnType<typeof generateWithTools>>
    try {
      result = await generateWithTools({
        systemPrompt,
        messages,
        tools: filteredTools,
        provider: config.provider,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        maxSteps: 10,
      })
    } catch (err: unknown) {
      logger.error(
        { err, conversationId, tenantId },
        'AI generation failed, escalating to human'
      )
      await escalateToHuman(conversationId, tenantId, pubsubClient)
      return
    }
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
        'AI returned empty response, escalating to human'
      )
      await escalateToHuman(conversationId, tenantId, pubsubClient)
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
    await sendMessageQueue.add(
      CHAT_QUEUES.SEND_MESSAGE,
      {
        messageId: String(savedMessage._id),
        conversationId,
        channelId,
        tenantId,
        to: conversation.whatsappPhone,
        text: responseText,
        type: 'TEXT',
      },
      DEFAULT_JOB_OPTIONS
    )
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
