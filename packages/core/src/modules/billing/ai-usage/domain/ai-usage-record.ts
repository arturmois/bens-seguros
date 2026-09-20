export type UsageUnitType = 'TOKEN' | 'CHARACTER' | 'IMAGE'

export interface AiUsageRecord {
  readonly organizationId: string
  readonly periodKey: string
  readonly channelIdHash: string | null
  readonly conversationIdHash: string | null
  readonly messageIdHash: string | null
  readonly agentIdHash: string | null
  readonly provider: string
  readonly model: string
  readonly inputQuantity: number
  readonly outputQuantity: number
  readonly unitType: UsageUnitType
  readonly inputCostMicrocents: number
  readonly outputCostMicrocents: number
  readonly countedAsIncluded: boolean | null
  readonly overageCents: number | null
  readonly createdAt: Date
}

export interface CreateAiUsageRecordInput {
  readonly organizationId: string
  readonly provider: string
  readonly model: string
  readonly inputQuantity: number
  readonly outputQuantity: number
  readonly unitType: UsageUnitType
  readonly inputCostMicrocents: number
  readonly outputCostMicrocents: number
  readonly channelIdHash?: string
  readonly conversationIdHash?: string
  readonly messageIdHash?: string
  readonly agentIdHash?: string
  readonly createdAt?: Date
}

export class AiUsageRecordInvariantError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiUsageRecordInvariantError'
  }
}

export function derivePeriodKey(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${String(year)}-${month}`
}

export function createAiUsageRecord(
  input: CreateAiUsageRecordInput
): AiUsageRecord {
  if (input.provider.length === 0) {
    throw new AiUsageRecordInvariantError('provider must not be empty')
  }
  if (input.model.length === 0) {
    throw new AiUsageRecordInvariantError('model must not be empty')
  }
  if (input.inputQuantity < 0) {
    throw new AiUsageRecordInvariantError('inputQuantity must be >= 0')
  }
  if (input.outputQuantity < 0) {
    throw new AiUsageRecordInvariantError('outputQuantity must be >= 0')
  }
  if (input.inputCostMicrocents < 0) {
    throw new AiUsageRecordInvariantError('inputCostMicrocents must be >= 0')
  }
  if (input.outputCostMicrocents < 0) {
    throw new AiUsageRecordInvariantError('outputCostMicrocents must be >= 0')
  }

  const createdAt = input.createdAt ?? new Date()

  return {
    organizationId: input.organizationId,
    periodKey: derivePeriodKey(createdAt),
    channelIdHash: input.channelIdHash ?? null,
    conversationIdHash: input.conversationIdHash ?? null,
    messageIdHash: input.messageIdHash ?? null,
    agentIdHash: input.agentIdHash ?? null,
    provider: input.provider,
    model: input.model,
    inputQuantity: input.inputQuantity,
    outputQuantity: input.outputQuantity,
    unitType: input.unitType,
    inputCostMicrocents: input.inputCostMicrocents,
    outputCostMicrocents: input.outputCostMicrocents,
    countedAsIncluded: null,
    overageCents: null,
    createdAt,
  }
}
