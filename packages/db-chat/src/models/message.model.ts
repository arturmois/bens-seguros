import mongoose, { type InferSchemaType, Schema } from 'mongoose'

const SENDER_TYPES = ['CLIENT', 'AGENT', 'BOT', 'SYSTEM'] as const
const MESSAGE_TYPES = [
  'TEXT',
  'IMAGE',
  'AUDIO',
  'VIDEO',
  'DOCUMENT',
  'OTHER',
] as const
const MESSAGE_STATUSES = [
  'PENDING',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
] as const

const messageSchema = new Schema(
  {
    conversationId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true },
    senderType: { type: String, enum: SENDER_TYPES, required: true },
    senderName: String,
    senderId: String,
    text: String,
    type: { type: String, enum: MESSAGE_TYPES, default: 'TEXT' },
    mediaUrl: String,
    mediaKey: String,
    status: { type: String, enum: MESSAGE_STATUSES, default: 'PENDING' },
    metadata: Schema.Types.Mixed,
    externalId: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

messageSchema.index(
  { tenantId: 1, createdAt: 1 },
  { expireAfterSeconds: 730 * 24 * 60 * 60 }
)
messageSchema.index({ conversationId: 1, createdAt: -1 })
messageSchema.index({ externalId: 1 }, { sparse: true })

export type MessageDocument = InferSchemaType<typeof messageSchema> & {
  _id: string
}
export const Message = mongoose.model('Message', messageSchema)
