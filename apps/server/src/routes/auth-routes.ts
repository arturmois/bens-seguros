import type { FastifyInstance } from 'fastify';
import type { Auth } from '@repo/auth';
import { toNodeHandler } from 'better-auth/node';

export function registerAuthRoutes(app: FastifyInstance, auth: Auth) {
  const nodeHandler = toNodeHandler(auth);

  app.all('/api/auth/*', async (request, reply) => {
    await nodeHandler(request.raw, reply.raw);
    reply.hijack();
  });
}
