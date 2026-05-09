import type { SortingState, VisibilityState } from '@tanstack/react-table'

import type { AiAgentProvider } from './types'

export const PROVIDER_LABELS: Record<AiAgentProvider, string> = {
  claude: 'Claude',
  openai: 'OpenAI',
}

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  provider: true,
  linkedChannelCount: true,
}

export const HIDEABLE_COLUMNS = [
  { id: 'provider', label: 'Provider' },
  { id: 'linkedChannelCount', label: 'Canais' },
] as const

export const DEFAULT_SORTING: SortingState = [{ id: 'name', desc: false }]

export const MAX_AGENT_NAME_LENGTH = 100
export const DUPLICATE_PREFIX = 'Cópia de '
