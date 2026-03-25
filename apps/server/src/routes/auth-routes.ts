import type { FastifyInstance } from 'fastify'
import type { Auth } from '@repo/auth'
import type IORedis from 'ioredis'
import { createAuthRateLimitHook } from '../middlewares/auth-rate-limit.js'

export function registerAuthRoutes(
  app: FastifyInstance,
  auth: Auth,
  redis: IORedis
) {
  const authRateLimitHook = createAuthRateLimitHook(redis)

  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    preHandler: authRateLimitHook,
    async handler(request, reply) {
      const url = new URL(request.url, `http://${request.headers.host}`)

      const headers = new Headers()
      for (const [key, value] of Object.entries(request.headers)) {
        if (value) headers.append(key, String(value))
      }

      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      })

      const response = await auth.handler(req)

      reply.status(response.status)
      response.headers.forEach((value, key) => reply.header(key, value))

      const text = await response.text()
      return reply.send(text || null)
    },
  })
}
