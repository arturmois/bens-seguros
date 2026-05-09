import type { CoreMessage } from 'ai'
import type { AIProvider } from '@repo/ai'
import { env } from '@repo/env'
import { Conversation, Message } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS, CHAT_LIMITS } from '@repo/shared'
import type { PubsubClient } from '../types/pubsub-client.js'

export const DEFAULT_SYSTEM_PROMPT =
  'Voce e um assistente de uma corretora de seguros. Responda de forma educada e profissional em portugues brasileiro. Se o cliente quiser falar com um atendente humano, diga que vai transferi-lo.'

export const ESCALATION_TOOL_NAME = 'escalateToHuman'

export interface AiBotJobData {
  readonly conversationId: string
  readonly tenantId: string
  readonly messageId: string
}

export interface AiAgentConfig {
  systemPrompt: string
  provider: AIProvider
  temperature: number
  maxTokens: number
  maxResponsesPerConversation: number
  enabledTools: string[]
}

export interface LeanMessage {
  readonly senderType?: string
  readonly text?: string | null
  readonly senderName?: string | null
}

export function getAiAgentConfig(doc: Record<string, unknown>): AiAgentConfig {
  return {
    systemPrompt:
      typeof doc['systemPrompt'] === 'string'
        ? doc['systemPrompt']
        : DEFAULT_SYSTEM_PROMPT,
    provider: doc['provider'] === 'openai' ? 'openai' : 'claude',
    temperature:
      typeof doc['temperature'] === 'number' ? doc['temperature'] : 0.7,
    maxTokens: typeof doc['maxTokens'] === 'number' ? doc['maxTokens'] : 300,
    maxResponsesPerConversation:
      typeof doc['maxResponsesPerConversation'] === 'number'
        ? doc['maxResponsesPerConversation']
        : CHAT_LIMITS.MAX_AI_RESPONSES_PER_CONVERSATION,
    enabledTools: Array.isArray(doc['enabledTools'])
      ? doc['enabledTools'].filter((t): t is string => typeof t === 'string')
      : [],
  }
}

export function isProviderConfigured(provider: AIProvider): boolean {
  switch (provider) {
    case 'claude':
      return Boolean(env.ANTHROPIC_API_KEY)
    case 'openai':
      return Boolean(env.OPENAI_API_KEY)
    default: {
      const _exhaustive: never = provider
      return _exhaustive
    }
  }
}

export function buildConversationMessages(
  recentMessages: ReadonlyArray<LeanMessage>
): CoreMessage[] {
  return recentMessages
    .filter((m) => m.senderType === 'CLIENT' || m.senderType === 'BOT')
    .map((m): CoreMessage => {
      if (m.senderType === 'BOT') {
        return { role: 'assistant', content: m.text ?? '' }
      }
      return { role: 'user', content: m.text ?? '' }
    })
}

const TOOL_PROMPT_DESCRIPTIONS: Record<string, string> = {
  escalateToHuman:
    'transferir para atendente humano (cliente pediu, tema sensivel, voce nao consegue resolver)',
  listProducts: 'listar tipos de seguro com coberturas e dados necessarios',
  captureLead: 'registrar interesse do cliente em um seguro e criar proposta',
  searchClient:
    'buscar cliente por telefone ou CPF/CNPJ (verificar se ja tem cadastro)',
  updateClientData:
    'atualizar dados cadastrais (CPF, email, endereco, nascimento)',
  reportClaim:
    'registrar sinistro/urgencia (cria no sistema se tiver apolice, senao salva e transfere)',
  registerFinancialInquiry:
    'registrar duvida financeira e transferir para especialista',
  collectInsuredAssetData:
    'salvar dados do bem segurado na proposta (veiculo, imovel, etc.)',
  searchProposal: 'consultar propostas existentes do cliente',
  searchPolicy: 'consultar apolices ativas do cliente',
}

const TOOL_CALL_PATTERN = /`([a-z][a-zA-Z0-9_]*)\s*\(/g

export function findUnknownToolReferences(
  prompt: string,
  knownToolNames: readonly string[]
): string[] {
  const known = new Set(knownToolNames)
  const matches = prompt.matchAll(TOOL_CALL_PATTERN)
  const unknown = new Set<string>()
  for (const match of matches) {
    const name = match[1]
    if (name && !known.has(name)) {
      unknown.add(name)
    }
  }
  return [...unknown].sort()
}

export function buildSystemPrompt(
  contactName: string,
  channelName: string,
  customPrompt?: string,
  enabledTools: string[] = []
): string {
  const base = customPrompt ?? DEFAULT_SYSTEM_PROMPT

  const activeToolNames = ['escalateToHuman', ...enabledTools]
  const toolLines = activeToolNames
    .filter((name) => TOOL_PROMPT_DESCRIPTIONS[name])
    .map((name) => `- ${name}: ${TOOL_PROMPT_DESCRIPTIONS[name]}`)

  return [
    base,
    '',
    'Contexto adicional:',
    `- Voce esta conversando com: ${contactName}`,
    `- Voce esta atendendo pelo canal: ${channelName}`,
    '',
    'Ferramentas disponiveis e quando usar:',
    ...toolLines,
    '',
    'Regras:',
    '- Responda de forma concisa e natural, como em uma conversa de WhatsApp',
    ...(enabledTools.includes('searchClient')
      ? [
          '- Use searchClient no inicio para verificar se o cliente ja e cadastrado',
        ]
      : []),
    '- Colete dados um de cada vez, nao peca tudo de uma so vez',
    '- Sempre confirme os dados antes de registrar',
  ].join('\n')
}

export async function escalateToHuman(
  conversationId: string,
  tenantId: string,
  pubsubClient: PubsubClient
): Promise<void> {
  const result = await Conversation.updateOne(
    { _id: conversationId, tenantId, status: 'BOT_ACTIVE' },
    { $set: { status: 'WAITING_HUMAN' } }
  ).exec()

  if (result.matchedCount === 0) return

  const escalationText = 'Transferido para um atendente. Aguarde.'
  const systemMessage = await Message.create({
    conversationId,
    tenantId,
    senderType: 'SYSTEM',
    text: escalationText,
    type: 'TEXT',
    status: 'DELIVERED',
  })

  await pubsubClient.publish(
    CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE,
    JSON.stringify({
      id: String(systemMessage._id),
      conversationId,
      tenantId,
      senderType: 'SYSTEM',
      senderName: null,
      senderId: null,
      text: escalationText,
      type: 'TEXT',
      status: 'DELIVERED',
      externalId: null,
      createdAt:
        systemMessage.createdAt?.toISOString() ?? new Date().toISOString(),
    })
  )

  await pubsubClient.publish(
    CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE,
    JSON.stringify({ tenantId, conversationId, status: 'WAITING_HUMAN' })
  )
}
