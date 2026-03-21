import 'reflect-metadata';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { createAuth } from '@repo/auth';
import { env } from '@repo/env';
import { registerAuthRoutes } from './routes/auth-routes.js';
import { tenantRoutes } from './routes/v1/tenant-routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    bodyLimit: 10 * 1024 * 1024, // S6: 10MB
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  await app.register(helmet);

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Bens Seguros API',
        version: '1.0.0',
      },
    },
  });

  app.get('/health', async () => ({ status: 'ok' }));

  // Better Auth integration
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const auth = createAuth(env.AUTH_SECRET, env.API_URL, [frontendUrl]);
  registerAuthRoutes(app, auth);

  // API v1 routes
  await app.register(tenantRoutes);

  return app;
}
