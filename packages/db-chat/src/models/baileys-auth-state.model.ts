import mongoose, { Schema } from 'mongoose'

const baileysAuthStateSchema = new Schema({
  tenantId: { type: String, required: true },
  channelId: { type: String, required: true },
  key: { type: String, required: true },
  value: Schema.Types.Mixed,
})

baileysAuthStateSchema.index(
  { tenantId: 1, channelId: 1, key: 1 },
  { unique: true }
)

export const BaileysAuthState = mongoose.model(
  'BaileysAuthState',
  baileysAuthStateSchema
)
