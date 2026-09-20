import { describe, expect, it } from 'vitest'
import * as core from '@repo/core'

describe('sync-stage-checklist public surface', () => {
  it('sync-stage-checklist is not exported from @repo/core', () => {
    expect(Object.hasOwn(core, 'syncStageChecklist')).toBe(false)
    expect(Object.hasOwn(core, 'SyncStageChecklist')).toBe(false)
  })
})
