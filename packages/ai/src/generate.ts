import { generateText, streamText } from 'ai'
import { getModel } from './providers.js'
import type { GenerateOptions } from './types.js'

export async function generate(options: GenerateOptions): Promise<string> {
  const { text } = await generateText({
    model: getModel(options.provider),
    system: options.systemPrompt,
    prompt: options.userMessage,
    maxTokens: options.maxTokens ?? 500,
    temperature: options.temperature ?? 0.7,
  })
  return text
}

export function stream(options: GenerateOptions) {
  return streamText({
    model: getModel(options.provider),
    system: options.systemPrompt,
    prompt: options.userMessage,
    maxTokens: options.maxTokens ?? 500,
    temperature: options.temperature ?? 0.7,
  })
}
