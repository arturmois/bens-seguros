export class OccurrenceClaimNotFoundError extends Error {
  readonly code = 'OCCURRENCE_CLAIM_NOT_FOUND' as const
  constructor(claimId: string) {
    super(`Sinistro ${claimId} não encontrado para registro de ocorrência`)
    this.name = 'OccurrenceClaimNotFoundError'
  }
}

export const OccurrenceErrors = {
  claimNotFound: (claimId: string) => new OccurrenceClaimNotFoundError(claimId),
}
