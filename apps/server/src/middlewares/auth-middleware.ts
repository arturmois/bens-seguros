import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Auth } from '@repo/auth';
import type { AuthUser } from '@repo/auth/types';

function isSuperAdmin(user: object): boolean {
  return 'isSuperAdmin' in user && user.isSuperAdmin === true;
}

export function createAuthMiddleware(auth: Auth) {
  return async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
    const session = await auth.api.getSession({
      headers: request.headers as Record<string, string>,
    });

    if (!session) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { user: sessionUser } = session;

    const user: AuthUser = {
      id: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.name,
      emailVerified: sessionUser.emailVerified,
      image: sessionUser.image,
      isSuperAdmin: isSuperAdmin(sessionUser),
    };

    request.user = user;
    request.session = session.session;
  };
}

export function requireAuth(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }
  done();
}
