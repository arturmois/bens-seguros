import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import {
  validateMetaAppCredentials,
  validateMetaCredentials,
} from './channel-meta-service.js'

const validateMetaBodySchema = z.object({
  pageId: z.string().min(1),
  token: z.string().min(1),
  channelType: z.enum(['INSTAGRAM', 'MESSENGER', 'WHATSAPP_META']),
  metaAppId: z.string().min(1).optional(),
  metaAppSecret: z.string().min(1).optional(),
})

export async function channelWebhookRoutes(
  app: FastifyInstance
): Promise<void> {
  app.post(
    '/chat/channels/validate-meta',
    async (
      request: FastifyRequest<{
        Body: z.infer<typeof validateMetaBodySchema>
      }>,
      reply: FastifyReply
    ) => {
      const { pageId, token, channelType, metaAppId, metaAppSecret } =
        validateMetaBodySchema.parse(request.body)
      const result = await validateMetaCredentials(pageId, token, channelType)
      if (!result.valid) {
        return reply.status(422).send({
          success: false,
          error: {
            code: 'INVALID_META_CREDENTIALS',
            message: result.error,
          },
        })
      }
      if (metaAppId && metaAppSecret) {
        const appResult = await validateMetaAppCredentials(
          metaAppId,
          metaAppSecret
        )
        if (!appResult.valid) {
          return reply.status(422).send({
            success: false,
            error: {
              code: 'INVALID_APP_CREDENTIALS',
              message: appResult.error ?? 'Falha ao validar credenciais do App',
            },
          })
        }
      }
      return reply.send({
        success: true,
        data: { name: result.name, username: result.username },
      })
    }
  )
}
