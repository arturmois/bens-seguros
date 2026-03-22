import mongoose from 'mongoose'

let isConnected = false

export async function connectMongoDB(uri: string): Promise<void> {
  if (isConnected) return

  await mongoose.connect(uri)

  isConnected = true
}

export async function disconnectMongoDB(): Promise<void> {
  if (!isConnected) return
  await mongoose.disconnect()
  isConnected = false
}
