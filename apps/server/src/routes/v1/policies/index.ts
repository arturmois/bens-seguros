import type { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { cancelPolicyRoute } from './cancel-policy.js'
import { exportPoliciesRoute } from './export-policies.js'
import { generatePolicyPdfRoute } from './generate-policy-pdf.js'
import { getPolicyRoute } from './get-policy.js'
import { importPoliciesRoutes } from './import-policies.js'
import { issuePolicyRoute } from './issue-policy.js'
import { listPoliciesRoute } from './list-policies.js'

export async function policyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  // Routes with static paths must be registered BEFORE parameterized /:id routes
  exportPoliciesRoute(app)
  importPoliciesRoutes(app)
  generatePolicyPdfRoute(app)
  cancelPolicyRoute(app)
  issuePolicyRoute(app)
  listPoliciesRoute(app)
  getPolicyRoute(app)
}
