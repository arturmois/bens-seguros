import { CHANNEL_TYPES } from '@repo/shared'
import mongoose, { type InferSchemaType, Schema } from 'mongoose'

const contactSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    whatsappPhone: String,
    name: String,
    email: String,
    facebookId: String,
    instagramId: String,
    source: { type: String, enum: CHANNEL_TYPES, default: 'WHATSAPP' },
    pushName: String,
    profilePicUrl: String,
    clientId: String,
    pgContactId: { type: String, default: null },
  },
  { timestamps: true }
)

contactSchema.index(
  { tenantId: 1, whatsappPhone: 1 },
  {
    unique: true,
    partialFilterExpression: { whatsappPhone: { $type: 'string' } },
  }
)
contactSchema.index(
  { tenantId: 1, facebookId: 1 },
  {
    unique: true,
    partialFilterExpression: { facebookId: { $type: 'string' } },
  }
)
contactSchema.index(
  { tenantId: 1, instagramId: 1 },
  {
    unique: true,
    partialFilterExpression: { instagramId: { $type: 'string' } },
  }
)

export type ContactDocument = InferSchemaType<typeof contactSchema> & {
  _id: string
}
export const Contact = mongoose.model('Contact', contactSchema)
