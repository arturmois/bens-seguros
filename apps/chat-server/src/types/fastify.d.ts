import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      userId: string;
      organizationId: string;
      role: string;
      name: string;
    };
    organizationId: string;
  }
}
