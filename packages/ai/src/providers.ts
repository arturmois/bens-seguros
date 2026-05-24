import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { env } from '@repo/env'
import type { AIProvider } from './types.js'

const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })
const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY })

export function getModel(provider: AIProvider = 'openai') {
  switch (provider) {
    case 'claude':
      return anthropic('claude-sonnet-4-20250514')
    case 'openai':
      return openai('gpt-4o-mini')
  }
}

export function resolveProviderLabel(provider: AIProvider = 'openai'): {
  readonly provider: string
  readonly model: string
} {
  switch (provider) {
    case 'claude':
      return { provider: 'anthropic', model: 'claude-sonnet-4-20250514' }
    case 'openai':
      return { provider: 'openai', model: 'gpt-4o-mini' }
  }
}
