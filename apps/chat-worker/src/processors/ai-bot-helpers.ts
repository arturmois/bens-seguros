import type { CoreMessage } from 'ai'
import type { AIProvider } from '@repo/ai'
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

export function buildSystemPrompt(
  contactName: string,
  channelName: string,
  customPrompt?: string
): string {
  const base = customPrompt ?? DEFAULT_SYSTEM_PROMPT
  return [
    base,
    '',
    'Contexto adicional:',
    `- Voce esta conversando com: ${contactName}`,
    `- Voce esta atendendo pelo canal: ${channelName}`,
    '',
    'Ferramentas disponiveis e quando usar:',
    '- escalateToHuman: transferir para atendente humano (cliente pediu, tema sensivel, voce nao consegue resolver)',
    '- listProducts: listar tipos de seguro com coberturas e dados necessarios',
    '- captureLead: registrar interesse do cliente em um seguro e criar proposta',
    '- searchClient: buscar cliente por telefone ou CPF/CNPJ (verificar se ja tem cadastro)',
    '- updateClientData: atualizar dados cadastrais (CPF, email, endereco, nascimento)',
    '- reportClaim: registrar sinistro/urgencia (cria no sistema se tiver apolice, senao salva e transfere)',
    '- registerFinancialInquiry: registrar duvida financeira e transferir para especialista',
    '- collectInsuredAssetData: salvar dados do bem segurado na proposta (veiculo, imovel, etc.)',
    '- searchProposal: consultar propostas existentes do cliente',
    '- searchPolicy: consultar apolices ativas do cliente',
    '',
    'Regras:',
    '- Responda de forma concisa e natural, como em uma conversa de WhatsApp',
    '- Use searchClient no inicio para verificar se o cliente ja e cadastrado',
    '- Colete dados um de cada vez, nao peca tudo de uma so vez',
    '- Sempre confirme os dados antes de registrar',
  ].join('\n')
}

export async function escalateToHuman(
  conversationId: string,
  tenantId: string,
  pubsubClient: PubsubClient
): Promise<void> {
  await Conversation.updateOne(
    { _id: conversationId, tenantId },
    { $set: { status: 'WAITING_HUMAN' } }
  ).exec()

  await Message.create({
    conversationId,
    tenantId,
    senderType: 'SYSTEM',
    text: 'Transferido para um atendente. Aguarde.',
    type: 'TEXT',
    status: 'DELIVERED',
  })

  await pubsubClient.publish(
    CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE,
    JSON.stringify({ tenantId, conversationId, status: 'WAITING_HUMAN' })
  )
}
