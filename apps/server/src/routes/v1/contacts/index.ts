import type { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { createContactRoute } from './create-contact.js'
import { deleteContactRoute } from './delete-contact.js'
import { getContactRoute } from './get-contact.js'
import { listContactsRoute } from './list-contacts.js'
import { promoteContactRoute } from './promote-contact.js'
import { updateContactRoute } from './update-contact.js'

// NOTE: CASL `Contact` ability is not yet registered in @repo/auth abilities.
// `requireAbility` preHandlers will be added when the subject is added.
export async function contactRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)
  // IMPORTANT: /:id/promote must be registered before /:id to avoid route conflict
  promoteContactRoute(app)
  createContactRoute(app)
  listContactsRoute(app)
  getContactRoute(app)
  updateContactRoute(app)
  deleteContactRoute(app)
}
