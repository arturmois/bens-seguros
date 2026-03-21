import {
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
  type SignalDataSet,
  BufferJSON,
  initAuthCreds,
  proto,
} from 'baileys';
import { BaileysAuthState } from '@repo/db-chat';

interface MongoDBAuthResult {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}

async function readData(tenantId: string, channelId: string, key: string): Promise<unknown> {
  const doc = await BaileysAuthState.findOne({ tenantId, channelId, key }).lean().exec();
  if (!doc) {
    return null;
  }

  const raw = JSON.stringify(doc.value);
  return JSON.parse(raw, BufferJSON.reviver) as unknown;
}

async function writeData(
  tenantId: string,
  channelId: string,
  key: string,
  value: unknown,
): Promise<void> {
  const serialized = JSON.parse(JSON.stringify(value, BufferJSON.replacer)) as unknown;

  await BaileysAuthState.updateOne(
    { tenantId, channelId, key },
    { $set: { value: serialized } },
    { upsert: true },
  ).exec();
}

async function removeData(tenantId: string, channelId: string, key: string): Promise<void> {
  await BaileysAuthState.deleteOne({ tenantId, channelId, key }).exec();
}

export async function useMongoDBAuthState(
  tenantId: string,
  channelId: string,
): Promise<MongoDBAuthResult> {
  const existingCreds = await readData(tenantId, channelId, 'creds');
  const creds = (existingCreds ?? initAuthCreds()) as AuthenticationCreds;

  const keys = {
    get: async <TKey extends keyof SignalDataTypeMap>(
      type: TKey,
      ids: string[],
    ): Promise<Record<string, SignalDataTypeMap[TKey]>> => {
      const result: Record<string, SignalDataTypeMap[TKey]> = {};

      await Promise.all(
        ids.map(async (id) => {
          const storeKey = `${type}-${id}`;
          let value = await readData(tenantId, channelId, storeKey);
          if (type === 'app-state-sync-key' && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(value as Record<string, unknown>);
          }

          if (value) {
            result[id] = value as SignalDataTypeMap[TKey];
          }
        }),
      );

      return result;
    },
    set: async (data: SignalDataSet): Promise<void> => {
      const tasks: Array<Promise<void>> = [];

      for (const category in data) {
        const entries = data[category as keyof SignalDataSet];
        if (!entries) {
          continue;
        }

        for (const id in entries) {
          const value = entries[id];
          const storeKey = `${category}-${id}`;
          const task = value
            ? writeData(tenantId, channelId, storeKey, value)
            : removeData(tenantId, channelId, storeKey);
          tasks.push(task);
        }
      }

      await Promise.all(tasks);
    },
  };

  return {
    state: { creds, keys },
    saveCreds: async () => {
      await writeData(tenantId, channelId, 'creds', creds);
    },
  };
}
