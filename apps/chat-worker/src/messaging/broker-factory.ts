import type { Broker } from './broker.js';
import { BaileysBroker } from './baileys-broker.js';
import { MetaBroker } from './meta-broker.js';

export function createBroker(type: 'BAILEYS' | 'META', config: Record<string, unknown>): Broker {
  switch (type) {
    case 'BAILEYS': {
      const tenantId = config.tenantId;
      const channelId = config.channelId;
      if (typeof tenantId !== 'string' || typeof channelId !== 'string') {
        throw new Error('createBroker(BAILEYS): tenantId and channelId are required');
      }

      return new BaileysBroker(tenantId, channelId);
    }
    case 'META':
      return new MetaBroker(config);
  }
}
