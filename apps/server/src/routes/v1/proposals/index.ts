import type { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { advanceProposalRoute } from './advance-proposal.js'
import { completeChecklistItemRoute } from './complete-checklist-item.js'
import { createProposalRoute } from './create-proposal.js'
import { exportProposalsRoute } from './export-proposals.js'
import { generateProposalPdfRoute } from './generate-proposal-pdf.js'
import { getProposalChecklistRoute } from './get-proposal-checklist.js'
import { getProposalRoute } from './get-proposal.js'
import { listProposalsRoute } from './list-proposals.js'
import { markProposalLostRoute } from './mark-proposal-lost.js'
import { reopenProposalRoute } from './reopen-proposal.js'
import { sendQuoteRoute } from './send-quote.js'
import { updateProposalDatesRoute } from './update-proposal-dates.js'
import { updateProposalDetailsRoute } from './update-proposal-details.js'

export async function proposalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)
  exportProposalsRoute(app)
  generateProposalPdfRoute(app)
  sendQuoteRoute(app)
  updateProposalDatesRoute(app)
  createProposalRoute(app)
  listProposalsRoute(app)
  getProposalRoute(app)
  advanceProposalRoute(app)
  markProposalLostRoute(app)
  reopenProposalRoute(app)
  updateProposalDetailsRoute(app)
  getProposalChecklistRoute(app)
  completeChecklistItemRoute(app)
}
