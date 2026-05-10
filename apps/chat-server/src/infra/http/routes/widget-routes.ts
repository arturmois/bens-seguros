import type { FastifyInstance } from 'fastify'

import { widgetConfigRoute } from './widget-config-route.js'
import { widgetConversationRoutes } from './widget-conversation-routes.js'
import { widgetCreateConversationRoute } from './widget-create-conversation-route.js'
import { rateLimitHook } from './widget-helpers.js'
import { widgetSendMessageRoute } from './widget-send-message-route.js'

export async function widgetRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', rateLimitHook)
  await app.register(widgetConfigRoute)
  await app.register(widgetCreateConversationRoute)
  await app.register(widgetSendMessageRoute)
  await app.register(widgetConversationRoutes)
}
