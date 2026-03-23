import type { CoreMessage, ToolSet } from 'ai'

export type AIProvider = 'claude' | 'openai'

export interface GenerateOptions {
  readonly systemPrompt: string
  readonly userMessage: string
  readonly provider?: AIProvider
  readonly maxTokens?: number
  readonly temperature?: number
}

export interface GenerateWithToolsOptions {
  readonly systemPrompt: string
  readonly messages: CoreMessage[]
  readonly tools: ToolSet
  readonly provider?: AIProvider
  readonly maxTokens?: number
  readonly temperature?: number
  readonly maxSteps?: number
}

export interface GenerateWithToolsResult {
  readonly text: string
  readonly toolResults: ReadonlyArray<{ toolName: string; result: unknown }>
  readonly steps: number
}
