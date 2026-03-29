import type { JsonValue } from '../../policy/domain/policy-repository.js'

export type JsonObject = { [key: string]: JsonValue }

export interface OccurrenceData {
  id: string
  claimId: string
  organizationId: string
  type: string
  description: string
  metadata: JsonObject | null
  createdBy: string | null
  createdAt: Date
  createdByName?: string
}

export interface CreateOccurrenceInput {
  claimId: string
  organizationId: string
  type: string
  description: string
  metadata?: JsonObject
  createdBy?: string
}

export interface OccurrenceRepository {
  create(data: CreateOccurrenceInput): Promise<OccurrenceData>
  findByClaimId(
    claimId: string,
    organizationId: string
  ): Promise<OccurrenceData[]>
}
