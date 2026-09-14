import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GetUserStatus, type UserStatusDb } from './get-user-status.js'

const findUnique = vi.fn()
const db = { user: { findUnique } } as unknown as UserStatusDb
const query = new GetUserStatus(db)

describe('GetUserStatus.isSuperAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('selects only isSuperAdmin for the given user id', async () => {
    findUnique.mockResolvedValue(null)
    await query.isSuperAdmin('user-1')
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { isSuperAdmin: true },
    })
  })

  it('returns true when the field is true', async () => {
    findUnique.mockResolvedValue({ isSuperAdmin: true })
    expect(await query.isSuperAdmin('user-1')).toBe(true)
  })

  it.each([
    ['the field is false', { isSuperAdmin: false }],
    ['the user row is missing', null],
  ])('returns false when %s', async (_label, row) => {
    findUnique.mockResolvedValue(row)
    expect(await query.isSuperAdmin('user-1')).toBe(false)
  })
})

describe('GetUserStatus.hasTwoFactorEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('selects only twoFactorEnabled for the given user id', async () => {
    findUnique.mockResolvedValue(null)
    await query.hasTwoFactorEnabled('user-2')
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      select: { twoFactorEnabled: true },
    })
  })

  it('returns true when the field is true', async () => {
    findUnique.mockResolvedValue({ twoFactorEnabled: true })
    expect(await query.hasTwoFactorEnabled('user-2')).toBe(true)
  })

  it.each([
    ['the field is false', { twoFactorEnabled: false }],
    ['the field is null', { twoFactorEnabled: null }],
    ['the user row is missing', null],
  ])('returns false when %s', async (_label, row) => {
    findUnique.mockResolvedValue(row)
    expect(await query.hasTwoFactorEnabled('user-2')).toBe(false)
  })
})
