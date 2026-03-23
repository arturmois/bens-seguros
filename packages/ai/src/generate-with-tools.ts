import { generateText } from 'ai'
import { getModel } from './providers.js'
import type {
  GenerateWithToolsOptions,
  GenerateWithToolsResult,
} from './types.js'

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

  const toolResults = result.steps
    .flatMap((step) => step.toolCalls ?? [])
    .map((call) => ({
      toolName: call.toolName,
      result: call.args,
    }))

  return {
    text: result.text,
    toolResults,
    steps: result.steps.length,
  }
}
