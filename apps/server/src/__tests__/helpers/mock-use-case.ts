import { vi } from 'vitest'
import { container } from '@repo/core'

/**
 * Configure container.resolve: class tokens → mock use case, string tokens → null.
 * Covers handlers that also call container.resolve('CacheService').
 */
export function mockResolve(mockExecute: ReturnType<typeof vi.fn>) {
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (typeof token === 'function') return { execute: mockExecute }
    return null
  })
}

/**
 * Configure container.resolve to reject with a domain error.
 */
export function mockResolveError(code: string, message = 'Test error') {
  const error = Object.assign(new Error(message), { code })
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (typeof token === 'function') {
      return { execute: vi.fn().mockRejectedValue(error) }
    }
    return null
  })
}

/**
 * For handlers resolving multiple use cases. Mocks returned in order.
 */
export function mockResolveMultiple(mocks: ReturnType<typeof vi.fn>[]) {
  let i = 0
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (typeof token === 'function') {
      const mock = mocks[i] ?? vi.fn().mockResolvedValue(null)
      i++
      return { execute: mock }
    }
    return null
  })
}
