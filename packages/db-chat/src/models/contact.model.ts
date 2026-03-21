import mongoose, { type InferSchemaType, Schema } from 'mongoose';

const contactSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    whatsappPhone: { type: String, required: true },
    pushName: String,
    profilePicUrl: String,
    clientId: String,
  },
  { timestamps: true },
);

contactSchema.index({ tenantId: 1, whatsappPhone: 1 }, { unique: true });

export type ContactDocument = InferSchemaType<typeof contactSchema> & { _id: string };
export const Contact = mongoose.model('Contact', contactSchema);
