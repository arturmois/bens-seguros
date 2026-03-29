import 'fastify'
import type IORedis from 'ioredis'

import type { VisitorTokenPayload } from '../infra/http/middleware/widget-auth.js'

declare module 'fastify' {
  interface FastifyInstance {
    redisPub: IORedis
    redisGeneral: IORedis
  }

  interface FastifyRequest {
    user: {
      userId: string
      organizationId: string
      role: string
      name: string
    }
    organizationId: string
    visitorData?: VisitorTokenPayload
  }
}
