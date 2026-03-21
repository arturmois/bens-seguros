import type { AuthUser, AuthSession } from '@repo/auth/types';
import type { Role } from '@repo/auth/roles';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
    session?: AuthSession;
    organizationId?: string;
    role?: Role;
  }
}
