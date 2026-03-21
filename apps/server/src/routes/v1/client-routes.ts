import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from '@repo/core';
import {
  CreateClient,
  ListClients,
  GetClient,
  UpdateClient,
  DeleteClient,
  ClientAlreadyExistsError,
  ClientNotFoundError,
} from '@repo/core';
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js';
import { requireAbility } from '../../middlewares/ability-middleware.js';
import {
  createClientBodySchema,
  updateClientBodySchema,
  listClientsQuerySchema,
  idParamSchema,
} from '../../schemas/client.schemas.js';

function handleClientError(error: unknown, reply: FastifyReply) {
  if (error instanceof ClientNotFoundError) {
    return reply.status(404).send({
      success: false,
      error: { code: error.code, message: error.message },
    });
  }
  if (error instanceof ClientAlreadyExistsError) {
    return reply.status(409).send({
      success: false,
      error: { code: error.code, message: error.message },
    });
  }
  throw error;
}

export async function clientRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware);

  app.post(
    '/api/v1/clients',
    { preHandler: [requireAbility('create', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createClientBodySchema.parse(request.body);
      const useCase = container.resolve(CreateClient);
      try {
        const client = await useCase.execute({
          organizationId: request.organizationId!,
          ...body,
        });
        return reply.status(201).send({ success: true, data: client });
      } catch (error) {
        return handleClientError(error, reply);
      }
    },
  );

  app.get(
    '/api/v1/clients',
    { preHandler: [requireAbility('read', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listClientsQuerySchema.parse(request.query);
      const useCase = container.resolve(ListClients);
      const { limit, cursor, ...filters } = query;
      const result = await useCase.execute(
        { organizationId: request.organizationId!, ...filters },
        { limit, cursor },
      );
      return reply.send({
        success: true,
        data: result.items,
        meta: { total: result.total, nextCursor: result.nextCursor },
      });
    },
  );

  app.get(
    '/api/v1/clients/:id',
    { preHandler: [requireAbility('read', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params);
      const useCase = container.resolve(GetClient);
      try {
        const client = await useCase.execute(id, request.organizationId!);
        return reply.send({ success: true, data: client });
      } catch (error) {
        return handleClientError(error, reply);
      }
    },
  );

  app.put(
    '/api/v1/clients/:id',
    { preHandler: [requireAbility('update', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params);
      const body = updateClientBodySchema.parse(request.body);
      const useCase = container.resolve(UpdateClient);
      try {
        const client = await useCase.execute(id, request.organizationId!, body);
        return reply.send({ success: true, data: client });
      } catch (error) {
        return handleClientError(error, reply);
      }
    },
  );

  app.delete(
    '/api/v1/clients/:id',
    { preHandler: [requireAbility('delete', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params);
      const useCase = container.resolve(DeleteClient);
      try {
        await useCase.execute(id, request.organizationId!);
        return reply.status(204).send();
      } catch (error) {
        return handleClientError(error, reply);
      }
    },
  );
}
