import mongoose from 'mongoose'
import { tenantScopePlugin } from './plugins/tenant-scope-plugin.js'

let isConnected = false
let pluginRegistered = false

export async function connectMongoDB(uri: string): Promise<void> {
  if (isConnected) return
  if (!pluginRegistered) {
    mongoose.plugin(tenantScopePlugin)
    pluginRegistered = true
  }
  await mongoose.connect(uri)
  isConnected = true
}

export async function disconnectMongoDB(): Promise<void> {
  if (!isConnected) return
  await mongoose.disconnect()
  isConnected = false
}
