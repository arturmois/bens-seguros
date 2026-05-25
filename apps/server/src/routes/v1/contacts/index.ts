import type { FastifyInstance } from 'fastify'
import { applyTenantStack } from '../../../middlewares/tenant-stack.js'
import { createContactRoute } from './create-contact.js'
import { deleteContactRoute } from './delete-contact.js'
import { getContactRoute } from './get-contact.js'
import { listContactsRoute } from './list-contacts.js'
import { promoteContactRoute } from './promote-contact.js'
import { updateContactRoute } from './update-contact.js'

export async function contactRoutes(app: FastifyInstance) {
  applyTenantStack(app)
  promoteContactRoute(app)
  createContactRoute(app)
  listContactsRoute(app)
  getContactRoute(app)
  updateContactRoute(app)
  deleteContactRoute(app)
}
