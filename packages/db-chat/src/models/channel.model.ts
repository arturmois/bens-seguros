import mongoose, { type InferSchemaType, Schema } from 'mongoose';

const CHANNEL_TYPES = ['WHATSAPP', 'WEB'] as const;
const BROKER_TYPES = ['BAILEYS', 'META'] as const;
const CHANNEL_STATUSES = ['CONNECTED', 'DISCONNECTED', 'QR_PENDING'] as const;

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
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

channelSchema.index({ tenantId: 1, type: 1 });

export type ChannelDocument = InferSchemaType<typeof channelSchema> & { _id: string };
export const Channel = mongoose.model('Channel', channelSchema);
