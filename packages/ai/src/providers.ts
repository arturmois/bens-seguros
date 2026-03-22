import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import type { AIProvider } from './types.js'

export function getModel(provider: AIProvider = 'claude') {
  switch (provider) {
    case 'claude':
      return anthropic('claude-sonnet-4-20250514')
    case 'openai':
      return openai('gpt-4o-mini')
  }
}
