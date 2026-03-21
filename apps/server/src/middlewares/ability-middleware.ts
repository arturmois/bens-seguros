import type { FastifyRequest, FastifyReply } from 'fastify';
import { defineAbilitiesFor, type AppAbility } from '@repo/auth/abilities';

export function requireAbility(action: string, subject: string) {
  return async function abilityGuard(request: FastifyRequest, reply: FastifyReply) {
    const { role } = request;

    if (!role) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No role assigned' },
      });
    }

    const ability: AppAbility = defineAbilitiesFor(role);

    if (!ability.can(action as never, subject as never)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Insufficient permissions: ${action} ${subject}`,
        },
      });
    }
  };
}
