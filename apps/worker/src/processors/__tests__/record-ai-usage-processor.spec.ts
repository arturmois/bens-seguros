import { describe, expect, it, vi } from 'vitest'
import { processRecordAiUsageJob } from '../record-ai-usage-processor.js'

const baseJob = {
  organizationId: 'org-1',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  inputQuantity: 10,
  outputQuantity: 5,
  unitType: 'TOKEN' as const,
  inputCostMicrocents: 1,
  outputCostMicrocents: 2,
}

describe('processRecordAiUsageJob', () => {
  it('skips RecordAiUsage when messageIdHash already stored', async () => {
    const recordAiUsage = { execute: vi.fn() }
    const existsByMessageIdHash = vi.fn().mockResolvedValue(true)
    await processRecordAiUsageJob(
      { ...baseJob, messageIdHash: 'abc123hash' },
      { recordAiUsage, existsByMessageIdHash }
    )
    expect(existsByMessageIdHash).toHaveBeenCalledWith('org-1', 'abc123hash')
    expect(recordAiUsage.execute).not.toHaveBeenCalled()
  })

  it('calls RecordAiUsage once when messageIdHash is missing', async () => {
    const recordAiUsage = { execute: vi.fn().mockResolvedValue(undefined) }
    const existsByMessageIdHash = vi.fn()
    await processRecordAiUsageJob(baseJob, {
      recordAiUsage,
      existsByMessageIdHash,
    })
    expect(existsByMessageIdHash).not.toHaveBeenCalled()
    expect(recordAiUsage.execute).toHaveBeenCalledTimes(1)
    await processRecordAiUsageJob(
      { ...baseJob, messageIdHash: null },
      { recordAiUsage, existsByMessageIdHash }
    )
    expect(recordAiUsage.execute).toHaveBeenCalledTimes(2)
  })
})
