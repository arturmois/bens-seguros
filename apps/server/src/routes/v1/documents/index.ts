import type { FastifyInstance } from 'fastify'

import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { uploadDocumentRoute } from './upload-document.js'
import { listDocumentsRoute } from './list-documents.js'
import { getDocumentUrlRoute } from './get-document-url.js'
import { deleteDocumentRoute } from './delete-document.js'

export async function documentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  uploadDocumentRoute(app)
  listDocumentsRoute(app)
  getDocumentUrlRoute(app)
  deleteDocumentRoute(app)
}
