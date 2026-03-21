import type IORedis from 'ioredis';
import type { AppLogger } from '../logger.js';

export class RedisPublisher {
  constructor(
    private readonly redis: IORedis,
    private readonly logger: AppLogger,
  ) {}

  async publish(channel: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await this.redis.publish(channel, JSON.stringify(payload));
    } catch (err: unknown) {
      this.logger.error({ err, channel }, 'Failed to publish message to Redis');
    }
  }
}
