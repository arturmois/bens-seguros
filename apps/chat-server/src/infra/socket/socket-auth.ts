import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { AppLogger } from '../logger.js';

const socketJwtPayloadSchema = z.object({
  sub: z.string(),
  organizationId: z.string(),
  role: z.string(),
  name: z.string(),
});

export interface SocketUserData {
  userId: string;
  organizationId: string;
  role: string;
  name: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

export function createSocketAuthMiddleware(logger: AppLogger) {
  return (socket: Socket, next: (err?: Error) => void): void => {
    const token = socket.handshake.auth['token'];

    if (typeof token !== 'string') {
      logger.warn('Socket connection rejected: missing token');
      next(new Error('Token de autenticação ausente'));
      return;
    }

    try {
      const decoded: unknown = jwt.verify(token, getJwtSecret());
      const parsed = socketJwtPayloadSchema.safeParse(decoded);

      if (!parsed.success) {
        logger.warn('Socket connection rejected: invalid token payload');
        next(new Error('Token inválido'));
        return;
      }

      const userData: SocketUserData = {
        userId: parsed.data.sub,
        organizationId: parsed.data.organizationId,
        role: parsed.data.role,
        name: parsed.data.name,
      };

      socket.data['user'] = userData;
      next();
    } catch {
      logger.warn('Socket connection rejected: token verification failed');
      next(new Error('Token expirado ou inválido'));
    }
  };
}
