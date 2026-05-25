import type { FastifyInstance } from 'fastify'

import { applyTenantStack } from '../../../middlewares/tenant-stack.js'
import { deleteDocumentRoute } from './delete-document.js'
import { getDocumentUrlRoute } from './get-document-url.js'
import { listDocumentsRoute } from './list-documents.js'
import { uploadDocumentRoute } from './upload-document.js'

export async function documentRoutes(app: FastifyInstance) {
  applyTenantStack(app)
  uploadDocumentRoute(app)
  listDocumentsRoute(app)
  getDocumentUrlRoute(app)
  deleteDocumentRoute(app)
}
