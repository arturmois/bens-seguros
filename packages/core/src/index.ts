export { container, injectable, inject, singleton } from './container.js'

// Domain modules
export * from './modules/client/index.js'
export * from './modules/proposal/index.js'
export * from './modules/policy/index.js'
export * from './modules/insurer/index.js'
export * from './modules/claim/index.js'
export * from './modules/occurrence/index.js'
export * from './modules/endorsement/index.js'
export * from './modules/assistance/index.js'
export * from './modules/document/index.js'
export * from './modules/commission/index.js'
export {
  logAudit,
  logCreate,
  logUpdate,
  logDelete,
  logApprove,
  logReject,
} from './modules/audit/log-audit.js'
