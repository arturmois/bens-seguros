import { type Job, type Queue } from 'bullmq'
import pino from 'pino'
import { generateWithTools } from '@repo/ai'
import { AiAgent, Conversation, Message, Channel } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS, CHAT_QUEUES } from '@repo/shared'
import type { PubsubClient } from '../types/pubsub-client.js'
import { createEscalateToHumanTool } from '../tools/escalate-to-human.js'
import { createListProductsTool } from '../tools/list-products.js'
import { createCaptureLeadTool } from '../tools/capture-lead.js'
import { createSearchClientTool } from '../tools/search-client.js'
import { createUpdateClientDataTool } from '../tools/update-client-data.js'
import { createReportClaimTool } from '../tools/report-claim.js'
import { createRegisterFinancialInquiryTool } from '../tools/register-financial-inquiry.js'
import { createCollectInsuredAssetDataTool } from '../tools/collect-insured-asset-data.js'
import { createSearchProposalTool } from '../tools/search-proposal.js'
import { createSearchPolicyTool } from '../tools/search-policy.js'
import {
  type AiBotJobData,
  ESCALATION_TOOL_NAME,
  buildConversationMessages,
  buildSystemPrompt,
  escalateToHuman,
  getAiAgentConfig,
} from './ai-bot-helpers.js'

const logger = pino({ name: 'ai-bot-processor' })

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 86_400 },
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
      captureLead: createCaptureLeadTool(tenantId, contactPhone),
      searchClient: createSearchClientTool(tenantId),
      updateClientData: createUpdateClientDataTool(tenantId),
      reportClaim: createReportClaimTool(
        conversationId,
        tenantId,
        pubsubClient
      ),
      registerFinancialInquiry: createRegisterFinancialInquiryTool(
        conversationId,
        tenantId,
        pubsubClient
      ),
      collectInsuredAssetData: createCollectInsuredAssetDataTool(tenantId),
      searchProposal: createSearchProposalTool(tenantId),
      searchPolicy: createSearchPolicyTool(tenantId),
    }

    let result: Awaited<ReturnType<typeof generateWithTools>>
    try {
      result = await generateWithTools({
        systemPrompt,
        messages,
        tools,
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

    const escalatingTools = new Set([
      ESCALATION_TOOL_NAME,
      'reportClaim',
      'registerFinancialInquiry',
    ])
    const wasEscalated = result.toolResults.some((tr) =>
      escalatingTools.has(tr.toolName)
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
