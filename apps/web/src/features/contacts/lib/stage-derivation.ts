import type { ContactStage } from './types'

interface StageInput {
  readonly clientId?: string | null
  readonly activePolicyCount?: number
}

export function deriveStage(contact: StageInput): ContactStage {
  if (!contact.clientId) return 'LEAD'
  if ((contact.activePolicyCount ?? 0) > 0) return 'CLIENT_ACTIVE'
  return 'CLIENT_INACTIVE'
}

export function getStageColor(stage: ContactStage): string {
  switch (stage) {
    case 'LEAD':
      return 'bg-muted text-muted-foreground'
    case 'CLIENT_ACTIVE':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
    case 'CLIENT_INACTIVE':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
  }
}
