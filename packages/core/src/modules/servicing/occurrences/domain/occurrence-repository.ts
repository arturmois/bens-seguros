import type { JsonObject } from '../../../shared-kernel/json.js'

export type { JsonObject }

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
