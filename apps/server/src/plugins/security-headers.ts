import type { FastifyInstance } from 'fastify'

export const PERMISSIONS_POLICY_VALUE =
  'camera=(), microphone=(), geolocation=()'

export function applySecurityHeaders(app: FastifyInstance): void {
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('Permissions-Policy', PERMISSIONS_POLICY_VALUE)
    return payload
  })
}
