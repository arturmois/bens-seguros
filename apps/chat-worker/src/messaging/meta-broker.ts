import pino from 'pino';

import type { Broker, BrokerEvents, MessagePayload, MessageResult } from './broker.js';

const META_API_BASE = 'https://graph.facebook.com/v21.0';

interface MetaConfig {
  readonly metaToken: string;
  readonly metaPhoneNumberId: string;
}

interface MetaSendResponse {
  messages?: ReadonlyArray<{ id: string }>;
  error?: { message: string; code: number };
}

function parseConfig(config: Record<string, unknown>): MetaConfig {
  const metaToken = config.metaToken;
  const metaPhoneNumberId = config.metaPhoneNumberId;

  if (typeof metaToken !== 'string' || metaToken.length === 0) {
    throw new Error('MetaBroker: metaToken is required in channel config');
  }

  if (typeof metaPhoneNumberId !== 'string' || metaPhoneNumberId.length === 0) {
    throw new Error('MetaBroker: metaPhoneNumberId is required in channel config');
  }

  return { metaToken, metaPhoneNumberId };
}

function formatPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export class MetaBroker implements Broker {
  private readonly config: MetaConfig;
  private readonly logger = pino({ level: 'info' }).child({ broker: 'meta' });

  constructor(rawConfig: Record<string, unknown>) {
    this.config = parseConfig(rawConfig);
  }

  async connect(_events: BrokerEvents): Promise<void> {
    this.logger.info('MetaBroker connected (no-op, always online)');
  }

  async disconnect(): Promise<void> {
    this.logger.info('MetaBroker disconnected (no-op)');
  }

  isConnected(): boolean {
    return true;
  }

  async sendMessage(payload: MessagePayload): Promise<MessageResult> {
    const url = `${META_API_BASE}/${this.config.metaPhoneNumberId}/messages`;
    const body = this.buildRequestBody(payload);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.metaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as MetaSendResponse;

      if (!response.ok || data.error) {
        const errorCode = data.error?.message ?? `HTTP_${String(response.status)}`;
        this.logger.warn({ errorCode, phone: payload.to }, 'Meta send failed');
        return { externalId: '', status: 'FAILED', errorCode };
      }

      const externalId = data.messages?.[0]?.id ?? '';
      return { externalId, status: 'SENT' };
    } catch (err: unknown) {
      const errorCode = err instanceof Error ? err.message : 'UNKNOWN_META_ERROR';
      this.logger.error({ err, phone: payload.to }, 'Meta send exception');
      return { externalId: '', status: 'FAILED', errorCode };
    }
  }

  private buildRequestBody(payload: MessagePayload): Record<string, unknown> {
    const phone = formatPhone(payload.to);

    const base = {
      messaging_product: 'whatsapp',
      to: phone,
    };

    switch (payload.type) {
      case 'TEXT':
        return { ...base, type: 'text', text: { body: payload.text ?? '' } };
      case 'IMAGE':
        return {
          ...base,
          type: 'image',
          image: { link: payload.mediaUrl ?? '' },
        };
      case 'AUDIO':
        return {
          ...base,
          type: 'audio',
          audio: { link: payload.mediaUrl ?? '' },
        };
      case 'VIDEO':
        return {
          ...base,
          type: 'video',
          video: { link: payload.mediaUrl ?? '' },
        };
      case 'DOCUMENT':
        return {
          ...base,
          type: 'document',
          document: { link: payload.mediaUrl ?? '' },
        };
    }
  }
}
