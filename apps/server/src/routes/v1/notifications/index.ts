import type { FastifyInstance } from 'fastify'

import { applyTenantStack } from '../../../middlewares/tenant-stack.js'
import { getAlertCountsRoute } from './get-alert-counts.js'
import { getUnreadCountRoute } from './get-unread-count.js'
import { listNotificationsRoute } from './list-notifications.js'
import { markAllAsReadRoute } from './mark-all-as-read.js'
import { markAsReadRoute } from './mark-as-read.js'

export async function notificationRoutes(app: FastifyInstance) {
  applyTenantStack(app)
  getUnreadCountRoute(app)
  getAlertCountsRoute(app)
  markAllAsReadRoute(app)
  listNotificationsRoute(app)
  markAsReadRoute(app)
}
