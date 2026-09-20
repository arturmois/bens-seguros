import { describe, expect, it, vi } from 'vitest'
import { createRecordAiUsageAdapter } from './record-ai-usage-adapter.js'

describe('record-ai-usage-adapter', () => {
  it('swallows enqueue errors', async () => {
    const enqueue = vi.fn().mockRejectedValue(new Error('redis down'))
    const adapter = createRecordAiUsageAdapter(enqueue)
    await expect(
      adapter({
        metadata: { organizationId: 'org-1' },
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 10,
        outputTokens: 5,
      })
    ).resolves.toBeUndefined()
    expect(enqueue).toHaveBeenCalledTimes(1)
  })
})
