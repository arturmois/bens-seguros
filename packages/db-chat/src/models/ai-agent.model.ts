import mongoose, { Schema } from 'mongoose';

const aiAgentSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    channelId: { type: String, required: true },
    systemPrompt: {
      type: String,
      default:
        'Voce e um assistente de uma corretora de seguros. Responda de forma educada e profissional em portugues brasileiro.',
    },
    provider: { type: String, enum: ['claude', 'openai'], default: 'claude' },
    temperature: { type: Number, default: 0.7 },
    maxTokens: { type: Number, default: 500 },
    maxResponsesPerConversation: { type: Number, default: 20 },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true },
);

aiAgentSchema.index({ tenantId: 1, channelId: 1 }, { unique: true });

export const AiAgent = mongoose.model('AiAgent', aiAgentSchema);
