import { describe, it, expect } from 'vitest'
import { resolve, sep } from 'node:path'

describe('uploads path traversal guard', () => {
  const uploadsDir = '/app/uploads'
  const safeBase = uploadsDir + sep
  function isPathSafe(userPath: string): boolean {
    const resolved = resolve(uploadsDir, userPath)
    return resolved.startsWith(safeBase)
  }
  it('rejects ../ path traversal', () => {
    expect(isPathSafe('../../etc/passwd')).toBe(false)
  })
  it('rejects encoded traversal (decoded by Fastify router before reaching handler)', () => {
    const decoded = decodeURIComponent('..%2F..%2Fetc/passwd')
    expect(isPathSafe(decoded)).toBe(false)
  })
  it('rejects sibling directory bypass', () => {
    expect(isPathSafe('../uploads-evil/secret.txt')).toBe(false)
  })
  it('allows normal file paths', () => {
    expect(isPathSafe('org-123/avatar.png')).toBe(true)
  })
  it('allows nested paths within uploads', () => {
    expect(isPathSafe('org-123/documents/file.pdf')).toBe(true)
  })
})
