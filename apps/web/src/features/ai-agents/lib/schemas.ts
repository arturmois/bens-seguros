import { z } from 'zod'

export const aiAgentFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome e obrigatorio')
    .max(100, 'Nome deve ter no maximo 100 caracteres'),
  description: z.string().max(300, 'Descricao muito longa').optional(),
  systemPrompt: z
    .string()
    .max(2000, 'Prompt deve ter no maximo 2000 caracteres')
    .optional(),
  provider: z.enum(['claude', 'openai']),
  temperature: z.coerce.number().min(0).max(1),
  maxTokens: z.coerce.number().min(100).max(2000),
  maxResponsesPerConversation: z.coerce.number().min(5).max(100),
  isActive: z.boolean(),
})

export type AiAgentFormValues = z.infer<typeof aiAgentFormSchema>

export const DEFAULT_AGENT_FORM: AiAgentFormValues = {
  name: '',
  description: '',
  systemPrompt: '',
  provider: 'claude',
  temperature: 0.7,
  maxTokens: 500,
  maxResponsesPerConversation: 20,
  isActive: false,
}
