import { generateText } from 'ai'
import { getModel, resolveProviderLabel } from './providers.js'
import type {
  GenerateWithToolsOptions,
  GenerateWithToolsResult,
} from './types.js'

interface ToolResultEntry {
  readonly toolName: string
  readonly result: unknown
}

function isToolResultEntry(value: unknown): value is ToolResultEntry {
  if (typeof value !== 'object' || value === null) return false
  if (!('toolName' in value) || !('result' in value)) return false
  return typeof value.toolName === 'string'
}

export async function generateWithTools(
  options: GenerateWithToolsOptions
): Promise<GenerateWithToolsResult> {
  const result = await generateText({
    model: getModel(options.provider),
    system: options.systemPrompt,
    messages: options.messages,
    tools: options.tools,
    maxSteps: options.maxSteps ?? 5,
    maxTokens: options.maxTokens ?? 500,
    temperature: options.temperature ?? 0.7,
  })
  const toolResults: ReadonlyArray<{ toolName: string; result: unknown }> =
    result.steps
      .flatMap((step) => {
        const results: unknown[] = Array.from(step.toolResults ?? [])
        return results.filter(isToolResultEntry)
      })
      .map((entry) => ({
        toolName: entry.toolName,
        result: entry.result,
      }))

  if (options.usage) {
    const label = resolveProviderLabel(options.provider)
    const inputTokens = result.steps.reduce(
      (sum, step) => sum + (step.usage?.promptTokens ?? 0),
      0
    )
    const outputTokens = result.steps.reduce(
      (sum, step) => sum + (step.usage?.completionTokens ?? 0),
      0
    )
    await options.usage.onFinish({
      metadata: options.usage.metadata,
      provider: label.provider,
      model: label.model,
      inputTokens,
      outputTokens,
    })
  }

  return {
    text: result.text,
    toolResults,
    steps: result.steps.length,
  }
}
