import mongoose, { type InferSchemaType, Schema } from 'mongoose'

export const CONVERSATION_STATUSES = [
  'BOT_ACTIVE',
  'WAITING_HUMAN',
  'HUMAN_ACTIVE',
  'CLOSED',
] as const

const conversationSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    channelId: { type: String, required: true },
    contactId: { type: String, required: true },
    status: {
      type: String,
      enum: CONVERSATION_STATUSES,
      default: 'BOT_ACTIVE',
    },
    assignedTo: String,
    assignedToName: String,
    subject: String,
    lastMessageText: String,
    lastMessageAt: Date,
    whatsappPhone: String,
    closedAt: Date,
    closedBy: String,
  },
  { timestamps: true }
)

conversationSchema.index({ tenantId: 1, status: 1, updatedAt: -1 })
conversationSchema.index({ tenantId: 1, contactId: 1, channelId: 1, status: 1 })
conversationSchema.index({ tenantId: 1, updatedAt: -1 })
conversationSchema.index({ status: 1, updatedAt: 1 })

export type ConversationDocument = InferSchemaType<
  typeof conversationSchema
> & { _id: string }
export const Conversation = mongoose.model('Conversation', conversationSchema)
