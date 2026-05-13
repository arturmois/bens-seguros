import type { ContactStage } from './types'

interface StageInput {
  readonly clientId?: string | null
  readonly activePolicyCount?: number
  readonly totalPolicyCount?: number
}

export function deriveStage(contact: StageInput): ContactStage {
  if (!contact.clientId) return 'LEAD'
  if ((contact.activePolicyCount ?? 0) > 0) return 'CLIENT_ACTIVE'
  if ((contact.totalPolicyCount ?? 0) > 0) return 'CLIENT_INACTIVE'
  return 'CLIENT_NEW'
}

export function getStageColor(stage: ContactStage): string {
  switch (stage) {
    case 'LEAD':
      return 'bg-muted text-muted-foreground'
    case 'CLIENT_NEW':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-400'
    case 'CLIENT_ACTIVE':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
    case 'CLIENT_INACTIVE':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
  }
}
