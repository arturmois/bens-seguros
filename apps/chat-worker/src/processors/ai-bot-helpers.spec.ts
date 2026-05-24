import { describe, expect, it } from 'vitest'

import { findUnknownToolReferences } from './ai-bot-helpers.js'

describe('findUnknownToolReferences', () => {
  it('returns empty when no tool references appear in prompt', () => {
    const result = findUnknownToolReferences('plain text without calls', [
      'searchClient',
    ])
    expect(result).toEqual([])
  })

  it('ignores known tool references', () => {
    const prompt = 'Use `searchClient(query)` to find the client'
    const result = findUnknownToolReferences(prompt, [
      'searchClient',
      'escalateToHuman',
    ])
    expect(result).toEqual([])
  })

  it('returns unknown tools sorted alphabetically and deduplicated', () => {
    const prompt = 'Try `zebra()` then `alpha()` and again `zebra()`'
    const result = findUnknownToolReferences(prompt, ['searchClient'])
    expect(result).toEqual(['alpha', 'zebra'])
  })
})
