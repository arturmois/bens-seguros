import { describe, expect, it } from 'vitest'

import { ApiError } from './api-client'
import { extractErrorMessage } from './extract-error-message'

describe('extractErrorMessage', () => {
  it('returns ApiError.message when error is an ApiError', () => {
    const err = new ApiError(422, 'VALIDATION_ERROR', 'Telefone incompleto')
    expect(extractErrorMessage(err, 'fallback')).toBe('Telefone incompleto')
  })

  it('falls back when ApiError.message is empty', () => {
    const err = new ApiError(500, 'UNKNOWN', '   ')
    expect(extractErrorMessage(err, 'fallback')).toBe('fallback')
  })

  it('extracts message from legacy axios-style response.data', () => {
    const err = {
      response: { data: { error: { message: 'Server error' } } },
    }
    expect(extractErrorMessage(err, 'fallback')).toBe('Server error')
  })

  it('returns fallback for unknown error shapes', () => {
    expect(extractErrorMessage(null, 'fallback')).toBe('fallback')
    expect(extractErrorMessage(new Error('raw'), 'fallback')).toBe('fallback')
    expect(extractErrorMessage('string error', 'fallback')).toBe('fallback')
  })
})
