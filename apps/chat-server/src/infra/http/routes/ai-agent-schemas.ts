import { z } from 'zod'

import { Channel } from '@repo/db-chat'

export const CONFIGURABLE_TOOL_NAMES = [
  'listProducts',
  'captureLead',
  'searchClient',
  'collectInsuredAssetData',
] as const

export const AVAILABLE_TOOLS: ReadonlyArray<{
  name: (typeof CONFIGURABLE_TOOL_NAMES)[number]
  label: string
  description: string
}> = [
  {
    name: 'listProducts',
    label: 'Listar produtos',
    description: 'Lista os tipos de seguro disponíveis',
  },
  {
    name: 'captureLead',
    label: 'Capturar lead',
    description: 'Cria proposta e registra lead no sistema',
  },
  {
    name: 'searchClient',
    label: 'Buscar cliente',
    description: 'Encontra cliente por telefone ou CPF/CNPJ',
  },
  {
    name: 'collectInsuredAssetData',
    label: 'Coletar dados do bem',
    description: 'Salva detalhes do bem segurado para cotação',
  },
]

export const agentIdSchema = z.object({ id: z.string().min(1) })

export const createAgentBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).nullable().optional(),
  systemPrompt: z.string().max(4000).optional(),
  provider: z.enum(['claude', 'openai']).optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(100).max(2000).optional(),
  maxResponsesPerConversation: z.number().min(5).max(100).optional(),
  isActive: z.boolean().optional(),
  enabledTools: z.array(z.enum(CONFIGURABLE_TOOL_NAMES)).optional().default([]),
})

export const updateAgentBodySchema = createAgentBodySchema.partial()

export function mapAgent(doc: {
  _id: unknown
  [key: string]: unknown
}): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(doc)) {
    if (key !== '_id' && key !== '__v') {
      mapped[key] = value
    }
  }
  mapped['id'] = String(doc['_id'])
  return mapped
}

export async function getLinkedChannels(
  tenantId: string,
  agentId: string
): Promise<ReadonlyArray<{ id: string; name: string }>> {
  const channels = await Channel.find(
    { tenantId, aiAgentId: agentId },
    { name: 1 }
  )
    .lean()
    .exec()
  return channels.map((c) => ({ id: String(c._id), name: c.name }))
}
