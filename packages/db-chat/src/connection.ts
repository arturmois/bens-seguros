import mongoose from 'mongoose';

let isConnected = false;

export async function connectMongoDB(uri: string): Promise<void> {
  if (isConnected) return;

  await mongoose.connect(uri, {
    retryWrites: true,
    w: 'majority',
  });

  isConnected = true;
}

export async function disconnectMongoDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}
