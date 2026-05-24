import jwt from 'jsonwebtoken'
import type { Socket } from 'socket.io'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppLogger } from '../logger.js'
import type { MembershipValidator } from './membership-validator.js'
import { createSocketAuthMiddleware } from './socket-auth.js'

const SECRET = 'test-socket-secret-16'

function makeLogger(): AppLogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as AppLogger
}

function makeValidator(returnValue: boolean): MembershipValidator {
  return {
    validate: vi.fn().mockResolvedValue(returnValue),
  }
}

function makeSocketWithToken(token: string | undefined): Socket {
  return {
    handshake: { auth: { token } },
    data: {},
  } as unknown as Socket
}

function signToken(payload: object): string {
  return jwt.sign(payload, SECRET, { algorithm: 'HS256' })
}

const VALID_PAYLOAD = {
  userId: 'user-1',
  organizationId: 'org-1',
  role: 'COMMERCIAL' as const,
  name: 'Test Agent',
}

describe('createSocketAuthMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects connection when membership validator returns false (cross-tenant attempt)', async () => {
    const validator = makeValidator(false)
    const middleware = createSocketAuthMiddleware(makeLogger(), validator)
    const socket = makeSocketWithToken(signToken(VALID_PAYLOAD))
    const next = vi.fn()

    await new Promise<void>((resolve) => {
      middleware(socket, (err) => {
        next(err)
        resolve()
      })
    })

    expect(next).toHaveBeenCalledTimes(1)
    const callArg = next.mock.calls[0]?.[0]
    expect(callArg).toBeInstanceOf(Error)
    expect(callArg instanceof Error && callArg.message).toContain('membro')
    expect(validator.validate).toHaveBeenCalledWith('org-1', 'user-1')
  })

  it('accepts connection when validator returns true', async () => {
    const validator = makeValidator(true)
    const middleware = createSocketAuthMiddleware(makeLogger(), validator)
    const socket = makeSocketWithToken(signToken(VALID_PAYLOAD))
    const next = vi.fn()

    await new Promise<void>((resolve) => {
      middleware(socket, (err) => {
        next(err)
        resolve()
      })
    })

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0]?.[0]).toBeUndefined()
    expect(socket.data['user']).toEqual({
      userId: 'user-1',
      organizationId: 'org-1',
      role: 'COMMERCIAL',
      name: 'Test Agent',
    })
  })

  it('rejects when token is missing (regression — pre-existing behavior preserved)', async () => {
    const validator = makeValidator(true)
    const middleware = createSocketAuthMiddleware(makeLogger(), validator)
    const socket = makeSocketWithToken(undefined)
    const next = vi.fn()

    await new Promise<void>((resolve) => {
      middleware(socket, (err) => {
        next(err)
        resolve()
      })
    })

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error)
    expect(validator.validate).not.toHaveBeenCalled()
  })

  it('rejects when JWT signature is invalid', async () => {
    const validator = makeValidator(true)
    const middleware = createSocketAuthMiddleware(makeLogger(), validator)
    const badToken = jwt.sign(VALID_PAYLOAD, 'wrong-secret', {
      algorithm: 'HS256',
    })
    const socket = makeSocketWithToken(badToken)
    const next = vi.fn()

    await new Promise<void>((resolve) => {
      middleware(socket, (err) => {
        next(err)
        resolve()
      })
    })

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error)
    expect(validator.validate).not.toHaveBeenCalled()
  })
})
