import { container } from 'tsyringe'
import { z } from 'zod'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { AssignConversation } from '../../../application/assign-conversation.js'
import { TransferConversation } from '../../../application/transfer-conversation.js'
import { ReturnToQueue } from '../../../application/return-to-queue.js'
import { CloseConversation } from '../../../application/close-conversation.js'
import { SendMessage } from '../../../application/send-message.js'
import { MarkAsRead } from '../../../application/mark-as-read.js'
import { handleDomainError } from './conversation-error-handler.js'

const conversationIdSchema = z.object({ id: z.string().min(1) })

const transferBodySchema = z.object({
  toUserId: z.string().min(1),
  toUserName: z.string().min(1),
})

const sendMessageBodySchema = z.object({
  text: z.string().min(1).max(4096),
})

export async function conversationActionRoutes(
  app: FastifyInstance
): Promise<void> {
  app.post(
    '/chat/conversations/:id/assign',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof conversationIdSchema> }>,
      reply: FastifyReply
    ) => {
      const { id } = conversationIdSchema.parse(request.params)
      const tenantId = request.organizationId
      const { userId, name } = request.user

      try {
        const useCase = container.resolve(AssignConversation)
        const result = await useCase.execute({
          conversationId: id,
          tenantId,
          agentId: userId,
          agentName: name,
        })

        return reply.status(200).send({ success: true, data: result })
      } catch (error: unknown) {
        handleDomainError(error, reply)
      }
    }
  )

  app.post(
    '/chat/conversations/:id/transfer',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof conversationIdSchema>
        Body: z.infer<typeof transferBodySchema>
      }>,
      reply: FastifyReply
    ) => {
      const { id } = conversationIdSchema.parse(request.params)
      const { toUserId, toUserName } = transferBodySchema.parse(request.body)
      const tenantId = request.organizationId

      try {
        const useCase = container.resolve(TransferConversation)
        const result = await useCase.execute({
          conversationId: id,
          tenantId,
          targetAgentId: toUserId,
          targetAgentName: toUserName,
        })

        return reply.send({ success: true, data: result })
      } catch (error: unknown) {
        handleDomainError(error, reply)
      }
    }
  )

  app.post(
    '/chat/conversations/:id/return',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof conversationIdSchema> }>,
      reply: FastifyReply
    ) => {
      const { id } = conversationIdSchema.parse(request.params)
      const tenantId = request.organizationId

      try {
        const useCase = container.resolve(ReturnToQueue)
        const result = await useCase.execute({ conversationId: id, tenantId })

        return reply.send({ success: true, data: result })
      } catch (error: unknown) {
        handleDomainError(error, reply)
      }
    }
  )

  app.post(
    '/chat/conversations/:id/close',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof conversationIdSchema> }>,
      reply: FastifyReply
    ) => {
      const { id } = conversationIdSchema.parse(request.params)
      const tenantId = request.organizationId
      const { userId, name } = request.user

      try {
        const useCase = container.resolve(CloseConversation)
        const result = await useCase.execute({
          conversationId: id,
          tenantId,
          closedBy: userId,
          closedByName: name,
        })

        return reply.send({ success: true, data: result })
      } catch (error: unknown) {
        handleDomainError(error, reply)
      }
    }
  )

  app.post(
    '/chat/conversations/:id/messages',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof conversationIdSchema>
        Body: z.infer<typeof sendMessageBodySchema>
      }>,
      reply: FastifyReply
    ) => {
      const { id } = conversationIdSchema.parse(request.params)
      const { text } = sendMessageBodySchema.parse(request.body)
      const tenantId = request.organizationId
      const { userId, name } = request.user

      try {
        const useCase = container.resolve(SendMessage)
        const result = await useCase.execute({
          tenantId,
          conversationId: id,
          senderId: userId,
          senderName: name,
          senderType: 'AGENT',
          text,
        })

        return reply.status(201).send({ success: true, data: result })
      } catch (error: unknown) {
        handleDomainError(error, reply)
      }
    }
  )

  app.post(
    '/chat/conversations/:id/read',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof conversationIdSchema> }>,
      reply: FastifyReply
    ) => {
      const { id } = conversationIdSchema.parse(request.params)
      const tenantId = request.organizationId
      const { userId } = request.user

      const useCase = container.resolve(MarkAsRead)
      await useCase.execute({ conversationId: id, userId, tenantId })

      return reply.send({ success: true, data: null })
    }
  )
}
