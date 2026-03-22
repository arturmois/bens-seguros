import { UnrecoverableError, type Job } from 'bullmq';
import pino from 'pino';
import QRCode from 'qrcode';
import { Channel } from '@repo/db-chat';
import { CHAT_PUBSUB_CHANNELS } from '@repo/shared';
import type * as BaileysManager from '../messaging/baileys-manager.js';
import type { BrokerEvents } from '../messaging/broker.js';
import type { PubsubClient } from '../types/pubsub-client.js';

const logger = pino({ name: 'connect-channel-processor' });

export interface ConnectChannelJobData {
  readonly channelId: string;
  readonly tenantId: string;
}

function publishChannelStatus(
  pubsubClient: PubsubClient,
  channelId: string,
  tenantId: string,
  status: string,
  qr?: string,
): void {
  pubsubClient
    .publish(
      CHAT_PUBSUB_CHANNELS.CHANNEL_STATUS,
      JSON.stringify({ channelId, tenantId, status, qr }),
    )
    .catch((err: unknown) => {
      logger.error({ err, channelId }, 'Failed to publish channel status');
    });
}

function buildConnectionEvents(
  pubsubClient: PubsubClient,
  channelId: string,
  tenantId: string,
  baseEventsFactory: () => BrokerEvents,
): BrokerEvents {
  const baseEvents = baseEventsFactory();

  return {
    onMessage: baseEvents.onMessage,
    onStatusUpdate: baseEvents.onStatusUpdate,
    onConnectionUpdate: async (status: string, qr?: string) => {
      let qrDataUrl: string | undefined;

      if (status === 'QR_PENDING' && qr) {
        try {
          qrDataUrl = await QRCode.toDataURL(qr, { width: 256, margin: 2 });
        } catch (err: unknown) {
          logger.error({ err, channelId }, 'Failed to convert QR to data URL');
          qrDataUrl = undefined;
        }
      }

      publishChannelStatus(pubsubClient, channelId, tenantId, status, qrDataUrl);
    },
  };
}

export function createConnectChannelProcessor(
  manager: typeof BaileysManager,
  pubsubClient: PubsubClient,
  buildEvents: (channelId: string, tenantId: string) => BrokerEvents,
) {
  return async function processConnectChannel(job: Job<ConnectChannelJobData>): Promise<void> {
    const { channelId, tenantId } = job.data;

    logger.info({ channelId, tenantId }, 'Processing connect-channel job');

    const channel = await Channel.findOne({ _id: channelId, tenantId }).lean().exec();

    if (!channel) {
      throw new UnrecoverableError(
        `Channel not found: channelId=${channelId} tenantId=${tenantId}`,
      );
    }

    if (channel.brokerType !== 'BAILEYS') {
      throw new UnrecoverableError(
        `Channel ${channelId} is not a Baileys channel (type=${String(channel.brokerType)})`,
      );
    }

    const events = buildConnectionEvents(pubsubClient, channelId, tenantId, () =>
      buildEvents(channelId, tenantId),
    );

    await manager.connectChannel(channelId, tenantId, events);

    logger.info({ channelId, tenantId }, 'Channel connection initiated');
  };
}
