export interface AvailableTool {
  readonly name: string
  readonly label: string
  readonly description: string
}

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
  readonly enabledTools: string[]
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
  readonly enabledTools?: string[]
}

export interface UpdateAiAgentPayload extends Partial<CreateAiAgentPayload> {}
