import { Channel } from '@repo/db-chat'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { getChannelConfig, isValidObjectId } from './widget-helpers.js'

const channelIdParamSchema = z.object({
  channelId: z.string().min(1),
})

export async function widgetConfigRoute(app: FastifyInstance): Promise<void> {
  app.get(
    '/config/:channelId',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof channelIdParamSchema>
      }>,
      reply: FastifyReply
    ) => {
      const params = channelIdParamSchema.safeParse(request.params)
      if (!params.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'channelId inválido' },
        })
      }
      const { channelId } = params.data
      if (!isValidObjectId(channelId)) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'CHANNEL_NOT_FOUND',
            message: 'Canal não encontrado',
          },
        })
      }
      const channel = await Channel.findOne({
        _id: channelId,
        isActive: true,
        type: 'WEB_CHAT',
      })
        .lean()
        .exec()
      if (!channel) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'CHANNEL_NOT_FOUND',
            message: 'Canal não encontrado',
          },
        })
      }
      const { widgetColor, welcomeMessage } = getChannelConfig(channel.config)
      return reply.send({
        success: true,
        data: {
          channelId: String(channel._id),
          name: channel.name,
          widgetColor,
          welcomeMessage,
        },
      })
    }
  )
}
