export type AIProvider = 'claude' | 'openai'

export interface GenerateOptions {
  readonly systemPrompt: string
  readonly userMessage: string
  readonly provider?: AIProvider
  readonly maxTokens?: number
  readonly temperature?: number
}
