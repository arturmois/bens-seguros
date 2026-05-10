import { generateText } from 'ai'
import { getModel } from './providers.js'
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
  return {
    text: result.text,
    toolResults,
    steps: result.steps.length,
  }
}
