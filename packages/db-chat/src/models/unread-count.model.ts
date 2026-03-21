import mongoose, { Schema } from 'mongoose';

const unreadCountSchema = new Schema({
  tenantId: { type: String, required: true },
  conversationId: { type: String, required: true },
  userId: { type: String, required: true },
  count: { type: Number, default: 0 },
  lastReadAt: Date,
});

unreadCountSchema.index({ tenantId: 1, conversationId: 1, userId: 1 }, { unique: true });

export const UnreadCount = mongoose.model('UnreadCount', unreadCountSchema);
