import type { Schema } from 'mongoose'
import { getCurrentTenantId } from '../tenant-context.js'

const TENANT_SCOPED_OPERATIONS = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'countDocuments',
] as const

export function tenantScopePlugin(schema: Schema): void {
  for (const op of TENANT_SCOPED_OPERATIONS) {
    schema.pre(op, function () {
      const tenantId = getCurrentTenantId()
      if (!tenantId) return
      const filter = this.getFilter()
      if (!filter['tenantId']) {
        this.where({ tenantId })
      }
    })
  }
}
