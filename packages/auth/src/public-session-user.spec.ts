import { describe, expect, it } from 'vitest'
import { pickPublicSessionUser } from './public-session-user.js'

describe('pickPublicSessionUser', () => {
  it('drops sensitive fields like isSuperAdmin', () => {
    const rawUser = {
      id: 'user-1',
      email: 'a@example.com',
      name: 'A',
      emailVerified: true,
      image: null,
      acceptedTermsAt: null,
      termsVersion: null,
      privacyVersion: null,
      isSuperAdmin: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
    }
    const picked = pickPublicSessionUser(rawUser)
    expect(picked).not.toHaveProperty('isSuperAdmin')
    expect(picked).not.toHaveProperty('createdAt')
    expect(picked).not.toHaveProperty('updatedAt')
  })

  it('snapshot of exact whitelist — any change to this list is a security-sensitive review', () => {
    const rawUser = {
      id: 'user-1',
      email: 'a@example.com',
      name: 'A',
      emailVerified: true,
      image: 'https://example.com/avatar.png',
      acceptedTermsAt: new Date('2026-03-15'),
      termsVersion: '2026-03',
      privacyVersion: '2026-03',
      isSuperAdmin: true,
    }
    const picked = pickPublicSessionUser(rawUser)
    expect(Object.keys(picked).sort()).toEqual([
      'acceptedTermsAt',
      'email',
      'emailVerified',
      'id',
      'image',
      'name',
      'privacyVersion',
      'termsVersion',
    ])
  })

  it('normalizes missing optional fields to null', () => {
    const rawUser = {
      id: 'user-1',
      email: 'a@example.com',
      name: 'A',
      emailVerified: false,
      image: null,
    }
    const picked = pickPublicSessionUser(rawUser)
    expect(picked.acceptedTermsAt).toBeNull()
    expect(picked.termsVersion).toBeNull()
    expect(picked.privacyVersion).toBeNull()
  })

  it('preserves all whitelisted values verbatim', () => {
    const acceptedAt = new Date('2026-03-15T10:00:00Z')
    const rawUser = {
      id: 'user-1',
      email: 'a@example.com',
      name: 'Alice',
      emailVerified: true,
      image: 'https://example.com/a.png',
      acceptedTermsAt: acceptedAt,
      termsVersion: 'v1',
      privacyVersion: 'v2',
    }
    const picked = pickPublicSessionUser(rawUser)
    expect(picked).toEqual({
      id: 'user-1',
      email: 'a@example.com',
      name: 'Alice',
      emailVerified: true,
      image: 'https://example.com/a.png',
      acceptedTermsAt: acceptedAt,
      termsVersion: 'v1',
      privacyVersion: 'v2',
    })
  })
})
