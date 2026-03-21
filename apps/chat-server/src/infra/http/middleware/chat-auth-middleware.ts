import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const jwtPayloadSchema = z.object({
  sub: z.string(),
  organizationId: z.string(),
  role: z.string(),
  name: z.string(),
});

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

export async function chatAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    await reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token de autenticação ausente' },
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded: unknown = jwt.verify(token, getJwtSecret());
    const parsed = jwtPayloadSchema.safeParse(decoded);

    if (!parsed.success) {
      await reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token inválido' },
      });
      return;
    }

    request.user = {
      userId: parsed.data.sub,
      organizationId: parsed.data.organizationId,
      role: parsed.data.role,
      name: parsed.data.name,
    };
    request.organizationId = parsed.data.organizationId;
  } catch {
    await reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token expirado ou inválido' },
    });
  }
}
