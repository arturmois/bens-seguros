import { z } from 'zod';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { Channel } from '@repo/db-chat';
import { ChannelNotFoundError } from '../../../domain/errors.js';

const channelIdSchema = z.object({ id: z.string().min(1) });

const createChannelBodySchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['WHATSAPP', 'WEB']),
  brokerType: z.enum(['BAILEYS', 'META']),
  phoneNumber: z.string().optional(),
});

const updateChannelBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phoneNumber: z.string().optional(),
  isActive: z.boolean().optional(),
  aiUserId: z.string().optional(),
});

function buildChannelNotFoundResponse(id: string): {
  success: false;
  error: { code: string; message: string };
} {
  const err = new ChannelNotFoundError(id);
  return { success: false, error: { code: err.code, message: err.message } };
}

function mapChannel(doc: Record<string, unknown>): Record<string, unknown> {
  const { _id, ...rest } = doc;
  delete rest['__v'];
  return { id: String(_id), ...rest };
}

export async function channelRoutes(app: FastifyInstance): Promise<void> {
  app.get('/chat/channels', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.organizationId;

    const docs = await Channel.find({ tenantId }).sort({ createdAt: -1 }).lean();
    const channels = docs.map((doc) => mapChannel(doc as unknown as Record<string, unknown>));

    return reply.send({ success: true, data: channels });
  });

  app.post(
    '/chat/channels',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createChannelBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const body = createChannelBodySchema.parse(request.body);
      const tenantId = request.organizationId;

      const channel = await Channel.create({
        tenantId,
        name: body.name,
        type: body.type,
        brokerType: body.brokerType,
        phoneNumber: body.phoneNumber ?? null,
      });

      return reply
        .status(201)
        .send({
          success: true,
          data: mapChannel(channel.toObject() as unknown as Record<string, unknown>),
        });
    },
  );

  app.put(
    '/chat/channels/:id',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof channelIdSchema>;
        Body: z.infer<typeof updateChannelBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { id } = channelIdSchema.parse(request.params);
      const body = updateChannelBodySchema.parse(request.body);
      const tenantId = request.organizationId;

      const channel = await Channel.findOneAndUpdate(
        { _id: id, tenantId },
        { $set: body },
        { new: true },
      ).lean();

      if (!channel) {
        return reply.status(404).send(buildChannelNotFoundResponse(id));
      }

      return reply.send({
        success: true,
        data: mapChannel(channel as unknown as Record<string, unknown>),
      });
    },
  );

  app.delete(
    '/chat/channels/:id',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof channelIdSchema> }>,
      reply: FastifyReply,
    ) => {
      const { id } = channelIdSchema.parse(request.params);
      const tenantId = request.organizationId;

      const channel = await Channel.findOneAndUpdate(
        { _id: id, tenantId },
        { $set: { isActive: false } },
        { new: true },
      ).lean();

      if (!channel) {
        return reply.status(404).send(buildChannelNotFoundResponse(id));
      }

      return reply.send({
        success: true,
        data: mapChannel(channel as unknown as Record<string, unknown>),
      });
    },
  );
}
