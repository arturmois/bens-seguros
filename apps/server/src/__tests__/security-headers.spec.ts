import { describe, it, expect } from 'vitest'

import {
  PERMISSIONS_POLICY_VALUE,
  applySecurityHeaders,
} from '../plugins/security-headers.js'
import { createTestApp } from './helpers/create-test-app.js'

describe('applySecurityHeaders', () => {
  it('adds an onSend hook that sets Permissions-Policy on every response', async () => {
    const app = await createTestApp((instance) => {
      applySecurityHeaders(instance)
      instance.get('/ping', async () => ({ ok: true }))
      instance.get('/other', async () => ({ ok: true }))
    })

    const ping = await app.inject({ method: 'GET', url: '/ping' })
    const other = await app.inject({ method: 'GET', url: '/other' })

    expect(ping.headers['permissions-policy']).toBe(PERMISSIONS_POLICY_VALUE)
    expect(other.headers['permissions-policy']).toBe(PERMISSIONS_POLICY_VALUE)

    await app.close()
  })

  it('exports a stable Permissions-Policy value', () => {
    expect(PERMISSIONS_POLICY_VALUE).toBe(
      'camera=(), microphone=(), geolocation=()'
    )
  })
})
