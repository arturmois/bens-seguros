import type { CoreMessage, ToolSet } from 'ai'

export type AIProvider = 'claude' | 'openai'

export interface AiUsageMetadata {
  readonly organizationId: string
  readonly conversationId?: string
  readonly channelId?: string
  readonly messageId?: string
  readonly agentId?: string
}

export interface AiUsageEvent {
  readonly metadata: AiUsageMetadata
  readonly provider: string
  readonly model: string
  readonly inputTokens: number
  readonly outputTokens: number
}

export type AiUsageCallback = (event: AiUsageEvent) => Promise<void> | void

export interface AiUsageHook {
  readonly metadata: AiUsageMetadata
  readonly onFinish: AiUsageCallback
}

export interface GenerateOptions {
  readonly systemPrompt: string
  readonly userMessage: string
  readonly provider?: AIProvider
  readonly maxTokens?: number
  readonly temperature?: number
  readonly usage?: AiUsageHook
}

export interface GenerateWithToolsOptions {
  readonly systemPrompt: string
  readonly messages: CoreMessage[]
  readonly tools: ToolSet
  readonly provider?: AIProvider
  readonly maxTokens?: number
  readonly temperature?: number
  readonly maxSteps?: number
  readonly usage?: AiUsageHook
}

export interface GenerateWithToolsResult {
  readonly text: string
  readonly toolResults: ReadonlyArray<{ toolName: string; result: unknown }>
  readonly steps: number
}
