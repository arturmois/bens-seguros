import { vi } from 'vitest'
import { container } from '@repo/core'

export function mockResolve(mockExecute: ReturnType<typeof vi.fn>) {
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (typeof token === 'function') return { execute: mockExecute }
    return null
  })
}

export function mockResolveError(
  code: string,
  message = 'Test error',
  details?: Record<string, unknown>
) {
  const error = Object.assign(new Error(message), { code, details })
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (typeof token === 'function') {
      return { execute: vi.fn().mockRejectedValue(error) }
    }
    return null
  })
}

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
