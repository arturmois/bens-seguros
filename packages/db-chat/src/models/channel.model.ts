import mongoose, { type InferSchemaType, Schema } from 'mongoose'

const CHANNEL_TYPES = [
  'WHATSAPP',
  'WEB_CHAT',
  'MESSENGER',
  'INSTAGRAM',
] as const
const BROKER_TYPES = [
  'BAILEYS',
  'META',
  'WEB_CHAT',
  'MESSENGER',
  'INSTAGRAM',
] as const
const CHANNEL_STATUSES = [
  'CONNECTED',
  'DISCONNECTED',
  'QR_PENDING',
  'TOKEN_EXPIRED',
  'NEEDS_REAUTH',
] as const

const CONNECTION_METHODS = [
  'oauth',
  'embedded_signup',
  'qr_code',
  'manual',
] as const

const channelSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: CHANNEL_TYPES, required: true },
    brokerType: { type: String, enum: BROKER_TYPES, default: 'BAILEYS' },
    phoneNumber: String,
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: CHANNEL_STATUSES, default: 'DISCONNECTED' },
    lastConnectedAt: Date,
    aiUserId: String,
    aiAgentId: { type: String, default: null },
    connectionMethod: {
      type: String,
      enum: CONNECTION_METHODS,
      default: 'manual',
    },
    metaUserId: String,
    tokenExpiresAt: Date,
    scopes: { type: [String], default: [] },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

channelSchema.index({ tenantId: 1, type: 1 })
channelSchema.index({ 'config.metaPageId': 1, isActive: 1 })
channelSchema.index({ 'config.metaInstagramAccountId': 1, isActive: 1 })
channelSchema.index({ connectionMethod: 1, status: 1, tokenExpiresAt: 1 })

export type ChannelDocument = InferSchemaType<typeof channelSchema> & {
  _id: string
}
export const Channel = mongoose.model('Channel', channelSchema)
