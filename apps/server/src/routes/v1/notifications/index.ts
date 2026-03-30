import type { FastifyInstance } from 'fastify'

import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { listNotificationsRoute } from './list-notifications.js'
import { getUnreadCountRoute } from './get-unread-count.js'
import { getAlertCountsRoute } from './get-alert-counts.js'
import { markAsReadRoute } from './mark-as-read.js'
import { markAllAsReadRoute } from './mark-all-as-read.js'

export async function notificationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  // Static paths must be registered before parametric paths
  getUnreadCountRoute(app)
  getAlertCountsRoute(app)
  markAllAsReadRoute(app)
  listNotificationsRoute(app)
  markAsReadRoute(app)
}
