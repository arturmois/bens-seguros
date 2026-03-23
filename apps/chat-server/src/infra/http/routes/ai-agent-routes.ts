import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { AiAgent } from '@repo/db-chat'

const channelIdSchema = z.object({ id: z.string().min(1) })

const aiAgentBodySchema = z.object({
  systemPrompt: z.string().max(2000).optional(),
  provider: z.enum(['claude', 'openai']).optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(100).max(2000).optional(),
  maxResponsesPerConversation: z.number().min(5).max(100).optional(),
  isActive: z.boolean().optional(),
})

const DEFAULT_AI_AGENT = {
  systemPrompt: '',
  provider: 'claude' as const,
  temperature: 0.7,
  maxTokens: 300,
  maxResponsesPerConversation: 20,
  isActive: false,
}

function mapAiAgent(doc: Record<string, unknown>): Record<string, unknown> {
  const { _id, ...rest } = doc
  delete rest['__v']
  return { id: String(_id), ...rest }
}

export async function aiAgentRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/chat/channels/:id/ai-agent',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof channelIdSchema> }>,
      reply: FastifyReply
    ) => {
      const { id: channelId } = channelIdSchema.parse(request.params)
      const tenantId = request.organizationId

      const agent = await AiAgent.findOne({ tenantId, channelId }).lean().exec()

      if (!agent) {
        return reply.send({
          success: true,
          data: {
            channelId,
            tenantId,
            ...DEFAULT_AI_AGENT,
          },
        })
      }

      return reply.send({
        success: true,
        data: mapAiAgent(agent as unknown as Record<string, unknown>),
      })
    }
  )

  app.put(
    '/chat/channels/:id/ai-agent',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof channelIdSchema>
        Body: z.infer<typeof aiAgentBodySchema>
      }>,
      reply: FastifyReply
    ) => {
      const { id: channelId } = channelIdSchema.parse(request.params)
      const tenantId = request.organizationId
      const body = aiAgentBodySchema.parse(request.body)

      const agent = await AiAgent.findOneAndUpdate(
        { tenantId, channelId },
        { $set: { ...body, tenantId, channelId } },
        { upsert: true, new: true }
      )
        .lean()
        .exec()

      return reply.send({
        success: true,
        data: mapAiAgent(agent as unknown as Record<string, unknown>),
      })
    }
  )
}
