import { describe, expect, it } from 'vitest'
import {
  AiUsageRecordInvariantError,
  createAiUsageRecord,
  derivePeriodKey,
} from './ai-usage-record.js'

function baseInput() {
  return {
    organizationId: 'org-1',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    inputQuantity: 100,
    outputQuantity: 50,
    unitType: 'TOKEN' as const,
    inputCostMicrocents: 15,
    outputCostMicrocents: 38,
  }
}

describe('derivePeriodKey', () => {
  it('returns YYYY-MM for mid-month date', () => {
    expect(derivePeriodKey(new Date('2026-05-23T12:00:00Z'))).toBe('2026-05')
  })

  it('formats month with leading zero', () => {
    expect(derivePeriodKey(new Date('2026-01-15T12:00:00Z'))).toBe('2026-01')
  })

  it('uses UTC (end-of-month boundary)', () => {
    expect(derivePeriodKey(new Date('2026-06-30T23:59:59Z'))).toBe('2026-06')
  })
})

describe('createAiUsageRecord', () => {
  it('derives periodKey from createdAt', () => {
    const record = createAiUsageRecord({
      ...baseInput(),
      createdAt: new Date('2026-07-10T12:00:00Z'),
    })

    expect(record.periodKey).toBe('2026-07')
  })

  it('defaults countedAsIncluded=null (until Phase 6 evaluates), overageCents=null', () => {
    const record = createAiUsageRecord(baseInput())

    expect(record.countedAsIncluded).toBeNull()
    expect(record.overageCents).toBeNull()
  })

  it('passes hashed IDs through when provided', () => {
    const record = createAiUsageRecord({
      ...baseInput(),
      channelIdHash: 'a'.repeat(16),
      conversationIdHash: 'b'.repeat(16),
      messageIdHash: 'c'.repeat(16),
      agentIdHash: 'd'.repeat(16),
    })

    expect(record.channelIdHash).toBe('a'.repeat(16))
    expect(record.conversationIdHash).toBe('b'.repeat(16))
    expect(record.messageIdHash).toBe('c'.repeat(16))
    expect(record.agentIdHash).toBe('d'.repeat(16))
  })

  it('sets hashed IDs to null when not provided', () => {
    const record = createAiUsageRecord(baseInput())

    expect(record.channelIdHash).toBeNull()
    expect(record.conversationIdHash).toBeNull()
    expect(record.messageIdHash).toBeNull()
    expect(record.agentIdHash).toBeNull()
  })

  it('rejects empty provider', () => {
    expect(() => createAiUsageRecord({ ...baseInput(), provider: '' })).toThrow(
      AiUsageRecordInvariantError
    )
  })

  it('rejects empty model', () => {
    expect(() => createAiUsageRecord({ ...baseInput(), model: '' })).toThrow(
      AiUsageRecordInvariantError
    )
  })

  it('rejects negative inputQuantity', () => {
    expect(() =>
      createAiUsageRecord({ ...baseInput(), inputQuantity: -1 })
    ).toThrow(AiUsageRecordInvariantError)
  })

  it('rejects negative outputQuantity', () => {
    expect(() =>
      createAiUsageRecord({ ...baseInput(), outputQuantity: -1 })
    ).toThrow(AiUsageRecordInvariantError)
  })

  it('rejects negative costs', () => {
    expect(() =>
      createAiUsageRecord({ ...baseInput(), inputCostMicrocents: -1 })
    ).toThrow(AiUsageRecordInvariantError)
    expect(() =>
      createAiUsageRecord({ ...baseInput(), outputCostMicrocents: -1 })
    ).toThrow(AiUsageRecordInvariantError)
  })
})
