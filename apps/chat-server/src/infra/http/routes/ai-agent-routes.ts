import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { AiAgent, Channel } from '@repo/db-chat'

const agentIdSchema = z.object({ id: z.string().min(1) })

const createAgentBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).nullable().optional(),
  systemPrompt: z.string().max(2000).optional(),
  provider: z.enum(['claude', 'openai']).optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(100).max(2000).optional(),
  maxResponsesPerConversation: z.number().min(5).max(100).optional(),
  isActive: z.boolean().optional(),
})

const updateAgentBodySchema = createAgentBodySchema.partial()

function mapAgent(doc: {
  _id: unknown
  [key: string]: unknown
}): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(doc)) {
    if (key !== '_id' && key !== '__v') {
      mapped[key] = value
    }
  }
  mapped['id'] = String(doc['_id'])
  return mapped
}

export async function aiAgentRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/chat/ai-agents',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.organizationId
      const agents = await AiAgent.find({ tenantId }).lean().exec()
      const agentIds = agents.map((a) => String(a._id))

      const channelCounts = await Channel.aggregate<{
        _id: string
        count: number
        names: string[]
      }>([
        { $match: { tenantId, aiAgentId: { $in: agentIds } } },
        {
          $group: {
            _id: '$aiAgentId',
            count: { $sum: 1 },
            names: { $push: '$name' },
          },
        },
      ])

      const countsByAgentId = new Map(
        channelCounts.map((c) => [c._id, { count: c.count, names: c.names }])
      )

      const data = agents.map((agent) => {
        const agentId = String(agent._id)
        const linked = countsByAgentId.get(agentId)
        return {
          ...mapAgent(agent),
          linkedChannelCount: linked?.count ?? 0,
          linkedChannelNames: linked?.names ?? [],
        }
      })

      return reply.send({ success: true, data })
    }
  )

  app.post(
    '/chat/ai-agents',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createAgentBodySchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.organizationId
      const body = createAgentBodySchema.parse(request.body)

      const existing = await AiAgent.findOne({ tenantId, name: body.name })
        .lean()
        .exec()
      if (existing) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'AGENT_NAME_ALREADY_EXISTS',
            message: 'An agent with this name already exists',
          },
        })
      }

      const agent = await AiAgent.create({ ...body, tenantId })
      return reply
        .status(201)
        .send({ success: true, data: mapAgent(agent.toObject()) })
    }
  )

  app.get(
    '/chat/ai-agents/:id',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof agentIdSchema> }>,
      reply: FastifyReply
    ) => {
      const { id } = agentIdSchema.parse(request.params)
      const tenantId = request.organizationId

      const agent = await AiAgent.findOne({ _id: id, tenantId }).lean().exec()
      if (!agent) {
        return reply.status(404).send({
          success: false,
          error: { code: 'AGENT_NOT_FOUND', message: 'AI agent not found' },
        })
      }

      const linkedChannels = await Channel.find(
        { tenantId, aiAgentId: id },
        { name: 1 }
      )
        .lean()
        .exec()

      return reply.send({
        success: true,
        data: {
          ...mapAgent(agent),
          linkedChannels: linkedChannels.map((c) => ({
            id: String(c._id),
            name: c.name,
          })),
        },
      })
    }
  )

  app.put(
    '/chat/ai-agents/:id',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof agentIdSchema>
        Body: z.infer<typeof updateAgentBodySchema>
      }>,
      reply: FastifyReply
    ) => {
      const { id } = agentIdSchema.parse(request.params)
      const tenantId = request.organizationId
      const body = updateAgentBodySchema.parse(request.body)

      if (body.name !== undefined) {
        const conflict = await AiAgent.findOne({
          tenantId,
          name: body.name,
          _id: { $ne: id },
        })
          .lean()
          .exec()
        if (conflict) {
          return reply.status(409).send({
            success: false,
            error: {
              code: 'AGENT_NAME_ALREADY_EXISTS',
              message: 'An agent with this name already exists',
            },
          })
        }
      }

      const agent = await AiAgent.findOneAndUpdate(
        { _id: id, tenantId },
        { $set: body },
        { new: true }
      )
        .lean()
        .exec()

      if (!agent) {
        return reply.status(404).send({
          success: false,
          error: { code: 'AGENT_NOT_FOUND', message: 'AI agent not found' },
        })
      }

      return reply.send({ success: true, data: mapAgent(agent) })
    }
  )

  app.delete(
    '/chat/ai-agents/:id',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof agentIdSchema> }>,
      reply: FastifyReply
    ) => {
      const { id } = agentIdSchema.parse(request.params)
      const tenantId = request.organizationId

      const agent = await AiAgent.findOne({ _id: id, tenantId }).lean().exec()
      if (!agent) {
        return reply.status(404).send({
          success: false,
          error: { code: 'AGENT_NOT_FOUND', message: 'AI agent not found' },
        })
      }

      const linkedChannels = await Channel.find(
        { tenantId, aiAgentId: id },
        { name: 1 }
      )
        .lean()
        .exec()

      if (linkedChannels.length > 0) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'AGENT_HAS_LINKED_CHANNELS',
            message: 'Cannot delete agent with linked channels',
          },
          channels: linkedChannels.map((c) => ({
            id: String(c._id),
            name: c.name,
          })),
        })
      }

      await AiAgent.deleteOne({ _id: id, tenantId })
      return reply.status(204).send()
    }
  )
}
