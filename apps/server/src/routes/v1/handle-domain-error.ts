import type { FastifyReply } from 'fastify'

interface DomainErrorLike {
  readonly code: string
  readonly message: string
}

const CODE_TO_STATUS: Record<string, number> = {
  // 404 Not Found
  CLIENT_NOT_FOUND: 404,
  PROPOSAL_NOT_FOUND: 404,
  COMMISSION_NOT_FOUND: 404,
  CLAIM_NOT_FOUND: 404,
  POLICY_NOT_FOUND: 404,
  INSURER_NOT_FOUND: 404,
  DOCUMENT_NOT_FOUND: 404,
  ENDORSEMENT_NOT_FOUND: 404,
  ASSISTANCE_NOT_FOUND: 404,
  OCCURRENCE_CLAIM_NOT_FOUND: 404,
  NOTIFICATION_NOT_FOUND: 404,
  MEMBER_NOT_FOUND: 404,
  INVITATION_NOT_FOUND: 404,
  // 409 Conflict
  CLIENT_ALREADY_EXISTS: 409,
  INSURER_ALREADY_EXISTS: 409,
  POLICY_ALREADY_CANCELLED: 409,
  COMMISSION_ALREADY_PAID: 409,
  DUPLICATE_POLICY: 409,
  DUPLICATE_INVITATION: 409,
  // 422 Unprocessable
  INVALID_STAGE_TRANSITION: 422,
  INVALID_COMMISSION_TRANSITION: 422,
  INVALID_CLAIM_STATUS_TRANSITION: 422,
  INVALID_ASSISTANCE_STATUS_TRANSITION: 422,
  COMMISSION_NOT_PAID: 422,
  BRANCH_MISMATCH: 422,
  PROPOSAL_DETAILS_REQUIRED: 422,
  CHECKLIST_INCOMPLETE: 422,
  POLICY_NOT_ISSUABLE: 422,
  POLICY_MISSING_INSURER: 422,
  INVALID_FILE_TYPE: 422,
  LAST_OWNER: 422,
  SELF_REMOVAL: 422,
  // 403 Forbidden
  ROLE_HIERARCHY_VIOLATION: 403,
}

function isDomainError(error: unknown): error is DomainErrorLike {
  return (
    error instanceof Error && 'code' in error && typeof error.code === 'string'
  )
}

export function handleDomainError(
  error: unknown,
  reply: FastifyReply
): FastifyReply | never {
  if (isDomainError(error)) {
    const status = CODE_TO_STATUS[error.code]
    if (status) {
      return reply.status(status).send({
        success: false,
        error: { code: error.code, message: error.message },
      })
    }
  }
  throw error
}
