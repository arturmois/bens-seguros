import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from '@repo/core';
import {
  CreateProposal,
  AdvanceProposalStage,
  RevertProposalStage,
  MarkProposalLost,
  ListProposals,
  GetProposal,
  ProposalNotFoundError,
} from '@repo/core';
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js';
import { requireAbility } from '../../middlewares/ability-middleware.js';
import {
  createProposalBodySchema,
  listProposalsQuerySchema,
  markLostBodySchema,
} from '../../schemas/proposal.schemas.js';
import { idParamSchema } from '../../schemas/client.schemas.js';

function handleProposalError(error: unknown, reply: FastifyReply) {
  if (error instanceof ProposalNotFoundError) {
    return reply.status(404).send({
      success: false,
      error: { code: error.code, message: error.message },
    });
  }
  if (error instanceof Error && error.message.startsWith('Cannot')) {
    return reply.status(422).send({
      success: false,
      error: { code: 'INVALID_STAGE_TRANSITION', message: error.message },
    });
  }
  throw error;
}

export async function proposalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware);

  app.post(
    '/api/v1/proposals',
    { preHandler: [requireAbility('create', 'Proposal')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createProposalBodySchema.parse(request.body);
      const useCase = container.resolve(CreateProposal);
      const proposal = await useCase.execute({
        organizationId: request.organizationId!,
        salespersonId: request.user!.id,
        ...body,
      });
      return reply.status(201).send({ success: true, data: proposal.toJSON() });
    },
  );

  app.get(
    '/api/v1/proposals',
    { preHandler: [requireAbility('read', 'Proposal')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listProposalsQuerySchema.parse(request.query);
      const useCase = container.resolve(ListProposals);
      const { limit, cursor, ...filters } = query;
      const result = await useCase.execute(
        { organizationId: request.organizationId!, ...filters },
        { limit, cursor },
      );
      return reply.send({
        success: true,
        data: result.items.map((p) => p.toJSON()),
        meta: { total: result.total, nextCursor: result.nextCursor },
      });
    },
  );

  app.get(
    '/api/v1/proposals/:id',
    { preHandler: [requireAbility('read', 'Proposal')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params);
      const useCase = container.resolve(GetProposal);
      try {
        const proposal = await useCase.execute(id, request.organizationId!);
        return reply.send({ success: true, data: proposal.toJSON() });
      } catch (error) {
        return handleProposalError(error, reply);
      }
    },
  );

  app.post(
    '/api/v1/proposals/:id/advance',
    { preHandler: [requireAbility('update', 'Proposal')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params);
      const useCase = container.resolve(AdvanceProposalStage);
      try {
        const proposal = await useCase.execute(id, request.organizationId!);
        return reply.send({ success: true, data: proposal.toJSON() });
      } catch (error) {
        return handleProposalError(error, reply);
      }
    },
  );

  app.post(
    '/api/v1/proposals/:id/revert',
    { preHandler: [requireAbility('update', 'Proposal')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params);
      const useCase = container.resolve(RevertProposalStage);
      try {
        const proposal = await useCase.execute(id, request.organizationId!);
        return reply.send({ success: true, data: proposal.toJSON() });
      } catch (error) {
        return handleProposalError(error, reply);
      }
    },
  );

  app.post(
    '/api/v1/proposals/:id/lost',
    { preHandler: [requireAbility('update', 'Proposal')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params);
      const { reason } = markLostBodySchema.parse(request.body);
      const useCase = container.resolve(MarkProposalLost);
      try {
        const proposal = await useCase.execute(id, request.organizationId!, reason);
        return reply.send({ success: true, data: proposal.toJSON() });
      } catch (error) {
        return handleProposalError(error, reply);
      }
    },
  );
}
