import type { FastifyInstance } from 'fastify'

// `@fastify/helmet` does not expose a `permissionsPolicy` option in the
// current release. This helper adds the header via an `onSend` hook so it
// is applied to every response without patching helmet.
//
// Called directly (not via `app.register`) so the hook applies to the caller's
// scope instead of an encapsulated plugin scope — `fastify-plugin` is not a
// project dependency and adding it just for one hook would be overkill.

export const PERMISSIONS_POLICY_VALUE =
  'camera=(), microphone=(), geolocation=()'

export function applySecurityHeaders(app: FastifyInstance): void {
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('Permissions-Policy', PERMISSIONS_POLICY_VALUE)
    return payload
  })
}
