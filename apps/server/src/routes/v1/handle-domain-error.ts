import type { FastifyReply } from 'fastify'

interface DomainErrorLike {
  readonly code: string
  readonly message: string
  readonly details?: Record<string, unknown>
}

const CODE_TO_STATUS: Record<string, number> = {
  INVITATION_EXPIRED: 400,
  INVITATION_ALREADY_ACCEPTED: 400,
  INVALID_CEP: 400,
  INVALID_CREDENTIALS: 401,
  CLIENT_NOT_FOUND: 404,
  CONTACT_NOT_FOUND: 404,
  ORGANIZATION_NOT_FOUND: 404,
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
  CEP_NOT_FOUND: 404,
  CLIENT_ALREADY_EXISTS: 409,
  DOCUMENT_MISMATCH: 409,
  SLUG_CONFLICT: 409,
  CONTACT_NOT_PROMOTED: 409,
  INSURER_ALREADY_EXISTS: 409,
  POLICY_ALREADY_CANCELLED: 409,
  COMMISSION_ALREADY_PAID: 409,
  DUPLICATE_POLICY: 409,
  DUPLICATE_INVITATION: 409,
  ALREADY_MEMBER: 409,
  INVALID_STAGE_TRANSITION: 422,
  CONTACT_INVALID: 422,
  INVALID_COMMISSION_TRANSITION: 422,
  INVALID_CLAIM_STATUS_TRANSITION: 422,
  INVALID_ASSISTANCE_STATUS_TRANSITION: 422,
  COMMISSION_NOT_PAID: 422,
  BRANCH_MISMATCH: 422,
  PROPOSAL_DETAILS_REQUIRED: 422,
  CHECKLIST_INCOMPLETE: 422,
  POLICY_NOT_ISSUABLE: 422,
  POLICY_MISSING_INSURER: 422,
  SOURCE_POLICY_REQUIRED_FOR_ENDORSEMENT: 422,
  SOURCE_POLICY_NOT_ELIGIBLE: 422,
  CLIENT_NO_EMAIL: 422,
  CANNOT_SEND_LOST_QUOTE: 422,
  INVALID_COVERAGE_DATES: 422,
  INVALID_FILE_TYPE: 422,
  INVALID_LOGO_FILE_TYPE: 400,
  LOGO_FILE_REQUIRED: 400,
  LOGO_FILE_TOO_LARGE: 400,
  LAST_OWNER: 422,
  SELF_REMOVAL: 422,
  CEP_PROVIDER_UNAVAILABLE: 502,
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
      const payload: {
        success: false
        error: {
          code: string
          message: string
          details?: Record<string, unknown>
        }
      } = {
        success: false,
        error: { code: error.code, message: error.message },
      }
      if (error.details) payload.error.details = error.details
      return reply.status(status).send(payload)
    }
  }
  throw error
}
