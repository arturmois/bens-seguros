export interface AiAgentData {
  readonly id: string
  readonly tenantId: string
  readonly name: string
  readonly description: string | null
  readonly systemPrompt: string
  readonly provider: 'claude' | 'openai'
  readonly temperature: number
  readonly maxTokens: number
  readonly maxResponsesPerConversation: number
  readonly isActive: boolean
  readonly linkedChannelCount: number
  readonly createdAt: string
  readonly updatedAt: string
}

export interface AiAgentDetail extends AiAgentData {
  readonly linkedChannels: ReadonlyArray<{
    readonly id: string
    readonly name: string
  }>
}

export interface CreateAiAgentPayload {
  readonly name: string
  readonly description?: string | null
  readonly systemPrompt?: string
  readonly provider?: 'claude' | 'openai'
  readonly temperature?: number
  readonly maxTokens?: number
  readonly maxResponsesPerConversation?: number
  readonly isActive?: boolean
}

export interface UpdateAiAgentPayload extends Partial<CreateAiAgentPayload> {}
