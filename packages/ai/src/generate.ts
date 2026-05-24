import { generateText, streamText } from 'ai'
import { getModel, resolveProviderLabel } from './providers.js'
import type { AiUsageHook, GenerateOptions } from './types.js'

async function dispatchUsage(
  hook: AiUsageHook,
  provider: GenerateOptions['provider'],
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const label = resolveProviderLabel(provider)
  await hook.onFinish({
    metadata: hook.metadata,
    provider: label.provider,
    model: label.model,
    inputTokens,
    outputTokens,
  })
}

export async function generate(options: GenerateOptions): Promise<string> {
  const result = await generateText({
    model: getModel(options.provider),
    system: options.systemPrompt,
    prompt: options.userMessage,
    maxTokens: options.maxTokens ?? 500,
    temperature: options.temperature ?? 0.7,
  })

  if (options.usage) {
    await dispatchUsage(
      options.usage,
      options.provider,
      result.usage.promptTokens,
      result.usage.completionTokens
    )
  }

  return result.text
}

export function stream(options: GenerateOptions) {
  const usageHook = options.usage
  return streamText({
    model: getModel(options.provider),
    system: options.systemPrompt,
    prompt: options.userMessage,
    maxTokens: options.maxTokens ?? 500,
    temperature: options.temperature ?? 0.7,
    ...(usageHook && {
      onFinish: async ({ usage }) => {
        await dispatchUsage(
          usageHook,
          options.provider,
          usage.promptTokens,
          usage.completionTokens
        )
      },
    }),
  })
}
